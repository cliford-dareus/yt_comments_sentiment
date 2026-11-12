"use client";

import Sidebar from "@/components/sidebar";
import SidebarItems from "@/components/sidebar-item";
import Navigation from "@/components/ds-navigation";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/provider/sidebar-provider";
import { cn } from "@/lib/utils";

type User = {
  id: string;
  email: string;
  fullName?: string | null;
  picture?: string | null;
};

function ShellFrame({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const { expanded } = useSidebar();

  return (
    <div className="min-h-screen bg-zinc-50/80">
      <Sidebar>
        <SidebarItems />
      </Sidebar>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200 ease-out",
          expanded ? "pl-56" : "pl-16",
        )}
      >
        <Navigation user={user} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

/**
 * App chrome: collapsible sidebar + top bar + content.
 * SidebarProvider lives once here so offset tracks expand state.
 */
export default function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ShellFrame user={user}>{children}</ShellFrame>
    </SidebarProvider>
  );
}
