"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function AuthGoogleButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      className="w-full"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl: "/dashboard" });
      }}
    >
      {loading ? "Redirecting..." : "Continue with Google"}
    </Button>
  );
}
