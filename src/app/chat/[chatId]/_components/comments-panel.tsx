"use client";

import { useMemo, useState } from "react";

type Comment = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  likeCount: number | null;
  publishedAt: Date | string | null;
  sentimentLabel: "positive" | "negative" | "neutral" | null;
  sentimentScore: number | null;
};

type Filter = "all" | "positive" | "negative" | "neutral";

type Props = {
  comments: Comment[];
};

const badgeClass: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  negative: "bg-red-100 text-red-800",
  neutral: "bg-slate-100 text-slate-700",
};

const CommentsPanel = ({ comments }: Props) => {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (filter !== "all" && c.sentimentLabel !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          c.text.toLowerCase().includes(q) ||
          (c.authorDisplayName?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [comments, filter, query]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "positive", label: "Positive" },
    { key: "negative", label: "Negative" },
    { key: "neutral", label: "Neutral" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-lg font-semibold">Comments</h2>
        <span className="text-xs text-muted-foreground">
          {filtered.length} / {comments.length}
        </span>
      </div>

      <input
        className="mb-3 w-full rounded-md border px-3 py-1.5 text-sm"
        placeholder="Search comments..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex gap-1 mb-3 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filter === f.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments match.</p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-slate-200 p-3 text-sm space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 truncate">
                  {c.authorDisplayName ?? "Unknown"}
                </span>
                {c.sentimentLabel && (
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      badgeClass[c.sentimentLabel] ?? badgeClass.neutral
                    }`}
                  >
                    {c.sentimentLabel}
                  </span>
                )}
              </div>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {c.text}
              </p>
              <div className="text-[11px] text-muted-foreground flex gap-3">
                <span>👍 {c.likeCount ?? 0}</span>
                {c.sentimentScore != null && (
                  <span>confidence {c.sentimentScore}%</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsPanel;
