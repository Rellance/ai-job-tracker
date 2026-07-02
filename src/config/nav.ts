import {
  Briefcase,
  Calendar,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Applications", href: "/applications", icon: Briefcase },
  { title: "Board", href: "/board", icon: KanbanSquare },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "AI Tools", href: "/ai", icon: Sparkles },
  { title: "Resumes", href: "/resumes", icon: FileText },
];

export const bottomNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
];
