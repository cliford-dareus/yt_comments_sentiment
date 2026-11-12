"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/provider/sidebar-provider";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: House,
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
  },
  {
    id: "projects",
    label: "Projects",
    href: "/chat",
    icon: MessageCircle,
    match: (p) => p === "/chat" || p.startsWith("/chat/"),
  },
];

const SidebarItems = () => {
  const pathname = usePathname();
  const { expanded } = useSidebar();

  return (
    <ul className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;

        return (
          <li key={item.id}>
            <Link
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                expanded ? "justify-start" : "justify-center",
                active
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-700",
                )}
                strokeWidth={1.75}
              />
              {expanded && <span className="truncate">{item.label}</span>}

              {!expanded && (
                <span
                  className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 opacity-0 shadow-sm transition group-hover:opacity-100"
                >
                  {item.label}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarItems;
