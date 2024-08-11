import { getUser } from "@/lib/lucia";
import { redirect } from "next/navigation";
import CreateProjectDialog from "./_components/create-project-dialog";
import getRecentChats from "./_actions/get-recent-chats";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const Dashboard = async () => {
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  const chats = await getRecentChats(user.id);

  return (
    <div className="pt-16 flex-1 p-4 md:max-w-6xl md:mx-auto h-[calc(100vh-62px)]">
      <h1 className="text-3xl font-medium">Welcome Youtube!</h1>
      <div className="mt-4 px-4 py-8 border border-dashed rounded-md flex justify-center items-center">
        <div className="flex flex-col items-center">
          <h2 className="font-medium text-xl">Sentiment</h2>
          <p className="mb-4">Get started by creating a new project.</p>
          <CreateProjectDialog />
        </div>
      </div>

      <div className="mt-8 h-[500px]">
        <h2 className="text-xl">Recent Chats</h2>

        <div className="w-full mt-4 grid grid-cols-4 gap-4">
          {chats?.map((card) => (
            <div
              className="h-[300px] bg-gray-50 relative group/card  dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] rounded-xl p-6 border"
              key={card.id}
            >
              <span>{card.fileName}</span>
              <Button>
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
