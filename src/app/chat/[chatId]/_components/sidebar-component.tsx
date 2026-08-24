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
    <div className="h-full flex flex-col p-4 overflow-y-auto gap-6">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Sentiment mix
        </h3>

        {stats && stats.total > 0 ? (
          <div className="space-y-3">
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
              <div
                className="bg-emerald-500"
                style={{ width: `${stats.positivePct}%` }}
                title={`Positive ${stats.positivePct}%`}
              />
              <div
                className="bg-slate-400"
                style={{ width: `${stats.neutralPct}%` }}
                title={`Neutral ${stats.neutralPct}%`}
              />
              <div
                className="bg-red-500"
                style={{ width: `${stats.negativePct}%` }}
                title={`Negative ${stats.negativePct}%`}
              />
            </div>

            <ul className="text-sm space-y-1.5">
              <li className="flex justify-between">
                <span className="text-emerald-700">Positive</span>
                <span>
                  {stats.positive}{" "}
                  <span className="text-muted-foreground">
                    ({stats.positivePct}%)
                  </span>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-600">Neutral</span>
                <span>
                  {stats.neutral}{" "}
                  <span className="text-muted-foreground">
                    ({stats.neutralPct}%)
                  </span>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-red-700">Negative</span>
                <span>
                  {stats.negative}{" "}
                  <span className="text-muted-foreground">
                    ({stats.negativePct}%)
                  </span>
                </span>
              </li>
              <li className="flex justify-between text-muted-foreground pt-1 border-t">
                <span>Total comments</span>
                <span>{stats.total}</span>
              </li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No comment stats yet.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Insights
        </h3>

        {sentiment?.content ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
            {sentiment.content}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No sentiment analysis available for this chat yet.
          </p>
        )}
      </section>
    </div>
  );
};

export default SidebarComponent;
