"use client";

import { useMemo, useState } from "react";
import { draftCommunityPost } from "../_actions/draft-reply";
import { Button } from "@/components/ui/button";
import type { HealthScoreResult } from "@/lib/health-score";

type Stats = {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  unlabeled: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  health?: HealthScoreResult | null;
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

const colorMap: Record<
  NonNullable<HealthScoreResult>["color"],
  { ring: string; text: string; bg: string; bar: string }
> = {
  emerald: {
    ring: "stroke-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-100",
    bar: "bg-emerald-500",
  },
  lime: {
    ring: "stroke-lime-500",
    text: "text-lime-700",
    bg: "bg-lime-50 border-lime-100",
    bar: "bg-lime-500",
  },
  amber: {
    ring: "stroke-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50 border-amber-100",
    bar: "bg-amber-500",
  },
  orange: {
    ring: "stroke-orange-500",
    text: "text-orange-700",
    bg: "bg-orange-50 border-orange-100",
    bar: "bg-orange-500",
  },
  red: {
    ring: "stroke-red-500",
    text: "text-red-700",
    bg: "bg-red-50 border-red-100",
    bar: "bg-red-500",
  },
};

function HealthRing({
  score,
  color,
}: {
  score: number;
  color: HealthScoreResult["color"];
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const styles = colorMap[color];

  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-slate-100"
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={styles.ring}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold tabular-nums ${styles.text}`}>
          {score}
        </span>
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}

const InsightsDashboard = ({
  chatId,
  stats,
  summary,
  samples,
  videoId,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [showComponents, setShowComponents] = useState(false);
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

  const health = stats.health ?? null;
  const healthStyles = health ? colorMap[health.color] : null;

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

  const componentRows = health
    ? [
        {
          key: "sentimentBalance",
          label: "Sentiment balance",
          value: health.components.sentimentBalance,
          hint: "Positive vs negative share",
        },
        {
          key: "engagementQuality",
          label: "Engagement quality",
          value: health.components.engagementQuality,
          hint: "Like-weighted polarity",
        },
        {
          key: "criticismPressure",
          label: "Criticism pressure",
          value: health.components.criticismPressure,
          hint: "Higher = less liked negativity",
        },
        {
          key: "coverage",
          label: "Label coverage",
          value: health.components.coverage,
          hint: "% of comments labeled",
        },
      ]
    : [];

  return (
    <div className="border-b bg-white shrink-0">
      <div className="px-4 pt-4 pb-3 space-y-3">
        {health && healthStyles && (
          <div
            className={`rounded-xl border p-3 flex flex-col sm:flex-row gap-3 sm:items-center ${healthStyles.bg}`}
          >
            <HealthRing score={health.score} color={health.color} />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Creator health score
                  </p>
                  <p className={`text-lg font-semibold ${healthStyles.text}`}>
                    {health.grade}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComponents((v) => !v)}
                  className="text-[11px] font-medium text-slate-600 hover:underline"
                >
                  {showComponents ? "Hide breakdown" : "How it’s scored"}
                </button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {health.summary}
              </p>
            </div>
          </div>
        )}

        {health && showComponents && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {componentRows.map((row) => (
              <div
                key={row.key}
                className="rounded-lg border bg-white px-3 py-2 space-y-1.5"
              >
                <div className="flex justify-between text-xs gap-2">
                  <span className="font-medium text-slate-700">{row.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.value}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${healthStyles?.bar ?? "bg-slate-400"}`}
                    style={{ width: `${row.value}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{row.hint}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sentiment mix
            </h2>
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
