import { getUser } from "@/lib/lucia";
import Sidebar from "@/components/sidebar";
import SidebarItems from "@/components/sidebar-item";
import Navigation from "@/components/ds-navigation";

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
    <main className="relative">
      <div className="w-[60px]" />
      <Sidebar>
        <SidebarItems />
      </Sidebar>

      <div className="w-full h-screen">
        <Navigation user={user} />
        <div className="flex h-[calc(100vh-62px)]">
          <div className="w-[60px] min-w-[60px] text-black">Helllo</div>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </main>
  );
}
