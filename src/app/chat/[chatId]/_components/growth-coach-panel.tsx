"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getGrowthAdviceAction,
  type GrowthAdvice,
} from "../_actions/growth-advice";

type Props = {
  chatId: string;
};

const priorityStyle: Record<
  GrowthAdvice["nextSteps"][number]["priority"],
  string
> = {
  high: "bg-red-50 text-red-800 border-red-100",
  medium: "bg-amber-50 text-amber-900 border-amber-100",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

const GrowthCoachPanel = ({ chatId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<GrowthAdvice | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    const result = await getGrowthAdviceAction(chatId);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setAdvice(result.advice);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Growth coach
          </p>
          <p className="text-sm text-zinc-600 mt-0.5">
            Next steps to improve this video's craft and grow the channel —
            grounded in your comment data.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 text-xs bg-zinc-900 text-white hover:bg-zinc-800"
          disabled={loading}
          onClick={run}
        >
          {loading
            ? "Building plan…"
            : advice
              ? "Refresh plan"
              : "Get growth plan"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 rounded-md border border-red-100 bg-red-50 px-2 py-1.5">
          {error}
        </p>
      )}

      {advice && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-zinc-900 leading-relaxed">
            {advice.headline}
          </p>

          {advice.nextSteps.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Next steps
              </h3>
              <ol className="space-y-2">
                {advice.nextSteps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-2 items-start text-sm text-zinc-800"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-relaxed">{step.action}</p>
                      <span
                        className={`mt-1 inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${priorityStyle[step.priority]}`}
                      >
                        {step.priority}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {advice.videoImprovements.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Improve the next video
              </h3>
              <div className="space-y-2">
                {advice.videoImprovements.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-zinc-900">
                      {item.title}
                    </p>
                    {item.why && (
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                        <span className="font-medium text-zinc-600">Why: </span>
                        {item.why}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-zinc-700 leading-relaxed">
                      <span className="font-medium text-zinc-800">How: </span>
                      {item.how}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {advice.doubleDown.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Double down
              </h3>
              <ul className="space-y-1.5">
                {advice.doubleDown.map((line, i) => (
                  <li
                    key={i}
                    className="text-sm text-zinc-700 leading-relaxed flex gap-2"
                  >
                    <span className="text-emerald-600 shrink-0">+</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {advice.channelGrowth.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Channel growth
              </h3>
              <ul className="space-y-1.5">
                {advice.channelGrowth.map((line, i) => (
                  <li
                    key={i}
                    className="text-sm text-zinc-700 leading-relaxed flex gap-2"
                  >
                    <span className="text-indigo-600 shrink-0">→</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default GrowthCoachPanel;
