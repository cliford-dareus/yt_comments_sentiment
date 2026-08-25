import { getUser } from "@/lib/auth";
import Sidebar from "@/components/sidebar";
import SidebarItems from "@/components/sidebar-item";
import Navigation from "@/components/ds-navigation";
import { redirect } from "next/navigation";

export default async function ChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    return redirect("/auth");
  }

  return (
    <main className="relative">
      <div className="w-[60px]" />
      <Sidebar>
        <SidebarItems />
      </Sidebar>

      <div className="w-full h-screen">
        <Navigation user={user} />
        <div className="flex h-[calc(100vh-62px)]">
          <div className="w-[60px] min-w-[60px] text-black" />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </main>
  );
}
