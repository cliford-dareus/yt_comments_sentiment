"use client"

import { cn } from "@/lib/utils";


type BackgroundType = {
  children?: any;
   classnames?: string;
   containerClassName?: string;
   colors?: string[];
   waveWidth?: number;
   backgroundFill?: string;
   blur?: number;
   speed?: "slow" | "fast";
   waveOpacity?: number;
   [key: string]: any;
}

const Background = ({children, classnames}: BackgroundType)  => {
  
  return (
    <div className="h-screen">
      <video src={require("../../public/rings.mp4")}  className="fixed inset-0 w-full h-full object-cover z-0" autoPlay loop/>
      <div className={cn(classnames, "relative z-10 w-full h-full")}>
        {children}
      </div>
    </div>
  )
}


export default Background;