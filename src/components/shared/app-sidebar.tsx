import { Brand } from "@/components/shared/brand";
import { SidebarNav } from "@/components/shared/sidebar-nav";

export function AppSidebar() {
  return (
    <aside className="bg-sidebar border-sidebar-border hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r">
      <div className="border-sidebar-border flex h-16 items-center border-b px-5">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
