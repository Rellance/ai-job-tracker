import type { ToolKind } from "@/lib/ai/schemas";

/**
 * Model tiering (System Design §6): cheap model for extraction,
 * higher-quality model for generation.
 */
const EXTRACTION_MODEL = "gpt-4o-mini";
const GENERATION_MODEL = "gpt-4o";

export const MODEL_FOR_TOOL: Record<ToolKind, string> = {
  JD_ANALYSIS: EXTRACTION_MODEL,
  RESUME_GAP: EXTRACTION_MODEL,
  MATCH_SCORE: EXTRACTION_MODEL,
  INTERVIEW_PREP: EXTRACTION_MODEL,
  COVER_LETTER: GENERATION_MODEL,
  RESUME_OPTIMIZE: GENERATION_MODEL,
};

/** USD per 1M tokens (input, output) — for costCents bookkeeping. */
export const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
};
