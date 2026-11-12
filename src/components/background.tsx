"use client";

import { cn } from "@/lib/utils";

type BackgroundType = {
  children?: React.ReactNode;
  classnames?: string;
};

const Background = ({ children, classnames }: BackgroundType) => {
  return (
    <div className="relative min-h-screen">
      <video
        src="/rings.mp4"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />
      {/* Readable text over motion background */}
      <div className="pointer-events-none fixed inset-0 z-[1] bg-slate-950/70" />
      <div className={cn("relative z-10 w-full", classnames)}>{children}</div>
    </div>
  );
};

export default Background;
