import React from "react";
import { MockMacWindow } from "./MockMacWindow";
import { FileCode2, Plus, History, X, Command, MessageSquare, Files, Search, GitBranch, Play, Terminal, MoreHorizontal, Settings, ChevronRight, FileJson, Beaker } from "lucide-react";

export function MockIDE() {
  return (
    <MockMacWindow title="prime_checker.rs" className="aspect-[16/10] w-full">
      <div className="flex h-full bg-[#181818] text-[#cccccc] font-sans text-[13px] select-none">
        
        {/* Code Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tabs */}
          <div className="flex bg-[#181818] shrink-0 border-b border-[#2b2b2b] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#1e1e1e] border-t border-t-blue-500 border-r border-r-[#2b2b2b] text-[13px] text-[#e2c08d] flex items-center gap-2 cursor-pointer shadow-sm min-w-[140px] justify-between">
              <div className="flex items-center gap-2"><FileCode2 size={14} className="text-[#519aba]" /> prime_checker.rs</div>
              <X size={14} className="text-[#858585] hover:text-white" />
            </div>
            <div className="px-4 py-2.5 bg-[#181818] border-r border-r-[#2b2b2b] text-[13px] text-[#858585] flex items-center gap-2 cursor-pointer hover:bg-[#1e1e1e] transition-colors">
              <FileCode2 size={14} className="text-[#519aba]" /> main.rs
            </div>
          </div>
          
          {/* Breadcrumbs */}
          <div className="px-4 py-1 flex items-center gap-1 text-[#858585] text-[12px] border-b border-[#2b2b2b] bg-[#1e1e1e]">
            <span>draftmic</span> <ChevronRight size={12}/> <span>src</span> <ChevronRight size={12}/> <span>prime_checker.rs</span>
          </div>

          {/* Code */}
          <div className="flex-1 p-4 overflow-hidden relative flex font-mono text-[14px] leading-relaxed">
            <div className="flex flex-col text-right pr-6 text-[#6e7681] select-none shrink-0 border-r border-[#404040]">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span>
            </div>
            <div className="flex flex-col pl-4 text-[#d4d4d4]">
              <div className="flex"><span className="text-[#569cd6]">fn</span>&nbsp;<span className="text-[#dcdcaa]">is_prime</span>(n: <span className="text-[#4ec9b0]">u32</span>) -&gt; <span className="text-[#4ec9b0]">bool</span> {"{"}</div>
              <div className="flex pl-4"><span className="text-[#c586c0]">if</span> n &lt;= <span className="text-[#b5cea8]">1</span> {"{"}</div>
              <div className="flex pl-8"><span className="text-[#c586c0]">return</span> <span className="text-[#569cd6]">false</span>;</div>
              <div className="flex pl-4">{"}"}</div>
              <div className="flex pl-4"><span className="text-[#c586c0]">for</span> i <span className="text-[#c586c0]">in</span> <span className="text-[#b5cea8]">2</span>..=(n <span className="text-[#569cd6]">as</span> <span className="text-[#4ec9b0]">f64</span>).<span className="text-[#dcdcaa]">sqrt</span>() <span className="text-[#569cd6]">as</span> <span className="text-[#4ec9b0]">u32</span> {"{"}</div>
              <div className="flex pl-8"><span className="text-[#c586c0]">if</span> n % i == <span className="text-[#b5cea8]">0</span> {"{"}</div>
              <div className="flex pl-12"><span className="text-[#c586c0]">return</span> <span className="text-[#569cd6]">false</span>;</div>
              <div className="flex pl-8">{"}"}</div>
              <div className="flex pl-4">{"}"}</div>
              <div className="flex pl-4"><span className="text-[#569cd6]">true</span></div>
              <div className="flex">{"}"}</div>
            </div>
          </div>
        </div>

        {/* Right: AI Chat (Cursor Style) */}
        <div className="w-[340px] bg-[#212121] flex flex-col shrink-0 border-l border-[#2b2b2b]">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2b2b2b] shrink-0">
            <span className="text-[11px] font-bold text-white tracking-wider">CHAT</span>
            <div className="flex items-center gap-3 text-[#cccccc]">
              <Plus size={14} className="cursor-pointer hover:text-white" />
              <History size={14} className="cursor-pointer hover:text-white" />
              <X size={14} className="cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="bg-[#2d2d2d] border border-[#3c3c3c] p-3 rounded-md text-[13px] text-white">
                <div className="flex items-center gap-2 mb-2 text-[#858585] text-[11px] font-mono">
                  <FileCode2 size={12}/> prime_checker.rs
                </div>
                can you name this file and explain the logic?
              </div>
              <div className="text-[13px] text-[#cccccc] leading-relaxed pt-2">
                Based on the code, I would suggest naming this file <code className="bg-[#2d2d2d] px-1.5 py-0.5 rounded text-[#dcdcaa] font-mono text-[12px]">prime_checker.rs</code>. This name accurately reflects the purpose of the code, which is to efficiently check whether a given number is prime or not using square root iteration.
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 shrink-0 bg-[#212121]">
            <div className="bg-[#2d2d2d] border border-[#3c3c3c] rounded-md focus-within:border-[#007acc] transition-colors flex flex-col shadow-inner">
              <textarea 
                className="w-full bg-transparent text-[#cccccc] text-[13px] p-3 outline-none resize-none placeholder-[#858585] font-sans"
                rows={3}
                placeholder="Ask followup... (or dictate here)"
              />
              <div className="px-3 py-2 flex items-center justify-between border-t border-[#3c3c3c] bg-[#2d2d2d] rounded-b-md">
                <div className="flex items-center gap-2 text-[#858585] text-[11px]">
                  <span className="flex items-center justify-center border border-[#4c4c4c] w-4 h-4 rounded text-[10px]"><Command size={10}/></span>
                  <span className="flex items-center justify-center border border-[#4c4c4c] w-4 h-4 rounded text-[10px]">L</span> to chat
                </div>
                <MessageSquare size={14} className="text-[#858585]" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </MockMacWindow>
  );
}
