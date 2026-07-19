import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe, syncSubscription } from "@/lib/billing";
import { env } from "@/lib/env";

/**
 * POST /api/stripe/webhook — signature-verified subscription sync (prod path;
 * local dev uses the checkout-return confirmation instead). Configure the
 * endpoint secret via STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Webhook secret not set" } },
      { status: 501 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: { code: "BAD_SIGNATURE", message: "Missing signature" } },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      await req.text(),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_SIGNATURE", message: "Invalid signature" } },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const sessionSub = event.data.object.subscription;
      if (typeof sessionSub === "string") {
        const sub = await stripe().subscriptions.retrieve(sessionSub);
        await syncSubscription(sub);
      }
      break;
    }
    default:
      break; // ignore unrelated events
  }

  return NextResponse.json({ received: true });
}
