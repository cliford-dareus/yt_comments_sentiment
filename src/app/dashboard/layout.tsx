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
    <main className="relative flex">
      <div className="w-[60px]" />
      <Sidebar>
        {sidebarItems.map((item) => (
          <SidebarItems key={item.id} text={item.text} path={item.path} icon={item.icon}/>
        ))}
      </Sidebar>    
      <div className="w-full h-full">
        <Navigation user={ user} />
        <div className="flex">
          <div className="w-[60px] min-w-[60px] h-screen"></div>
          <div className="flex-1 p-4 md:container md:mx-auto">
            <div className="">
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
};