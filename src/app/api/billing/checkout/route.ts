import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ensureCustomer, priceForPlan, stripe } from "@/lib/billing";
import { env } from "@/lib/env";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const bodySchema = z.object({ plan: z.enum(["PRO", "ENTERPRISE"]) });

/** POST /api/billing/checkout — creates a Stripe Checkout session (test-mode). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }
  const userId = session.user.id;

  const rl = await rateLimit(`checkout:${userId}`, 5, 60);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Pick a plan to upgrade to" } },
      { status: 400 },
    );
  }

  const customer = await ensureCustomer(userId);
  const checkout = await stripe().checkout.sessions.create({
    customer,
    mode: "subscription",
    line_items: [{ price: priceForPlan(parsed.data.plan), quantity: 1 }],
    success_url: `${env.APP_URL}/settings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/settings`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}
