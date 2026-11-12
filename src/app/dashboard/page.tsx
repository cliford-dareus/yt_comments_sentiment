import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateProjectDialog from "./_components/create-project-dialog";
import ChannelScanDialog from "./_components/channel-scan-dialog";
import FailedJobsPanel from "./_components/failed-jobs-panel";
import getRecentChats from "./_actions/get-recent-chats";
import { listFailedJobs } from "@/lib/analysis-job";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

const Dashboard = async () => {
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  const [chats, failedJobs] = await Promise.all([
    getRecentChats(user.id),
    listFailedJobs(user.id, 8),
  ]);

  const firstName =
    user.fullName?.trim().split(/\s+/)[0] ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-sm text-zinc-500">{BRAND.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-zinc-500">
          Analyze a video or scan a channel to see how your audience is
          reacting.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            Single video
          </h2>
          <p className="mt-1.5 mb-5 text-sm leading-relaxed text-zinc-500">
            Deep-dive one video: sentiment labels, themes, reply drafts, and
            niche benchmark.
          </p>
          <CreateProjectDialog />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            Channel trends
          </h2>
          <p className="mt-1.5 mb-5 text-sm leading-relaxed text-zinc-500">
            Compare comment climate across recent uploads — trends over time,
            not just one video.
          </p>
          <ChannelScanDialog />
        </div>
      </div>

      <FailedJobsPanel
        jobs={failedJobs.map((j) => ({
          ...j,
          createdAt: j.createdAt?.toISOString?.() ?? String(j.createdAt),
          updatedAt: j.updatedAt?.toISOString?.() ?? String(j.updatedAt),
        }))}
      />

      <section className="mt-10 pb-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900">
            Recent projects
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-zinc-500">
            <Link href="/chat">View all</Link>
          </Button>
        </div>

        {chats && chats.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {chats.slice(0, 4).map((card) => (
              <Link
                key={card.id}
                href={`/chat/${card.id}`}
                className="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              >
                <span className="line-clamp-2 text-sm font-medium text-zinc-900">
                  {card.fileName || "Untitled project"}
                </span>
                <span className="mt-4 text-xs font-medium text-zinc-400 transition group-hover:text-zinc-700">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">
              No projects yet. Analyze a video to get started.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
