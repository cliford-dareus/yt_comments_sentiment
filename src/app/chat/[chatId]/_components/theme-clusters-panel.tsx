"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { rerunThemesAndTriageAction } from "../_actions/triage-actions";
import { useRouter } from "next/navigation";

export type ThemeClusterRow = {
  id: string;
  themeKey: string;
  label: string;
  polarity: string | null;
  commentCount: number;
  likeWeight: number;
  summary: string | null;
};

type Props = {
  chatId: string;
  clusters: ThemeClusterRow[];
};

const ThemeClustersPanel = ({ chatId, clusters }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const negatives = clusters.filter(
    (c) => c.polarity === "negative" || c.polarity === "mixed",
  );
  const positives = clusters.filter((c) => c.polarity === "positive");

  const rerun = async () => {
    setLoading(true);
    setError(null);
    const res = await rerunThemesAndTriageAction(chatId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Issue themes
          </p>
          <p className="text-sm font-medium text-slate-800">
            What to fix next (not just pos/neg)
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={loading}
          onClick={rerun}
        >
          {loading ? "Clustering…" : clusters.length ? "Refresh" : "Build themes"}
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {!clusters.length && (
          <p className="text-xs text-muted-foreground">
            No themes yet. Run analysis or hit Build themes after comments are
            labeled.
          </p>
        )}

        {negatives.length > 0 && (
          <div className="space-y-2">
            {negatives.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-red-100 bg-red-50/40 px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {c.label}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                    {c.commentCount} · 👍 {c.likeWeight}
                  </span>
                </div>
                {c.summary && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {c.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {positives.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Praise themes
            </p>
            {positives.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-emerald-100 bg-emerald-50/40 px-2.5 py-1.5 flex justify-between gap-2"
              >
                <span className="text-xs font-medium">{c.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {c.commentCount} · 👍 {c.likeWeight}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeClustersPanel;
