"use server";

import { AuthError } from "next-auth";

import { auth, signIn, signOut } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { generateResetToken, hashToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { env } from "@/lib/env";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

type Result = { error?: string; success?: string } | void;

export async function registerAction(values: RegisterInput): Promise<Result> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await hashPassword(password);
  await db.user.create({
    data: { name, email, hashedPassword, subscription: { create: {} } },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created — please sign in." };
    }
    throw error; // redirect
  }
}

export async function loginAction(values: LoginInput): Promise<Result> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error; // redirect
  }
}

export async function forgotPasswordAction(
  values: ForgotPasswordInput,
): Promise<Result> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Enter a valid email" };
  }
  const { email } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // Only send if the account exists, but always return the same message so we
  // don't leak which emails are registered.
  if (user) {
    const { token, tokenHash } = generateResetToken();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const url = `${env.APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, url);
  }

  return {
    success: "If an account exists for that email, we've sent a reset link.",
  };
}

export async function resetPasswordAction(
  values: ResetPasswordInput,
): Promise<Result> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, password } = parsed.data;

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expires < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const hashedPassword = await hashPassword(password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { hashedPassword },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: "Password updated. You can now sign in." };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}
