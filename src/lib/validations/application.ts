import { ApplicationPriority, ApplicationStatus } from "@prisma/client";
import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

const optionalText = (max: number) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max).optional());

const optionalInt = z.preprocess(
  emptyToUndef,
  z.coerce.number().int().min(0).max(100_000_000).optional(),
);

export const applicationCreateSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(120),
  title: z.string().trim().min(1, "Job title is required").max(160),
  location: optionalText(160),
  salaryMin: optionalInt,
  salaryMax: optionalInt,
  currency: z.string().trim().length(3).default("USD"),
  jobUrl: z.preprocess(
    emptyToUndef,
    z.string().url("Enter a valid URL").max(500).optional(),
  ),
  jobDescription: optionalText(20_000),
  status: z.nativeEnum(ApplicationStatus).default(ApplicationStatus.WISHLIST),
  priority: z
    .nativeEnum(ApplicationPriority)
    .default(ApplicationPriority.MEDIUM),
  source: optionalText(80),
  appliedAt: z.preprocess(emptyToUndef, z.coerce.date().optional()),
});

export const applicationUpdateSchema = applicationCreateSchema.partial();

export const applicationFilterSchema = z.object({
  q: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  status: z.nativeEnum(ApplicationStatus).optional(),
  priority: z.nativeEnum(ApplicationPriority).optional(),
  source: z.preprocess(emptyToUndef, z.string().trim().optional()),
  sort: z
    .enum(["appliedAt", "company", "status", "updatedAt", "createdAt"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
});

export const boardMoveSchema = z.object({
  status: z.nativeEnum(ApplicationStatus),
  boardOrder: z.number().int().min(0),
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type ApplicationFilter = z.infer<typeof applicationFilterSchema>;
