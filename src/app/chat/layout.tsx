import { getUser } from "@/lib/lucia";
import Sidebar from "@/components/sidebar";
import SidebarItems from "@/components/sidebar-item";
import Navigation from "@/components/ds-navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { id: 1, text: "Dashboard", path: "/dashboard", icon: "" },
  { id: 2, text: "Chats", path: "/chat", icon: "" },
];

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
        {sidebarItems.map((item) => (
          <SidebarItems
            key={item.id}
            text={item.text}
            path={item.path}
            icon={item.icon}
          />
        ))}
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
