import { getUser } from "@/lib/lucia";
import Sidebar from "@/components/sidebar";
import Navigation from "@/components/ds-navigation";
import { House, MessageCircle }  from 'lucide-react'
import SidebarItems from "@/components/sidebar-item";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getUser();

  if (!user) {
    return;
  }

  return (
    <main className="relative flex h-screen overflow-hidden">
      {/* <div className="w-[60px]" /> */}
      <Sidebar>
          <SidebarItems />
      </Sidebar>

      <div className="w-full">
        <Navigation user={user} />
        <div className="flex">
          <div className="w-[207px] min-w-[60px] "></div>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </main>
  );
}
