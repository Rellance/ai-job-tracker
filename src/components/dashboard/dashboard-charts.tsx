"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BOARD_COLUMNS, type BoardColumn } from "@/lib/applications/meta";

// Recharts applies fill/stroke as SVG *attributes*, where CSS variables and
// oklch() don't resolve — so charts use concrete hex colors (valid on both
// light and dark). Tooltips use inline CSS style, so tokens work there.
const AXIS = "#94a3b8";
const PRIMARY = "#6366f1";
const STATUS_COLOR: Record<BoardColumn, string> = {
  WISHLIST: "#64748b",
  APPLIED: "#3b82f6",
  INTERVIEW: "#f59e0b",
  OFFER: "#22c55e",
  REJECTED: "#ef4444",
};

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
} as const;

const tick = { fill: AXIS, fontSize: 12 } as const;

const columnLabel = (c: BoardColumn) =>
  BOARD_COLUMNS.find((b) => b.id === c)?.label ?? c;

export function DashboardCharts({
  overTime,
  distribution,
  funnel,
}: {
  overTime: { month: string; count: number }[];
  distribution: { column: BoardColumn; count: number }[];
  funnel: { stage: string; count: number }[];
}) {
  const pieData = distribution.map((d) => ({
    ...d,
    label: columnLabel(d.column),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Applications over time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={overTime}
                margin={{ left: -18, right: 8, top: 8 }}
              >
                <defs>
                  <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={AXIS}
                  strokeOpacity={0.2}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={tick}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={tick}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Applications"
                  stroke={PRIMARY}
                  fill="url(#fillPrimary)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {pieData.map((d) => (
                    <Cell key={d.column} fill={STATUS_COLOR[d.column]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {pieData.map((d) => (
              <span
                key={d.column}
                className="flex items-center gap-1.5 text-xs"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: STATUS_COLOR[d.column] }}
                />
                {d.label} ({d.count})
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={AXIS}
                  strokeOpacity={0.2}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={tick}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tick={tick}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: AXIS, opacity: 0.12 }}
                />
                <Bar
                  dataKey="count"
                  name="Applications"
                  fill={PRIMARY}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
