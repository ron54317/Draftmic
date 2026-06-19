import React from "react";
import { motion } from "framer-motion";

interface MockMacWindowProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function MockMacWindow({ children, title, className = "" }: MockMacWindowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`w-full h-full flex flex-col rounded-xl overflow-hidden border border-zinc-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] bg-zinc-950 ${className}`}
    >
      {/* Mac Traffic Lights & Titlebar */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 shrink-0 relative">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        {title && (
          <div className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-zinc-400">
            {title}
          </div>
        )}
      </div>
      
      {/* App Content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </motion.div>
  );
}
