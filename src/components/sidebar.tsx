"use client";

import { cn } from "@/lib/utils";
// import { ChevronFirst, ChevronLast } from "lucide-react";
import React, { Dispatch, useEffect, useState } from "react";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/provider/sidebar-provider";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

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
  const { expanded, setExpanded } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname == "/dashboard") {
      setExpanded(true);
    }
  }, [pathname]);

  const handleExpand = () => {
    if (pathname == "/dashboard") return;
    setExpanded(!expanded);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        className={cn(
          "h-screen absolute top-0 left-0",
          `${expanded ? "w-52" : "w-[60px]"}`,
        )}
        onMouseEnter={() => handleExpand()}
        onMouseLeave={() => handleExpand()}
      >
        {/* Sidebar Logo and sidebar toggle */}
        <nav className="h-full flex flex-col bg-gray-100 border-r shadow-sm">
          <div className="p-2 pb-2 flex justify-between items-center">
            <svg
              className="overflow-hidden transition-all w-[40px] h-[40px]"
              width="200"
              height="250"
              viewBox="0 0 200 250"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 62.5V200L62.5 250V112.5H137.5V200L200 250V112.5L87.5 0V62.5H0Z"
                fill="black"
              />
            </svg>
          </div>
          {/* Sidebar Menu */}
          <ul className="flex-1 px-3 mt-[2em]">{children}</ul>
        </nav>
      </motion.aside>
    </AnimatePresence>
  );
};

export default Sidebar;
