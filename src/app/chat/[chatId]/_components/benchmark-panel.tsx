"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runBenchmarkAction } from "../_actions/run-benchmark";
import type { BenchmarkResult } from "@/lib/benchmark";

type Props = {
  chatId: string;
  videoId?: string | null;
};

const BenchmarkPanel = ({ chatId, videoId }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [manualPeers, setManualPeers] = useState("");
  const [useManual, setUseManual] = useState(false);

  if (!videoId) return null;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runBenchmarkAction({
        chatId,
        manualPeers: useManual ? manualPeers : undefined,
      });
      if (res.error || !res.result) {
        setError(res.error ?? "Benchmark failed");
        setLoading(false);
        return;
      }
      setResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Benchmark failed");
    }
    setLoading(false);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Niche benchmark
          </p>
          <p className="text-sm font-medium text-slate-800">
            Compare to similar videos
          </p>
        </div>
        <span className="text-xs text-indigo-600">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="border-t px-3 py-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Rough comparison using a small sample of top comments. Auto mode
            costs ~100 YouTube units (search) + a few for comments. Prefer
            manual IDs when quota is tight.
          </p>

          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={useManual}
              onChange={(e) => setUseManual(e.target.checked)}
            />
            Paste competitor video IDs / URLs (skips search — saves 100 units)
          </label>

          {useManual && (
            <textarea
              className="w-full min-h-[64px] rounded-md border px-2 py-1.5 text-xs"
              placeholder="videoId or youtube.com/watch?v=… (one per line)"
              value={manualPeers}
              onChange={(e) => setManualPeers(e.target.value)}
            />
          )}

          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={loading || (useManual && !manualPeers.trim())}
            onClick={run}
          >
            {loading
              ? "Running benchmark…"
              : result
                ? "Re-run benchmark"
                : "Run benchmark"}
          </Button>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border px-2 py-1.5">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Your score
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {result.sourceHealth?.score ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border px-2 py-1.5">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Peer avg
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {result.peerAvgHealth ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border px-2 py-1.5">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Delta
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {result.deltaVsPeers != null
                      ? `${result.deltaVsPeers > 0 ? "+" : ""}${result.deltaVsPeers}`
                      : "—"}
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium text-slate-800">
                {result.rankLabel}
              </p>

              <p className="text-xs whitespace-pre-wrap text-slate-700 leading-relaxed">
                {result.narrative}
              </p>

              {result.peers.length > 0 && (
                <ul className="space-y-2">
                  {result.peers.map((p) => (
                    <li
                      key={p.videoId}
                      className="rounded-md border bg-slate-50 px-2.5 py-2 text-xs"
                    >
                      <div className="flex justify-between gap-2">
                        <a
                          href={`https://www.youtube.com/watch?v=${p.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-indigo-700 hover:underline line-clamp-1"
                        >
                          {p.title}
                        </a>
                        <span className="tabular-nums shrink-0">
                          {p.health?.score ?? "—"}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 truncate">
                        {p.channelTitle}
                        {p.viewCount != null
                          ? ` · ${p.viewCount.toLocaleString()} views`
                          : ""}
                        {` · sample ${p.sampleSize}`}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        +{p.positivePct}% / −{p.negativePct}% / ~{p.neutralPct}%
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {result.disclaimer} Mode: {result.mode}. Quota used ≈{" "}
                {result.quotaUnitsSpent} units.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BenchmarkPanel;
