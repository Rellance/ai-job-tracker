import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const contactCreateSchema = z.object({
  applicationId: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(120),
  role: z.preprocess(emptyToUndef, z.string().trim().max(80).optional()),
  email: z.preprocess(
    emptyToUndef,
    z.string().email("Enter a valid email").optional(),
  ),
  phone: z.preprocess(emptyToUndef, z.string().trim().max(40).optional()),
  linkedinUrl: z.preprocess(
    emptyToUndef,
    z.string().url("Enter a valid URL").optional(),
  ),
  notes: z.preprocess(emptyToUndef, z.string().trim().max(2000).optional()),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
