import React from "react";
import { MockMacWindow } from "./MockMacWindow";
import { Paperclip, Send, Image, MoreHorizontal, User, Inbox, Send as SendIcon, FileEdit, Star, Clock, Trash2, Bold, Italic, Link2, List, ListOrdered } from "lucide-react";

export function MockEmailComposer() {
  return (
    <MockMacWindow title="Superhuman Email - Compose" className="aspect-[16/10] w-full">
      <div className="flex h-full bg-[#141517] text-zinc-300 font-sans">
        
        {/* Composer Area */}
        <div className="flex-1 flex flex-col bg-[#141517] items-center">
          
          <div className="w-full max-w-4xl flex-1 flex flex-col relative">
            
            {/* Header Fields */}
            <div className="flex flex-col px-10 pt-8 pb-2 shrink-0">
              <div className="flex items-center py-3 group border-b border-[#2a2b2f]">
                <span className="text-zinc-500 text-sm w-16 font-medium group-focus-within:text-[#3b82f6] transition-colors">To</span>
                <div className="flex items-center gap-2 bg-[#202124] border border-[#303136] rounded-full px-2.5 py-1">
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                    E
                  </div>
                  <span className="text-sm text-zinc-200 font-medium">Emily Chen</span>
                  <X size={12} className="text-zinc-500 hover:text-zinc-300 ml-1 cursor-pointer" />
                </div>
              </div>
              
              <div className="flex items-center py-3 group border-b border-[#2a2b2f]">
                <span className="text-zinc-500 text-sm w-16 font-medium group-focus-within:text-[#3b82f6] transition-colors">Subject</span>
                <input 
                  type="text" 
                  className="flex-1 bg-transparent text-zinc-100 text-lg font-semibold outline-none placeholder-zinc-600" 
                  defaultValue="Q3 Project Review & Next Steps"
                />
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 relative flex flex-col px-10 py-4">
              <textarea 
                className="w-full h-full bg-transparent text-[15px] text-zinc-300 outline-none resize-none placeholder-zinc-600 leading-relaxed font-sans"
                placeholder="Type or dictate your email here..."
                defaultValue={"Hi Emily,\n\nI hope you're having a great week.\n\nLet's sync up on the latest designs.\n\nBest,\nRon"}
              />
            </div>

            {/* Bottom Toolbar */}
            <div className="px-10 py-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 bg-[#1a1b1e] rounded-lg border border-[#2a2b2f] p-1 shadow-sm">
                <button className="p-1.5 hover:bg-[#2a2b2f] rounded text-zinc-400 hover:text-zinc-200 transition-colors"><Bold size={16} /></button>
                <button className="p-1.5 hover:bg-[#2a2b2f] rounded text-zinc-400 hover:text-zinc-200 transition-colors"><Italic size={16} /></button>
                <div className="w-px h-4 bg-[#303136] mx-1" />
                <button className="p-1.5 hover:bg-[#2a2b2f] rounded text-zinc-400 hover:text-zinc-200 transition-colors"><Link2 size={16} /></button>
                <button className="p-1.5 hover:bg-[#2a2b2f] rounded text-zinc-400 hover:text-zinc-200 transition-colors"><List size={16} /></button>
                <button className="p-1.5 hover:bg-[#2a2b2f] rounded text-zinc-400 hover:text-zinc-200 transition-colors"><ListOrdered size={16} /></button>
              </div>
              
              <div className="flex items-center gap-4">
                <Paperclip size={18} className="text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors" />
                <Image size={18} className="text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors mr-4" />
                <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                  Send <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockMacWindow>
  );
}
// We need to import X from lucide-react since we used it.
const X = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
