"use client";

import Link from "next/link";
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
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div className="pl-[60px] border-b bg-white">
      <div className="flex items-center w-full justify-between pr-4 h-[56px]">
        <div className="flex items-center min-w-0">
          <div className="w-[200px] min-w-[200px] px-4 border-r h-[56px] flex items-center">
            <Link
              className="text-xl text-black font-bold tracking-tight"
              href="/dashboard"
            >
              Comment.ai
            </Link>
          </div>

          <div className="flex gap-3 items-center px-4 min-w-0">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt=""
                className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">
                {displayName}
              </p>
              {user.fullName && (
                <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                  {user.email}
                </p>
              )}
            </div>
            <span className="hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-900 text-white">
              Free
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut({ callbackUrl: "/auth" });
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  );
};

export default Navigation;
