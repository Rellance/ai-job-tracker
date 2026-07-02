import { env } from "@/lib/env";

type SendArgs = { to: string; subject: string; html: string; text: string };

/**
 * In dev (no RESEND_API_KEY) emails are logged to the server console so the
 * reset link is easy to grab. In prod they go through Resend.
 * (Moves to the BullMQ `email` queue in M4.)
 */
export async function sendEmail({ to, subject, html, text }: SendArgs) {
  if (!env.RESEND_API_KEY) {
    console.log(
      `\n📧 [dev email]\n  To: ${to}\n  Subject: ${subject}\n  ${text}\n`,
    );
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM ?? "AI Job Tracker <onboarding@resend.dev>",
    to,
    subject,
    html,
    text,
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Reset your AI Job Tracker password",
    text: `Reset your password (expires in 60 minutes): ${url}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px">
        <h2>Reset your password</h2>
        <p>We received a request to reset your AI Job Tracker password.</p>
        <p><a href="${url}" style="display:inline-block;background:#5b46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Reset password</a></p>
        <p style="color:#666;font-size:13px">This link expires in 60 minutes. If you didn't request it, you can ignore this email.</p>
      </div>`,
  });
}
