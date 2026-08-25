"use client";

import { useMemo, useState } from "react";
import { draftCommunityPost } from "../_actions/draft-reply";
import { Button } from "@/components/ui/button";

type Stats = {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  unlabeled: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
} | null;

type SampleComment = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  likeCount: number | null;
  sentimentLabel: "positive" | "negative" | "neutral" | null;
};

type Props = {
  chatId: string;
  stats: Stats;
  summary: string | null;
  samples: SampleComment[];
  videoId?: string | null;
};

function overallLabel(stats: NonNullable<Stats>) {
  if (stats.positivePct >= stats.negativePct + 15) return "Mostly positive";
  if (stats.negativePct >= stats.positivePct + 15) return "Mostly negative";
  return "Mixed";
}

function overallColor(stats: NonNullable<Stats>) {
  if (stats.positivePct >= stats.negativePct + 15) return "text-emerald-700";
  if (stats.negativePct >= stats.positivePct + 15) return "text-red-700";
  return "text-amber-700";
}

const InsightsDashboard = ({
  chatId,
  stats,
  summary,
  samples,
  videoId,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [communityPost, setCommunityPost] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [postCopied, setPostCopied] = useState(false);

  const topPositive = useMemo(
    () => samples.filter((c) => c.sentimentLabel === "positive").slice(0, 2),
    [samples],
  );

  const topNegative = useMemo(
    () => samples.filter((c) => c.sentimentLabel === "negative").slice(0, 2),
    [samples],
  );

  const handleCommunityPost = async () => {
    setPostLoading(true);
    setPostError(null);
    const result = await draftCommunityPost({ chatId, tone: "friendly" });
    setPostLoading(false);

    if (result.error || !result.post) {
      setPostError(result.error ?? "Failed to draft post");
      return;
    }
    setCommunityPost(result.post);
  };

  const copyPost = async () => {
    if (!communityPost) return;
    try {
      await navigator.clipboard.writeText(communityPost);
      setPostCopied(true);
      setTimeout(() => setPostCopied(false), 1500);
    } catch {
      setPostError("Could not copy");
    }
  };

  if (!stats || stats.total === 0) {
    return (
      <div className="border-b bg-slate-50 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Insights will appear here after comments are analyzed.
        </p>
      </div>
    );
  }

  const cards = [
    {
      label: "Comments",
      value: String(stats.total),
      sub: videoId ? `Video ${videoId}` : "Analyzed",
      accent: "border-slate-200",
    },
    {
      label: "Positive",
      value: `${stats.positivePct}%`,
      sub: `${stats.positive} comments`,
      accent: "border-emerald-200 bg-emerald-50/50",
    },
    {
      label: "Neutral",
      value: `${stats.neutralPct}%`,
      sub: `${stats.neutral} comments`,
      accent: "border-slate-200 bg-slate-50/80",
    },
    {
      label: "Negative",
      value: `${stats.negativePct}%`,
      sub: `${stats.negative} comments`,
      accent: "border-red-200 bg-red-50/50",
    },
  ];

  return (
    <div className="border-b bg-white shrink-0">
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Insights
            </h2>
            <p className={`text-lg font-semibold mt-0.5 ${overallColor(stats)}`}>
              {overallLabel(stats)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {summary && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={postLoading}
                onClick={handleCommunityPost}
              >
                {postLoading
                  ? "Drafting…"
                  : communityPost
                    ? "Regenerate post"
                    : "Draft pinned post"}
              </Button>
            )}
            {summary && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                {expanded ? "Hide brief" : "Show full brief"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border px-3 py-2 ${card.accent}`}
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="text-xl font-semibold tabular-nums leading-tight mt-0.5">
                {card.value}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${stats.positivePct}%` }}
            />
            <div
              className="bg-slate-400 transition-all"
              style={{ width: `${stats.neutralPct}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${stats.negativePct}%` }}
            />
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Positive
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Neutral
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Negative
            </span>
          </div>
        </div>

        {(topPositive.length > 0 || topNegative.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {topPositive.length > 0 && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 mb-1.5">
                  Top praise
                </p>
                <ul className="space-y-1.5">
                  {topPositive.map((c) => (
                    <li
                      key={c.id}
                      className="text-xs text-slate-700 line-clamp-2"
                    >
                      <span className="font-medium">
                        {c.authorDisplayName ?? "Viewer"}:
                      </span>{" "}
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {topNegative.length > 0 && (
              <div className="rounded-lg border border-red-100 bg-red-50/40 p-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-800 mb-1.5">
                  Top criticism
                </p>
                <ul className="space-y-1.5">
                  {topNegative.map((c) => (
                    <li
                      key={c.id}
                      className="text-xs text-slate-700 line-clamp-2"
                    >
                      <span className="font-medium">
                        {c.authorDisplayName ?? "Viewer"}:
                      </span>{" "}
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {postError && <p className="text-xs text-red-500">{postError}</p>}

        {communityPost && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                Pinned / community post draft
              </p>
              <button
                type="button"
                className="text-[11px] text-indigo-600 hover:underline"
                onClick={copyPost}
              >
                {postCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-800">
              {communityPost}
            </p>
          </div>
        )}

        {expanded && summary && (
          <div className="rounded-lg border bg-slate-50 p-3 max-h-48 overflow-y-auto">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Creator brief
            </p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-800">
              {summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsDashboard;
