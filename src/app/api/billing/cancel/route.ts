import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { cancelSubscription } from "@/lib/billing";

/** POST /api/billing/cancel — cancel the paid plan at period end. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }

  const ok = await cancelSubscription(session.user.id);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "NO_SUBSCRIPTION", message: "Nothing to cancel" } },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
