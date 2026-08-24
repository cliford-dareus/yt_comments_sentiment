import type { SentimentType } from "@/lib/db/schema";

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

type Props = {
  sentiment: SentimentType | null;
  stats: Stats;
};

const SidebarComponent = ({ sentiment, stats }: Props) => {
  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto gap-5">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Creator brief
        </h3>
        <p className="text-xs text-muted-foreground">
          Full write-up from the comment section analysis.
        </p>
      </div>

      {stats && stats.total > 0 && (
        <div className="rounded-lg border px-3 py-2 text-xs space-y-1 bg-slate-50">
          <div className="flex justify-between">
            <span className="text-emerald-700">Positive</span>
            <span>
              {stats.positivePct}% ({stats.positive})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Neutral</span>
            <span>
              {stats.neutralPct}% ({stats.neutral})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-700">Negative</span>
            <span>
              {stats.negativePct}% ({stats.negative})
            </span>
          </div>
        </div>
      )}

      {sentiment?.content ? (
        <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
          {sentiment.content}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No sentiment analysis available for this chat yet.
        </p>
      )}
    </div>
  );
};

export default SidebarComponent;
