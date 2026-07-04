import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";

import { MODEL_FOR_TOOL, PRICE_PER_MTOK } from "@/lib/ai/models";
import { buildPrompt } from "@/lib/ai/prompts";
import { TOOLS, type ToolKind } from "@/lib/ai/schemas";

let _client: OpenAI | null = null;
function client(): OpenAI {
  _client ??= new OpenAI();
  return _client;
}

export type RunResult = {
  result: unknown;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
};

export function computeCostCents(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const price = PRICE_PER_MTOK[model];
  if (!price) return 0;
  const usd =
    (tokensIn / 1_000_000) * price.in + (tokensOut / 1_000_000) * price.out;
  return Math.ceil(usd * 100);
}

/**
 * Runs one AI tool with OpenAI structured outputs: the JSON schema is derived
 * from the same Zod schema the response is re-validated against before it is
 * persisted (System Design §6). Guaranteed-parseable or it throws.
 */
export async function runStructured(
  kind: ToolKind,
  input: Record<string, unknown>,
): Promise<RunResult> {
  const tool = TOOLS[kind];
  const model = MODEL_FOR_TOOL[kind];
  const { system, user } = buildPrompt(kind, input);

  const completion = await client().chat.completions.parse({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: zodResponseFormat(tool.output as z.ZodType, "tool_result"),
  });

  const message = completion.choices[0]?.message;
  if (!message?.parsed) {
    throw new Error(message?.refusal ?? "Model returned no structured result");
  }
  // Belt and braces: re-validate what the SDK parsed.
  const result = (tool.output as z.ZodType).parse(message.parsed);

  const tokensIn = completion.usage?.prompt_tokens ?? 0;
  const tokensOut = completion.usage?.completion_tokens ?? 0;

  return {
    result,
    model: completion.model,
    tokensIn,
    tokensOut,
    costCents: computeCostCents(model, tokensIn, tokensOut),
  };
}
