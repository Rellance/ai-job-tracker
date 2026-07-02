"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { PasswordInput } from "@/components/auth/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { passwordSchema } from "@/lib/validations/auth";

const formSchema = z.object({ password: passwordSchema });
type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = (values: FormValues) => {
    setMessage(null);
    startTransition(async () => {
      const res = await resetPasswordAction({
        token,
        password: values.password,
      });
      if (res?.error) setMessage({ type: "error", text: res.error });
      else if (res?.success) setMessage({ type: "success", text: res.success });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>
          Choose a strong password for your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {message && (
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          {message?.type !== "success" && (
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-destructive text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          {message?.type === "success" ? (
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Continue to sign in
            </Link>
          ) : (
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Updating…" : "Update password"}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
