"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Props = {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  used: number;
  limit: number | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  stripeConfigured: boolean;
};

const PLANS: {
  id: "PRO" | "ENTERPRISE";
  name: string;
  price: string;
  blurb: string;
}[] = [
  { id: "PRO", name: "Pro", price: "$12/mo", blurb: "Unlimited AI actions" },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: "$49/mo",
    blurb: "Everything in Pro, priority support",
  },
];

export function BillingPanel({
  plan,
  used,
  limit,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  stripeConfigured,
}: Props) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const upgrade = async (target: "PRO" | "ENTERPRISE") => {
    setRedirecting(target);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data?.error?.message ?? "Couldn't start checkout");
        setRedirecting(null);
        return;
      }
      window.location.href = data.url; // off to Stripe Checkout (test-mode)
    } catch {
      toast.error("Couldn't reach billing — try again.");
      setRedirecting(null);
    }
  };

  const cancel = () =>
    startTransition(async () => {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.ok) {
        toast.success("Plan will downgrade at the end of the period");
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message ?? "Couldn't cancel");
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4" />
          Plan & usage
        </CardTitle>
        <CardDescription>
          Test-mode billing — use card 4242 4242 4242 4242 with any future date
          and CVC.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Current plan:</span>
          <Badge>{plan}</Badge>
          {cancelAtPeriodEnd && currentPeriodEnd && (
            <span className="text-muted-foreground text-xs">
              downgrades{" "}
              {new Date(currentPeriodEnd).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {limit !== null ? (
          <div className="max-w-sm space-y-1.5">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>AI actions this month</span>
              <span className="tabular-nums">
                {used}/{limit}
              </span>
            </div>
            <Progress value={(used / limit) * 100} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Unlimited AI actions.</p>
        )}

        {plan === "FREE" && stripeConfigured && (
          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm tabular-nums">{p.price}</span>
                </div>
                <p className="text-muted-foreground text-sm">{p.blurb}</p>
                <Button
                  size="sm"
                  className="mt-1"
                  disabled={redirecting !== null}
                  onClick={() => upgrade(p.id)}
                >
                  {redirecting === p.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Upgrade to {p.name}
                </Button>
              </div>
            ))}
          </div>
        )}

        {plan !== "FREE" && !cancelAtPeriodEnd && (
          <Button
            variant="outline"
            size="sm"
            onClick={cancel}
            disabled={isPending}
          >
            {isPending ? "Cancelling…" : "Cancel subscription"}
          </Button>
        )}

        {!stripeConfigured && (
          <p className="text-muted-foreground text-sm">
            Stripe is not configured in this environment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
