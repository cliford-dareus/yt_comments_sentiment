"use client";

import { useState } from "react";
import CommentsPanel from "./comments-panel";
import TriageInbox, { type TriageItem } from "./triage-inbox";

type Comment = {
  id: string;
  text: string;
  authorDisplayName: string | null;
  likeCount: number | null;
  publishedAt: Date | string | null;
  sentimentLabel: "positive" | "negative" | "neutral" | null;
  sentimentScore: number | null;
  replyDraft?: string | null;
};

type Props = {
  chatId: string;
  comments: Comment[];
  triageItems: TriageItem[];
};

const RightRail = ({ chatId, comments, triageItems }: Props) => {
  const [tab, setTab] = useState<"triage" | "all">("triage");

  const openCount = triageItems.filter(
    (i) => i.triageStatus === "open" || i.triageStatus === "drafted",
  ).length;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex gap-1 mb-3 border-b pb-2">
        <button
          type="button"
          onClick={() => setTab("triage")}
          className={`text-xs px-3 py-1.5 rounded-md font-medium ${
            tab === "triage"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Triage{openCount ? ` (${openCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("all")}
          className={`text-xs px-3 py-1.5 rounded-md font-medium ${
            tab === "all"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All comments
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "triage" ? (
          <TriageInbox chatId={chatId} items={triageItems} />
        ) : (
          <CommentsPanel chatId={chatId} comments={comments} />
        )}
      </div>
    </div>
  );
};

export default RightRail;
