import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateProjectDialog from "./_components/create-project-dialog";
import FailedJobsPanel from "./_components/failed-jobs-panel";
import getRecentChats from "./_actions/get-recent-chats";
import { listFailedJobs } from "@/lib/analysis-job";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const Dashboard = async () => {
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  const [chats, failedJobs] = await Promise.all([
    getRecentChats(user.id),
    listFailedJobs(user.id, 8),
  ]);

  return (
    <div className="pt-16 flex-1 p-4 md:max-w-6xl md:mx-auto h-[calc(100vh-62px)] overflow-y-auto">
      <h1 className="text-3xl font-medium">Welcome Youtube!</h1>
      <div className="mt-4 px-4 py-8 border border-dashed rounded-md flex justify-center items-center">
        <div className="flex flex-col items-center">
          <h2 className="font-medium text-xl">Sentiment</h2>
          <p className="mb-4">Get started by creating a new project.</p>
          <CreateProjectDialog />
        </div>
      </div>

      <FailedJobsPanel
        jobs={failedJobs.map((j) => ({
          ...j,
          createdAt: j.createdAt?.toISOString?.() ?? String(j.createdAt),
          updatedAt: j.updatedAt?.toISOString?.() ?? String(j.updatedAt),
        }))}
      />

      <div className="mt-8 pb-12">
        <h2 className="text-xl">Recent Chats</h2>

        <div className="w-full mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {chats?.slice(0, 4).map((card) => (
            <div
              className="min-h-[180px] bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] rounded-xl p-6 border flex flex-col justify-between"
              key={card.id}
            >
              <span className="text-sm truncate">{card.fileName}</span>
              <Button asChild className="mt-4 w-fit">
                <Link href={`/chat/${card.id}`}>Chat</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
