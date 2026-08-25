"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ChannelScanDialog = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channelInput, setChannelInput] = useState("");
  const [maxVideos, setMaxVideos] = useState(5);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => clearPoll(), []);

  const poll = (scanId: string) => {
    clearPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/channel-scan/${scanId}`);
        const data = await res.json();
        if (!res.ok || !data.scan) return;

        setProgress(data.scan.progress ?? 0);
        setStatus(data.scan.stepLabel ?? data.scan.status);

        if (data.scan.status === "completed") {
          clearPoll();
          setLoading(false);
          setOpen(false);
          router.push(`/channel/${scanId}`);
          router.refresh();
        }

        if (data.scan.status === "failed") {
          clearPoll();
          setLoading(false);
          setError(data.scan.error ?? "Channel scan failed");
        }
      } catch {
        // keep polling
      }
    }, 1200);
  };

  const start = async () => {
    if (!channelInput.trim()) return;
    setError(null);
    setLoading(true);
    setProgress(0);
    setStatus("Starting…");

    try {
      const res = await fetch("/api/channel-scan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelInput: channelInput.trim(),
          maxVideos,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.scanId) {
        setError(data?.error ?? "Could not start scan");
        setLoading(false);
        return;
      }

      void fetch(`/api/channel-scan/${data.scanId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxVideos }),
      }).catch(() => {});

      poll(data.scanId);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          clearPoll();
          setLoading(false);
          setError(null);
          setStatus("");
          setProgress(0);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Channel trends</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Channel sentiment trends</DialogTitle>
          <DialogDescription>
            Analyze the last N public uploads (small top-comment samples). ~1
            YouTube unit per video + a few for channel lookup.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{status || "Working…"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${Math.max(progress, 3)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700">
                Channel URL, @handle, or UC id
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="https://youtube.com/@channel or @handle"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">
                Videos to include (2–8)
              </label>
              <input
                type="number"
                min={2}
                max={8}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={maxVideos}
                onChange={(e) =>
                  setMaxVideos(
                    Math.min(8, Math.max(2, Number(e.target.value) || 5)),
                  )
                }
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!channelInput.trim()}
              onClick={start}
            >
              Scan channel
            </Button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChannelScanDialog;
