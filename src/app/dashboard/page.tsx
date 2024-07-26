import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/lucia"
import { redirect } from "next/navigation";
import YtUploadForm from "./_components/upload-form";

const Dashboard = async () => {
  const user = await getUser();
  if (!user) {
    return redirect('/auth')
  }

  return (
    <div className="pt-16">
      <h1 className="text-3xl font-medium">Welcome Youtube!</h1>
      <YtUploadForm />
      
      <div className="mt-8">
        <h2 className="text-xl">Recent Chats</h2>
        <div></div>
      </div>
    </div>
  )
};

export default Dashboard;