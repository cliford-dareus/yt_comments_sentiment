"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type FailedJob = {
  id: string;
  videoInput: string;
  videoId: string | null;
  error: string | null;
  stepLabel: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type Props = {
  jobs: FailedJob[];
};

const FailedJobsPanel = ({ jobs: initial }: Props) => {
  const router = useRouter();
  const [jobs, setJobs] = useState(initial);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!jobs.length) return null;

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    setLocalError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setLocalError(data?.error ?? "Retry failed");
        setRetryingId(null);
        return;
      }

      if (data.alreadyDone && data.chatId) {
        router.push(`/chat/${data.chatId}`);
        return;
      }

      // Poll until terminal
      const poll = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${jobId}`);
          const statusData = await statusRes.json();
          const job = statusData.job;

          if (!job) return;

          if (job.status === "completed" && job.chatId) {
            clearInterval(poll);
            setJobs((prev) => prev.filter((j) => j.id !== jobId));
            setRetryingId(null);
            router.push(`/chat/${job.chatId}`);
            router.refresh();
          }

          if (job.status === "failed") {
            clearInterval(poll);
            setRetryingId(null);
            setJobs((prev) =>
              prev.map((j) =>
                j.id === jobId
                  ? { ...j, error: job.error ?? j.error }
                  : j,
              ),
            );
            setLocalError(job.error ?? "Retry failed again");
          }
        } catch {
          // keep polling
        }
      }, 1200);

      // Safety timeout 3 min
      setTimeout(() => clearInterval(poll), 180_000);
    } catch {
      setLocalError("Retry failed. Please try again.");
      setRetryingId(null);
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-medium">Failed analyses</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-3">
        These jobs didn't finish. Retry when quota or the network is available.
      </p>

      {localError && (
        <p className="text-sm text-red-500 mb-2">{localError}</p>
      )}

      <ul className="space-y-2">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="rounded-lg border border-red-100 bg-red-50/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {job.videoId ?? job.videoInput}
              </p>
              <p className="text-xs text-red-700/90 line-clamp-2 mt-0.5">
                {job.error ?? "Unknown error"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={retryingId === job.id}
              onClick={() => handleRetry(job.id)}
            >
              {retryingId === job.id ? "Retrying…" : "Retry"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FailedJobsPanel;
