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
    <div className="">
      <YtUploadForm />
    </div>
  )
};

export default Dashboard;