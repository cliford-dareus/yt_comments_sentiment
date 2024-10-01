"use client";

import { useSidebar } from "@/components/provider/sidebar-provider";
import { useRouter } from "next/navigation";
import { House, MessageCircle } from "lucide-react";

type Props = {
  text: string;
  icon: any;
  path: string;
};

interface sidebarType {
  id: number;
  text: string;
  path: string;
  icon: JSX.Element;
}

export const SIDEBARITEMS: sidebarType[] = [
  { id: 1, text: "Dashboard", path: "/dashboard", icon: <House size={24}/> },
  { id: 2, text: "Chat", path: "/chat", icon: <MessageCircle size={24}/> },
];

const SidebarItems = () => {
  return (
    <>
      {SIDEBARITEMS.map((item) => (
        <SidebarLink
          key={item.id}
          text={item.text}
          path={item.path}
          icon={item.icon}
        />
      ))}
    </>
  );
};

const SidebarLink = ({ text, path, icon }: Props) => {
  const route = useRouter();
  const { expanded, active, setActive, alert } = useSidebar();

  return (
    <div className="">
      <li
        onClick={() => {
          route.push(`${path.toLowerCase()}`);
          setActive(text.toLocaleLowerCase());
        }}
        className={`
         relative flex items-center py-2 px-3 my-1
         font-medium rounded-md cursor-pointer
         transition-colors group
         ${
           active === text.toLocaleLowerCase()
             ? "bg-gradient-to-tr from-indigo-200 to-indigo-100 text-indigo-800"
             : "hover:bg-indigo-50 text-gray-600"
         }
     `}
      >
        {icon}
        <span
          className={`overflow-hidden transition-all text-black ${
            expanded ? "w-52 ml-3" : "w-0"
          }`}
        >
          {text}
        </span>
        {alert && (
          <div
            className={`absolute right-2 w-2 h-2 rounded bg-indigo-400 ${
              expanded ? "" : "top-2"
            }`}
          />
        )}

        {!expanded && (
          <div
            className={`
           absolute left-full rounded-md px-2 py-1 ml-6
           bg-indigo-100 text-indigo-800 text-sm
           invisible opacity-20 -translate-x-3 transition-all
           group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
       `}
          >
            {text}
          </div>
        )}
      </li>
    </div>
  );
};

export default SidebarItems;
