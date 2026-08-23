import type { SentimentType } from "@/lib/db/schema";

type Props = {
  sentiment: SentimentType | null;
};

const SidebarComponent = ({ sentiment }: Props) => {
  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Sentiment Overview
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
    </div>
  );
};

export default SidebarComponent;
