import { Plan, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import { env } from "@/lib/env";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  _stripe ??= new Stripe(env.STRIPE_SECRET_KEY);
  return _stripe;
}

export function planForPrice(priceId: string | null | undefined): Plan {
  if (priceId && priceId === env.STRIPE_PRICE_ENTERPRISE) return "ENTERPRISE";
  if (priceId && priceId === env.STRIPE_PRICE_PRO) return "PRO";
  return "FREE";
}

export function priceForPlan(plan: "PRO" | "ENTERPRISE"): string {
  const id =
    plan === "PRO" ? env.STRIPE_PRICE_PRO : env.STRIPE_PRICE_ENTERPRISE;
  if (!id) throw new Error(`Price for ${plan} is not configured`);
  return id;
}

/** Finds (or creates) the Stripe customer for a user and remembers the id. */
export async function ensureCustomer(userId: string): Promise<string> {
  const sub = await db.subscription.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  if (sub.stripeCustomerId) return sub.stripeCustomerId;

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, name: true },
  });
  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId },
  });
  await db.subscription.update({
    where: { userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/**
 * Single source of truth for plan state: reads the subscription from Stripe
 * and mirrors it into Subscription + User.plan. Called from the webhook and
 * from the checkout-return confirmation (so local dev works without a
 * webhook tunnel).
 */
export async function syncSubscription(
  stripeSubscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  const sub = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: { select: { id: true, plan: true } } },
  });
  if (!sub) return; // customer we don't know — nothing to sync

  const item = stripeSubscription.items.data[0];
  const active = ["active", "trialing", "past_due"].includes(
    stripeSubscription.status,
  );
  const plan: Plan = active ? planForPrice(item?.price.id) : "FREE";

  const statusMap: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    unpaid: "PAST_DUE",
    paused: "CANCELED",
  };

  const periodEnd = item?.current_period_end;

  await db.$transaction([
    db.subscription.update({
      where: { id: sub.id },
      data: {
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: item?.price.id ?? null,
        plan,
        status: statusMap[stripeSubscription.status] ?? "ACTIVE",
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    }),
    db.user.update({ where: { id: sub.user.id }, data: { plan } }),
  ]);

  if (sub.user.plan !== plan) {
    await emitActivity(sub.user.id, "PLAN_CHANGED", {
      entityType: "Subscription",
      entityId: sub.id,
      metadata: { from: sub.user.plan, to: plan },
    });
  }
}

/** Checkout-return path: verify the session belongs to this user, then sync. */
export async function confirmCheckoutSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!customerId) return false;

  const own = await db.subscription.findFirst({
    where: { userId, stripeCustomerId: customerId },
  });
  if (!own || session.status !== "complete") return false;

  const subscription = session.subscription;
  if (subscription && typeof subscription !== "string") {
    await syncSubscription(subscription);
  }
  return true;
}

/** Cancels the paid subscription at period end (keeps access until then). */
export async function cancelSubscription(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeSubscriptionId) return false;
  const updated = await stripe().subscriptions.update(
    sub.stripeSubscriptionId,
    { cancel_at_period_end: true },
  );
  await syncSubscription(updated);
  return true;
}
