"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  draftReplyToComment,
  saveReplyDraft,
  type ReplyTone,
} from "../_actions/draft-reply";
import { updateTriageStatusAction } from "../_actions/triage-actions";
import { THEME_CATALOG } from "@/lib/themes-and-triage";
import { useRouter } from "next/navigation";

export type TriageItem = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  likeCount: number | null;
  sentimentLabel: "positive" | "negative" | "neutral" | null;
  themeKey: string | null;
  replyDraft: string | null;
  triageStatus: "open" | "drafted" | "done" | "skipped" | null;
  triagePriority: number | null;
  triageReason: string | null;
};

type Props = {
  chatId: string;
  items: TriageItem[];
};

type StatusFilter = "active" | "open" | "drafted" | "done" | "skipped";

const TriageInbox = ({ chatId, items: initial }: Props) => {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [tone, setTone] = useState<ReplyTone>("friendly");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const i of initial) {
      if (i.replyDraft) map[i.id] = i.replyDraft;
    }
    return map;
  });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filter === "active")
        return i.triageStatus === "open" || i.triageStatus === "drafted";
      return i.triageStatus === filter;
    });
  }, [items, filter]);

  const setStatus = async (
    id: string,
    status: "open" | "drafted" | "done" | "skipped",
  ) => {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, triageStatus: status } : x)),
    );
    await updateTriageStatusAction({ chatId, commentId: id, status });
    router.refresh();
  };

  const draft = async (id: string) => {
    setLoadingId(id);
    const result = await draftReplyToComment({ chatId, commentId: id, tone });
    setLoadingId(null);
    if (result.variants?.[0]) {
      setDrafts((prev) => ({ ...prev, [id]: result.variants![0] }));
      await setStatus(id, "drafted");
    }
  };

  const save = async (id: string) => {
    const text = drafts[id]?.trim();
    if (!text) return;
    await saveReplyDraft({ chatId, commentId: id, draft: text });
    await setStatus(id, "drafted");
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "open", label: "Open" },
    { key: "drafted", label: "Drafted" },
    { key: "done", label: "Done" },
    { key: "skipped", label: "Skipped" },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div>
          <h2 className="text-lg font-semibold">Triage inbox</h2>
          <p className="text-[11px] text-muted-foreground">
            High-likes criticism, questions, superfans — not every comment
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filtered.length}
        </span>
      </div>

      <div className="flex gap-1 mb-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              filter === f.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground">Tone:</span>
        {(["friendly", "professional", "playful", "apologetic"] as ReplyTone[]).map(
          (t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`text-[11px] px-2 py-0.5 rounded border capitalize ${
                tone === t
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-slate-200"
              }`}
            >
              {t}
            </button>
          ),
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inbox empty for this filter. Run or refresh themes if analysis just
            finished.
          </p>
        ) : (
          filtered.map((item) => {
            const themeLabel = item.themeKey
              ? THEME_CATALOG[item.themeKey]?.label ?? item.themeKey
              : null;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 p-3 text-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {item.authorDisplayName ?? "Viewer"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      P{item.triagePriority ?? "—"}
                      {item.triageReason ? ` · ${item.triageReason}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                    {item.sentimentLabel && (
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100">
                        {item.sentimentLabel}
                      </span>
                    )}
                    {themeLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-100">
                        {themeLabel}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {item.text}
                </p>

                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>👍 {item.likeCount ?? 0}</span>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={loadingId === item.id}
                      onClick={() => draft(item.id)}
                    >
                      {loadingId === item.id ? "Drafting…" : "Draft"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setStatus(item.id, "done")}
                    >
                      Done
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setStatus(item.id, "skipped")}
                    >
                      Skip
                    </Button>
                  </div>
                </div>

                {drafts[item.id] != null && (
                  <div className="space-y-1.5">
                    <textarea
                      className="w-full min-h-[64px] rounded-md border px-2 py-1.5 text-sm"
                      value={drafts[item.id]}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[11px] text-indigo-600 hover:underline"
                        onClick={() =>
                          navigator.clipboard.writeText(drafts[item.id] ?? "")
                        }
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="text-[11px] text-indigo-600 hover:underline"
                        onClick={() => save(item.id)}
                      >
                        Save draft
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TriageInbox;
