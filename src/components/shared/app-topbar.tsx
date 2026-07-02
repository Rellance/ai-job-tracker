"use client";

import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";

import { Brand } from "@/components/shared/brand";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { UserMenu } from "@/components/shared/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppTopbar({
  user,
}: {
  user: { name?: string | null; email?: string | null };
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur lg:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center border-b px-5">
            <Brand />
          </div>
          <div className="p-3">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <button
        type="button"
        className="text-muted-foreground hover:bg-accent hidden h-9 w-full max-w-xs items-center gap-2 rounded-md border px-3 text-sm transition-colors sm:flex"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="bg-muted text-muted-foreground ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>
        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
