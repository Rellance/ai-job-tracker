import { InterviewStatus, InterviewType } from "@prisma/client";
import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const interviewCreateSchema = z.object({
  applicationId: z.string().min(1, "Pick an application"),
  type: z.nativeEnum(InterviewType),
  scheduledAt: z.coerce.date(),
  durationMin: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(5).max(600).optional(),
  ),
  location: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
  meetingUrl: z.preprocess(
    emptyToUndef,
    z.string().url("Enter a valid URL").max(500).optional(),
  ),
  /** minutes before scheduledAt; 0 = no reminder */
  reminderMinutesBefore: z.coerce.number().int().min(0).max(20160).default(60),
});

export const interviewUpdateSchema = z.object({
  type: z.nativeEnum(InterviewType).optional(),
  status: z.nativeEnum(InterviewStatus).optional(),
  scheduledAt: z.coerce.date().optional(),
  durationMin: z.preprocess(
    emptyToUndef,
    z.coerce.number().int().min(5).max(600).optional(),
  ),
  location: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
  meetingUrl: z.preprocess(
    emptyToUndef,
    z.string().url("Enter a valid URL").max(500).optional(),
  ),
  outcome: z.preprocess(emptyToUndef, z.string().trim().max(5000).optional()),
});

export type InterviewCreateInput = z.infer<typeof interviewCreateSchema>;
export type InterviewUpdateInput = z.infer<typeof interviewUpdateSchema>;

export const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  PHONE_SCREEN: "Phone screen",
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  FINAL: "Final",
  FOLLOW_UP: "Follow-up",
};
