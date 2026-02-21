import React from "react";
import { ChatSession, AppMode } from "../types";
import { PlusIcon, ChatIcon, ImageIcon, CodeIcon, MicIcon, TrashIcon } from "./Icons";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: (mode: AppMode) => void;
  onDeleteSession: (id: string) => void;
  closeSidebar?: () => void;  // added close function
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  closeSidebar,
}) => {
  return (
    <aside className="w-full md:w-80 h-auto md:h-full glass border-r border-slate-800 flex flex-col p-4">

      {/* ✕ Close button (mobile only) */}
      {closeSidebar && (
        <button
          className="md:hidden ml-auto mb-4 text-slate-400 hover:text-white"
          onClick={() => closeSidebar()}
        >
          ✕
        </button>
      )}

      {/* Logo / Title */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <span className="text-xl font-bold text-white">N</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">NovaAI</h1>
      </div>

      {/* New session buttons */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        <button 
          onClick={() => onNewSession(AppMode.CHAT)}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
        >
          <ChatIcon />
          <span className="text-xs mt-1 text-slate-400">Chat</span>
        </button>

        <button 
          onClick={() => onNewSession(AppMode.IMAGE)}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
        >
          <ImageIcon />
          <span className="text-xs mt-1 text-slate-400">Image</span>
        </button>

        <button 
          onClick={() => onNewSession(AppMode.CODE)}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
        >
          <CodeIcon />
          <span className="text-xs mt-1 text-slate-400">Code</span>
        </button>

        <button 
          onClick={() => onNewSession(AppMode.VOICE)}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all"
        >
          <MicIcon />
          <span className="text-xs mt-1 text-slate-400">Voice</span>
        </button>
      </div>

      {/* History Sessions */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">History</h3>

        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              activeSessionId === session.id
                ? "bg-slate-800/80 border-slate-700 shadow-xl"
                : "hover:bg-slate-900/50 border border-transparent"
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className={`p-2 rounded-lg ${
              session.mode === AppMode.CHAT ? "bg-cyan-500/10 text-cyan-400" :
              session.mode === AppMode.IMAGE ? "bg-purple-500/10 text-purple-400" :
              session.mode === AppMode.CODE ? "bg-amber-500/10 text-amber-400" :
              "bg-rose-500/10 text-rose-400"
            }`}>
              {session.mode === AppMode.CHAT && <ChatIcon />}
              {session.mode === AppMode.IMAGE && <ImageIcon />}
              {session.mode === AppMode.CODE && <CodeIcon />}
              {session.mode === AppMode.VOICE && <MicIcon />}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate text-slate-200">{session.title}</p>
              <p className="text-[10px] text-slate-500">{new Date(session.updatedAt).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="opacity-0 hover:bg-rose-500/20 hover:text-rose-400 rounded-md transition-all text-slate-600"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="pt-4 border-t border-slate-800 mt-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">JD</div>
          <div>
            <p className="text-sm font-medium">User Account</p>
            <p className="text-[10px] text-slate-500">Free Tier Plan</p>
          </div>
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;