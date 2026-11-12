"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "./ui/button";

type Props = {
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    picture?: string | null;
  };
};

const Navigation = ({ user }: Props) => {
  const [signingOut, setSigningOut] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email || "Account";
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">
          {displayName}
        </p>
        {user.fullName ? (
          <p className="truncate text-xs text-zinc-500">{user.email}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
            {initials}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-zinc-500 hover:text-zinc-900"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut({ callbackUrl: "/auth" });
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </header>
  );
};

export default Navigation;
