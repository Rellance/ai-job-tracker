import { z } from "zod";

/**
 * One Zod schema per AI tool. Each is both the OpenAI structured-output
 * contract and the validation applied to the model response before it is
 * persisted to AiArtifact.result (System Design §6).
 */

export const jdAnalysisSchema = z.object({
  skills: z
    .array(z.string())
    .describe("Soft + hard skills explicitly required"),
  technologies: z
    .array(z.string())
    .describe("Concrete tools, languages, frameworks"),
  requirements: z
    .array(z.string())
    .describe("Hard requirements (experience, education)"),
  responsibilities: z
    .array(z.string())
    .describe("What the role actually does day to day"),
  seniority: z.enum([
    "INTERN",
    "JUNIOR",
    "MID",
    "SENIOR",
    "STAFF",
    "LEAD",
    "UNKNOWN",
  ]),
  summary: z
    .string()
    .describe("2-3 sentence plain-language summary of the role"),
});

export const resumeGapSchema = z.object({
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  suggestions: z
    .array(z.string())
    .describe("Concrete resume improvements for this JD"),
  matchScore: z.number().min(0).max(100),
});

export const matchScoreSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  rationale: z.string().describe("Short explanation of the score"),
});

export const coverLetterSchema = z.object({
  content: z.string().describe("The full cover letter, ready to edit"),
  wordCount: z.number().int(),
});

const questionSchema = z.object({
  question: z.string(),
  hint: z.string().describe("What a strong answer covers"),
});

export const interviewPrepSchema = z.object({
  technical: z.array(questionSchema),
  behavioral: z.array(questionSchema),
  roleSpecific: z.array(questionSchema),
});

export const resumeOptimizeSchema = z.object({
  weakAreas: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  atsImprovements: z.array(z.string()),
});

// ── Tool registry ────────────────────────────────────────────

export const TOOLS = {
  JD_ANALYSIS: {
    slug: "analyze-jd",
    label: "JD Analyzer",
    output: jdAnalysisSchema,
    input: z.object({
      jobDescription: z.string().min(80, "Paste the full job description"),
      applicationId: z.string().optional(),
    }),
  },
  RESUME_GAP: {
    slug: "resume-gap",
    label: "Resume Gap Analysis",
    output: resumeGapSchema,
    input: z.object({
      resumeText: z.string().min(80, "Paste your resume text"),
      jobDescription: z.string().min(80, "Paste the full job description"),
      applicationId: z.string().optional(),
    }),
  },
  MATCH_SCORE: {
    slug: "match-score",
    label: "Match Score",
    output: matchScoreSchema,
    input: z.object({
      resumeText: z.string().min(80, "Paste your resume text"),
      jobDescription: z.string().min(80, "Paste the full job description"),
      applicationId: z.string().optional(),
    }),
  },
  COVER_LETTER: {
    slug: "cover-letter",
    label: "Cover Letter",
    output: coverLetterSchema,
    input: z.object({
      resumeText: z.string().min(80, "Paste your resume text"),
      jobDescription: z.string().min(80, "Paste the full job description"),
      tone: z
        .enum(["PROFESSIONAL", "ENTHUSIASTIC", "CONCISE", "FORMAL"])
        .default("PROFESSIONAL"),
      applicationId: z.string().optional(),
    }),
  },
  INTERVIEW_PREP: {
    slug: "interview-prep",
    label: "Interview Prep",
    output: interviewPrepSchema,
    input: z.object({
      jobDescription: z.string().min(80, "Paste the full job description"),
      applicationId: z.string().optional(),
    }),
  },
  RESUME_OPTIMIZE: {
    slug: "optimize-resume",
    label: "Resume Optimization",
    output: resumeOptimizeSchema,
    input: z.object({
      resumeText: z.string().min(80, "Paste your resume text"),
      jobDescription: z.string().optional(),
      applicationId: z.string().optional(),
    }),
  },
} as const;

export type ToolKind = keyof typeof TOOLS;

export const TOOL_KINDS = Object.keys(TOOLS) as ToolKind[];

export function toolBySlug(slug: string) {
  const entry = TOOL_KINDS.map((kind) => ({ kind, ...TOOLS[kind] })).find(
    (t) => t.slug === slug,
  );
  return entry ?? null;
}
