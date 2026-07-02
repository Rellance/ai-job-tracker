"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_META, STATUS_ORDER } from "@/lib/applications/meta";

const ALL = "all";

const priorityItems = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const sortItems = [
  { value: "createdAt.desc", label: "Newest" },
  { value: "appliedAt.desc", label: "Applied date" },
  { value: "company.asc", label: "Company A–Z" },
  { value: "status.asc", label: "Status" },
  { value: "updatedAt.desc", label: "Recently updated" },
];

export function FilterBar({ sources }: { sources: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mutate(p);
    p.delete("page");
    startTransition(() => router.replace(`${pathname}?${p.toString()}`));
  }

  // Debounced search
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      apply((p) => (q ? p.set("q", q) : p.delete("q")));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = params.get("status") ?? ALL;
  const priority = params.get("priority") ?? ALL;
  const source = params.get("source") ?? ALL;
  const sort = `${params.get("sort") ?? "createdAt"}.${params.get("order") ?? "desc"}`;

  const setParam = (key: string, value: string | null) =>
    apply((p) => (!value || value === ALL ? p.delete(key) : p.set(key, value)));

  const setSort = (value: string | null) =>
    apply((p) => {
      if (!value) return;
      const [s, o] = value.split(".");
      if (s) p.set("sort", s);
      if (o) p.set("order", o);
    });

  const hasFilters = Boolean(
    params.get("q") ||
    params.get("status") ||
    params.get("priority") ||
    params.get("source"),
  );

  const clearAll = () => {
    setQ("");
    startTransition(() => router.replace(pathname));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        {isPending ? (
          <Loader2 className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin" />
        ) : (
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        )}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, title, notes…"
          className="pl-8"
          aria-label="Search applications"
        />
      </div>

      <Select value={status} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={(v) => setParam("priority", v)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {priorityItems.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sources.length > 0 && (
        <Select value={source} onValueChange={(v) => setParam("source", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortItems.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
