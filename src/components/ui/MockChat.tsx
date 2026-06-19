import React from "react";
import { MockMacWindow } from "./MockMacWindow";
import { Hash, Search, Plus, Send, Smile, Paperclip } from "lucide-react";

export function MockChat() {
  return (
    <MockMacWindow title="Team Workspace" className="aspect-[16/10] w-full">
      <div className="flex h-full bg-[#1a1d21] text-zinc-300 text-sm">
        
        {/* Sidebar */}
        <div className="w-56 bg-[#19171d] border-r border-zinc-800 flex flex-col shrink-0">
          <div className="px-4 py-3 font-bold text-white border-b border-zinc-800 flex justify-between items-center">
            Acme Corp
            <Search size={14} className="text-zinc-400" />
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-4 py-1 flex items-center justify-between text-zinc-400 group">
              <span className="text-xs font-semibold">Channels</span>
              <Plus size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer" />
            </div>
            
            <div className="mt-1 flex flex-col">
              <div className="px-4 py-1.5 flex items-center gap-2 hover:bg-[#27242c] cursor-pointer text-zinc-300">
                <Hash size={14} className="text-zinc-500" /> general
              </div>
              <div className="px-4 py-1.5 flex items-center gap-2 bg-[#1164A3] text-white cursor-pointer font-medium">
                <Hash size={14} className="text-white/70" /> engineering
              </div>
              <div className="px-4 py-1.5 flex items-center gap-2 hover:bg-[#27242c] cursor-pointer text-zinc-300">
                <Hash size={14} className="text-zinc-500" /> design-system
              </div>
            </div>
            
            <div className="px-4 py-1 mt-4 flex items-center justify-between text-zinc-400 group">
              <span className="text-xs font-semibold">Direct Messages</span>
              <Plus size={14} className="opacity-0 group-hover:opacity-100 cursor-pointer" />
            </div>
            <div className="mt-1 flex flex-col">
              <div className="px-4 py-1.5 flex items-center gap-2 hover:bg-[#27242c] cursor-pointer text-zinc-300">
                <div className="w-4 h-4 rounded bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">A</div>
                Alex Chen
              </div>
              <div className="px-4 py-1.5 flex items-center gap-2 hover:bg-[#27242c] cursor-pointer text-zinc-300">
                <div className="w-4 h-4 rounded bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">S</div>
                Sarah Smith
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1a1d21]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex flex-col justify-center shrink-0">
            <div className="flex items-center gap-1 font-bold text-white">
              <Hash size={16} className="text-zinc-400" /> engineering
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                M
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white text-[15px]">Mike</span>
                  <span className="text-xs text-zinc-500">11:23 AM</span>
                </div>
                <span className="text-zinc-300 mt-0.5">
                  Hey team, the new API endpoints are deployed to staging.
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded bg-orange-500 text-white flex items-center justify-center font-bold shrink-0">
                S
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white text-[15px]">Sarah</span>
                  <span className="text-xs text-zinc-500">11:25 AM</span>
                </div>
                <span className="text-zinc-300 mt-0.5">
                  Awesome, I'll update the frontend client to point to the new routes.
                </span>
              </div>
            </div>
          </div>

          {/* Input Box */}
          <div className="p-4 shrink-0">
            <div className="border border-zinc-700 bg-[#222529] rounded-lg overflow-hidden flex flex-col focus-within:border-zinc-500 transition-colors">
              <textarea 
                className="w-full bg-transparent text-zinc-300 px-3 py-3 outline-none resize-none placeholder-zinc-500"
                rows={2}
                placeholder="Message #engineering (or dictate here)..."
              />
              <div className="bg-[#222529] px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="p-1.5 hover:bg-zinc-700/50 rounded cursor-pointer text-zinc-400">
                    <Plus size={16} />
                  </div>
                  <div className="p-1.5 hover:bg-zinc-700/50 rounded cursor-pointer text-zinc-400">
                    <Smile size={16} />
                  </div>
                  <div className="p-1.5 hover:bg-zinc-700/50 rounded cursor-pointer text-zinc-400">
                    <Paperclip size={16} />
                  </div>
                </div>
                <div className="p-1.5 bg-[#007a5a] rounded text-white cursor-pointer opacity-50">
                  <Send size={14} />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </MockMacWindow>
  );
}
