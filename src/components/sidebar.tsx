"use client";

import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/provider/sidebar-provider";
import { BRAND } from "@/lib/brand";

type Props = {
  children: React.ReactNode;
};

const Sidebar = ({ children }: Props) => {
  return (
    <SidebarProvider>
      <SidebarContent>{children}</SidebarContent>
    </SidebarProvider>
  );
};

const SidebarContent = ({ children }: Props) => {
  const { expanded, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-200/80 bg-white transition-[width] duration-200 ease-out",
        expanded ? "w-56" : "w-16",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-zinc-100 px-3",
          expanded ? "justify-between gap-2" : "justify-center",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 min-w-0",
            !expanded && "justify-center",
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[13px] font-semibold tracking-tight text-white">
            C
          </span>
          {expanded && (
            <span className="truncate text-sm font-semibold tracking-tight text-zinc-900">
              {BRAND.name}
            </span>
          )}
        </Link>

        {expanded && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">{children}</nav>

      {!expanded && (
        <div className="border-t border-zinc-100 p-2">
          <button
            type="button"
            onClick={toggle}
            aria-label="Expand sidebar"
            className="flex w-full items-center justify-center rounded-lg p-2.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
