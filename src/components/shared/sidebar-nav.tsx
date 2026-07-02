"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { bottomNav, mainNav, type NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {item.title}
      </Link>
    );
  };

  return (
    <nav className="flex h-full flex-col gap-1">
      <div className="flex-1 space-y-1">{mainNav.map(renderItem)}</div>
      <div className="border-sidebar-border space-y-1 border-t pt-2">
        {bottomNav.map(renderItem)}
      </div>
    </nav>
  );
}
