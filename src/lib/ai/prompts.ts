import type { ToolKind } from "@/lib/ai/schemas";

type Messages = { system: string; user: string };

const BASE =
  "You are a precise career assistant inside a job-application tracker. " +
  "Answer strictly in the requested structure. Base every claim on the provided " +
  "text only — never invent skills, employers, or requirements that are not there.";

type AnyInput = Record<string, unknown>;

const s = (v: unknown) => (typeof v === "string" ? v : "");

export function buildPrompt(kind: ToolKind, input: AnyInput): Messages {
  switch (kind) {
    case "JD_ANALYSIS":
      return {
        system: `${BASE} Extract structured facts from a job description.`,
        user: `Analyze this job description:\n\n${s(input.jobDescription)}`,
      };
    case "RESUME_GAP":
      return {
        system: `${BASE} Compare a resume against a job description. matchScore: 0-100, where 100 = perfect fit. Suggestions must be specific and actionable.`,
        user: `RESUME:\n${s(input.resumeText)}\n\nJOB DESCRIPTION:\n${s(input.jobDescription)}`,
      };
    case "MATCH_SCORE":
      return {
        system: `${BASE} Score how well the candidate fits the role (0-100). Be honest — most resumes score 40-85. List concrete strengths and gaps.`,
        user: `RESUME:\n${s(input.resumeText)}\n\nJOB DESCRIPTION:\n${s(input.jobDescription)}`,
      };
    case "COVER_LETTER":
      return {
        system:
          `${BASE} Write a cover letter grounded ONLY in the resume's real experience. ` +
          `Tone: ${s(input.tone) || "PROFESSIONAL"}. 250-350 words, no placeholders like [Company] — ` +
          `derive the company/role from the job description. It is a draft the user will edit.`,
        user: `RESUME:\n${s(input.resumeText)}\n\nJOB DESCRIPTION:\n${s(input.jobDescription)}`,
      };
    case "INTERVIEW_PREP":
      return {
        system: `${BASE} Generate likely interview questions for this exact role: 5 technical, 4 behavioral, 3 role-specific. Hints describe what a strong answer covers.`,
        user: `JOB DESCRIPTION:\n${s(input.jobDescription)}`,
      };
    case "RESUME_OPTIMIZE":
      return {
        system: `${BASE} Review the resume like an ATS + senior recruiter: weak areas, missing keywords${s(input.jobDescription) ? " (relative to the target job description)" : ""}, and concrete ATS formatting improvements.`,
        user: `RESUME:\n${s(input.resumeText)}${s(input.jobDescription) ? `\n\nTARGET JOB DESCRIPTION:\n${s(input.jobDescription)}` : ""}`,
      };
  }
}
