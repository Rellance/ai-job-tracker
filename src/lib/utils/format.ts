export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency = "USD",
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

export function formatDate(date?: Date | string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelative(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const abs = Math.abs(diffMs);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  const past = diffMs >= 0;
  const sign = past ? -1 : 1;

  if (abs < min) return "just now";
  if (abs < hour) return rtf.format(sign * Math.round(abs / min), "minute");
  if (abs < day) return rtf.format(sign * Math.round(abs / hour), "hour");
  if (abs < 30 * day) return rtf.format(sign * Math.round(abs / day), "day");
  return formatDate(d);
}
