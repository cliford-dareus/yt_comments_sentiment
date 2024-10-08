import { useParams, usePathname, useRouter } from "next/navigation";
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";

type SidebarContextProps = {
  expanded: boolean;
  active: string;
  alert: boolean;
  setAlert: React.Dispatch<React.SetStateAction<boolean>>;
  setActive: React.Dispatch<React.SetStateAction<string>>;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined,
);

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [alert, setAlert] = useState(false);
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    setActive(pathname.slice(1));
    if (pathname.slice(1) === "dashboard") {
      setExpanded(true);
    }
  }, [pathname]);

  return (
    <SidebarContext.Provider
      value={{ expanded, setExpanded, active, setActive, alert, setAlert }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
