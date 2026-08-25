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
import YtUploadForm, { UploadSchema } from "./upload-form";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

type JobSnapshot = {
  id: string;
  status: string;
  progress: number;
  stepLabel: string | null;
  error: string | null;
  chatId: string | null;
  commentCount: number | null;
};

const CreateProjectDialog = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => clearPoll(), []);

  const pollJob = (jobId: string) => {
    clearPoll();

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();

        if (!res.ok || !data.job) {
          return;
        }

        const job = data.job as JobSnapshot;
        setProgress(job.progress ?? 0);
        setStatus(job.stepLabel ?? job.status);

        if (job.status === "completed" && job.chatId) {
          clearPoll();
          setStatus("Redirecting…");
          setProgress(100);
          router.push(`/chat/${job.chatId}`);
          router.refresh();
          return;
        }

        if (job.status === "failed") {
          clearPoll();
          setLoading(false);
          setError(job.error ?? "Analysis failed");
        }
      } catch (err) {
        console.error("poll error", err);
      }
    }, 1000);
  };

  const startJobRun = async (jobId: string) => {
    setLastJobId(jobId);
    setError(null);
    setLoading(true);
    setProgress(0);
    setStatus("Queued…");

    void fetch(`/api/jobs/${jobId}/run`, { method: "POST" }).catch((err) =>
      console.error("run trigger failed", err),
    );

    pollJob(jobId);
  };

  const postComments = async (data: z.infer<typeof UploadSchema>) => {
    setError(null);
    setLoading(true);
    setProgress(0);
    setStatus("Starting analysis…");

    try {
      const startRes = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: data.videoId }),
      });

      const startData = await startRes.json();

      if (!startRes.ok || !startData.jobId) {
        setError(startData?.error ?? "Could not start analysis");
        setLoading(false);
        return;
      }

      await startJobRun(startData.jobId as string);
    } catch (err) {
      console.error("Error creating project:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
      clearPoll();
    }
  };

  const handleRetry = async () => {
    if (!lastJobId) return;

    setError(null);
    setLoading(true);
    setProgress(0);
    setStatus("Retrying…");

    try {
      const res = await fetch(`/api/jobs/${lastJobId}/retry`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Retry failed");
        setLoading(false);
        return;
      }

      if (data.alreadyDone && data.chatId) {
        router.push(`/chat/${data.chatId}`);
        return;
      }

      // Also nudge /run in case background void was dropped
      void fetch(`/api/jobs/${lastJobId}/run`, { method: "POST" }).catch(
        () => {},
      );

      pollJob(lastJobId);
    } catch (err) {
      console.error("retry error", err);
      setError("Retry failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          clearPoll();
          setLoading(false);
          setStatus("");
          setProgress(0);
          // Keep lastJobId + error so user can reopen and retry
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a new project</DialogTitle>
          <DialogDescription>
            Enter a YouTube video URL or ID to analyze the comment section.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{status || "Working…"}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(progress, 3)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              You can leave this open — we'll redirect when insights are
              ready.
            </p>
          </div>
        ) : (
          <>
            <YtUploadForm postComments={postComments} />
            {error && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-red-500">{error}</p>
                {lastJobId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleRetry}
                  >
                    Retry analysis
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
