import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/lucia"
import { redirect } from "next/navigation";
import YtUploadForm from "./_components/upload-form";
import { drive } from "googleapis/build/src/apis/drive";

const Dashboard = async () => {
  const user = await getUser();
  
  if (!user) {
    return redirect('/auth')
  }

  return (
    <div className="pt-16 flex-1 p-4 md:max-w-6xl md:mx-auto">
      <h1 className="text-3xl font-medium">Welcome Youtube!</h1>
      <div className="mt-4">
        <YtUploadForm />
      </div>

      <div className="mt-8">
        <h2 className="text-xl">Recent Chats</h2>

        <div className="w-full mt-4 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(card => (
            <div className="h-[300px] bg-gray-50 relative group/card  dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] rounded-xl p-6 border" key={card}>{card}</div>
          ))}
        </div>
      </div>
    </div>
  )
};

export default Dashboard;