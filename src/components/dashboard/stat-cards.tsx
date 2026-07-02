import {
  Briefcase,
  CalendarClock,
  CalendarPlus,
  Trophy,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Stats = {
  total: number;
  thisMonth: number;
  interviewsScheduled: number;
  rejections: number;
  offers: number;
  successRate: number;
};

export function StatCards({ stats }: { stats: Stats }) {
  const cards: { label: string; value: string | number; icon: LucideIcon }[] = [
    { label: "Total applications", value: stats.total, icon: Briefcase },
    { label: "This month", value: stats.thisMonth, icon: CalendarPlus },
    {
      label: "Interviews scheduled",
      value: stats.interviewsScheduled,
      icon: CalendarClock,
    },
    { label: "Rejections", value: stats.rejections, icon: XCircle },
    { label: "Offers", value: stats.offers, icon: Trophy },
    { label: "Success rate", value: `${stats.successRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium">
                  {c.label}
                </span>
                <Icon className="text-muted-foreground size-4" />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {c.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
