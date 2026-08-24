"use client";

import { useMemo, useState } from "react";
import {
  draftReplyToComment,
  type ReplyTone,
} from "../_actions/draft-reply";
import { Button } from "@/components/ui/button";

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
  chatId: string;
  comments: Comment[];
};

const badgeClass: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  negative: "bg-red-100 text-red-800",
  neutral: "bg-slate-100 text-slate-700",
};

const TONES: { value: ReplyTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "playful", label: "Playful" },
  { value: "apologetic", label: "Apologetic" },
];

const CommentsPanel = ({ chatId, comments }: Props) => {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<ReplyTone>("friendly");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleDraft = async (commentId: string) => {
    setLoadingId(commentId);
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    setActiveId(commentId);

    const result = await draftReplyToComment({
      chatId,
      commentId,
      tone,
    });

    setLoadingId(null);

    if (result.error || !result.reply) {
      setErrorById((prev) => ({
        ...prev,
        [commentId]: result.error ?? "Failed to draft reply",
      }));
      return;
    }

    setDrafts((prev) => ({ ...prev, [commentId]: result.reply! }));
  };

  const handleCopy = async (commentId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(commentId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setErrorById((prev) => ({
        ...prev,
        [commentId]: "Could not copy to clipboard",
      }));
    }
  };

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

      <div className="flex gap-1 mb-2 flex-wrap">
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

      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Reply tone:</span>
        {TONES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTone(t.value)}
            className={`text-xs px-2 py-0.5 rounded-md border ${
              tone === t.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {t.label}
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
              className={`rounded-lg border p-3 text-sm space-y-2 ${
                activeId === c.id
                  ? "border-indigo-300 bg-indigo-50/30"
                  : "border-slate-200"
              }`}
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

              <div className="text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                <div className="flex gap-3">
                  <span>👍 {c.likeCount ?? 0}</span>
                  {c.sentimentScore != null && (
                    <span>confidence {c.sentimentScore}%</span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={loadingId === c.id}
                  onClick={() => handleDraft(c.id)}
                >
                  {loadingId === c.id
                    ? "Drafting..."
                    : drafts[c.id]
                      ? "Regenerate"
                      : "Draft reply"}
                </Button>
              </div>

              {errorById[c.id] && (
                <p className="text-xs text-red-500">{errorById[c.id]}</p>
              )}

              {drafts[c.id] && (
                <div className="rounded-md border border-indigo-100 bg-white p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                      Suggested reply
                    </span>
                    <button
                      type="button"
                      className="text-[11px] text-indigo-600 hover:underline"
                      onClick={() => handleCopy(c.id, drafts[c.id])}
                    >
                      {copiedId === c.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {drafts[c.id]}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsPanel;
