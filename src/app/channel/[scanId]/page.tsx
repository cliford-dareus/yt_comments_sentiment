import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChannelScan } from "@/lib/channel-scan";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ChannelScanPage = async ({
  params,
}: {
  params: { scanId: string };
}) => {
  const user = await getUser();
  if (!user) return redirect("/auth");

  const data = await getChannelScan(params.scanId, user.id);
  if (!data) return redirect("/dashboard");

  const { scan, videos } = data;

  const scores = videos
    .map((v) => v.healthScore)
    .filter((s): s is number => s != null);
  const avg =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  const best = videos.reduce<
    (typeof videos)[0] | null
  >((acc, v) => {
    if (v.healthScore == null) return acc;
    if (!acc || (acc.healthScore ?? -1) < v.healthScore) return v;
    return acc;
  }, null);
  const worst = videos.reduce<
    (typeof videos)[0] | null
  >((acc, v) => {
    if (v.healthScore == null) return acc;
    if (!acc || (acc.healthScore ?? 999) > v.healthScore) return v;
    return acc;
  }, null);

  const maxBar = Math.max(100, ...scores, 1);

  return (
    <div className="pt-16 flex-1 p-4 md:max-w-4xl md:mx-auto min-h-[calc(100vh-62px)] pb-16">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Channel trends
          </p>
          <h1 className="text-2xl font-semibold mt-0.5">
            {scan.channelTitle ?? scan.channelInput}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {scan.videoCount ?? videos.length} recent uploads · sample of top
            comments only
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      {scan.status === "failed" && (
        <p className="mt-4 text-sm text-red-500">{scan.error}</p>
      )}

      {scan.status !== "completed" && scan.status !== "failed" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Scan in progress ({scan.progress}%): {scan.stepLabel}
        </p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border px-3 py-2">
          <p className="text-[11px] uppercase text-muted-foreground">Avg health</p>
          <p className="text-2xl font-semibold tabular-nums">{avg ?? "—"}</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <p className="text-[11px] uppercase text-muted-foreground">Best</p>
          <p className="text-sm font-medium line-clamp-2 mt-1">
            {best?.title ?? "—"}
            {best?.healthScore != null ? ` (${best.healthScore})` : ""}
          </p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <p className="text-[11px] uppercase text-muted-foreground">Weakest</p>
          <p className="text-sm font-medium line-clamp-2 mt-1">
            {worst?.title ?? "—"}
            {worst?.healthScore != null ? ` (${worst.healthScore})` : ""}
          </p>
        </div>
      </div>

      {scan.narrative && (
        <div className="mt-6 rounded-lg border bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Trend brief
          </p>
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-800">
            {scan.narrative}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-medium mb-3">Health over recent uploads</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Left = older · Right = newer
        </p>

        <div className="flex items-end gap-2 h-40 border-b border-slate-200 pb-1">
          {videos.map((v) => {
            const score = v.healthScore ?? 0;
            const h = Math.max(4, Math.round((score / maxBar) * 140));
            const color =
              score >= 70
                ? "bg-emerald-500"
                : score >= 50
                  ? "bg-amber-500"
                  : "bg-red-500";
            return (
              <div
                key={v.id}
                className="flex-1 flex flex-col items-center gap-1 min-w-0"
                title={`${v.title}: ${score}`}
              >
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {v.healthScore ?? "—"}
                </span>
                <div
                  className={`w-full max-w-[48px] rounded-t ${color}`}
                  style={{ height: h }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <h2 className="text-lg font-medium mb-2">Videos</h2>
        {videos.map((v) => (
          <div
            key={v.id}
            className="rounded-lg border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2"
          >
            <div className="flex-1 min-w-0">
              <a
                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-indigo-700 hover:underline line-clamp-1"
              >
                {v.title}
              </a>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {v.publishedAt
                  ? new Date(v.publishedAt).toLocaleDateString()
                  : ""}
                {v.viewCount != null
                  ? ` · ${v.viewCount.toLocaleString()} views`
                  : ""}
                {` · sample ${v.sampleSize ?? 0}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0">
              <span className="text-emerald-700">+{v.positivePct ?? 0}%</span>
              <span className="text-slate-500">~{v.neutralPct ?? 0}%</span>
              <span className="text-red-700">−{v.negativePct ?? 0}%</span>
              <span className="font-semibold tabular-nums w-8 text-right">
                {v.healthScore ?? "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
        Rough trend view from top-comment samples per video — not a full comment
        census. Use single-video projects for deep dives.
      </p>
    </div>
  );
};

export default ChannelScanPage;
