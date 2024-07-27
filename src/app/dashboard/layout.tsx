import Link from "next/link"
import Sidebar from "./_components/sidebar"
import Navigation from "./_components/navigation"
import { getUser } from "@/lib/lucia"
import SidebarItems from "./_components/sidebar-item"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [{id : 1, text: '', path: '', icon: ''}]

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getUser();
  
  if(!user){
    return
  }
  
  return (
    <main className="relative">
      <div className="w-[60px]" />
      <Sidebar>
        {sidebarItems.map((item) => (
          <SidebarItems key={item.id} text={item.text} path={item.path} icon={item.icon}/>
        ))}
      </Sidebar>    
      <div className="w-full">
        <Navigation user={ user} />
        <div className="flex">
          <div className="w-[60px] min-w-[60px] "></div>
          <div className="flex-1">
              {children}
          </div>
        </div>
      </div>
    </main>
  )
};