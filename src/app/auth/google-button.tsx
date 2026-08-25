"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function AuthGoogleButton({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Could not start Google sign-in.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full h-11 gap-2 bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
        variant="outline"
        disabled={loading}
        onClick={onClick}
      >
        {!loading && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px]"
          />
        )}
        {loading ? "Redirecting to Google…" : "Continue with Google"}
      </Button>
      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}
