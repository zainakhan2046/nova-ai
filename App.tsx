import React, { useState, useEffect, useRef } from "react";
import { AppMode, ChatSession, Message } from "./types";
import { storageService } from "./services/storageService";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import ImageGenerator from "./components/ImageGenerator";
import VoiceInterface from "./components/VoiceInterface";

const NOVA_SYSTEM_INSTRUCTIONS = `
You are NovaAI, the response engine for a premium, futuristic SaaS platform. ...
`;

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(storageService.getSessions());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ⟶ Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSession = sessions.find((s) => s.id === activeId);

  useEffect(() => {
    if (sessions.length > 0 && !activeId) {
      setActiveId(sessions[0].id);
    }
  }, [sessions, activeId]);

  const handleNewSession = (mode: AppMode) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `${mode} Session`,
      mode,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setActiveId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    storageService.saveSessions(filtered);
    if (activeId === id) {
      setActiveId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      type: 'text',
    };

    const updated = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage],
      updatedAt: Date.now(),
    };

    setSessions(sessions.map((s) => (s.id === activeId ? updated : s)));
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    let modelResponse = '';
    try {
      await apiService.chatStream(
        updated.messages,
        NOVA_SYSTEM_INSTRUCTIONS,
        (chunk) => {
          modelResponse += chunk;
          const modelMsg: Message = {
            id: 'temp-' + Date.now(),
            role: 'model',
            content: modelResponse,
            timestamp: Date.now(),
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeId
                ? {
                    ...s,
                    messages: [
                      ...s.messages.filter((m) => m.id !== 'temp-' + Date.now()),
                      modelMsg,
                    ],
                  }
                : s
            )
          );
        },
        abortControllerRef.current.signal
      );

      const finalMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: modelResponse,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages: [...s.messages.filter((m) => !m.id.startsWith('temp-')), finalMsg],
                updatedAt: Date.now(),
              }
            : s
        )
      );

      storageService.saveSessions(sessions);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans overflow-x-hidden">

      {/* ◀️ SIDEBAR SLIDE PANEL */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-slate-950 transition-transform transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 md:w-80 w-[70%]`}
      >
        <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
<Sidebar
          sessions={sessions}
          activeSessionId={activeId}
          onSelectSession={(id) => {
            setActiveId(id);
            setSidebarOpen(false);
          }}
          onNewSession={(mode) => {
            handleNewSession(mode);
            setSidebarOpen(false);
          }}
          onDeleteSession={handleDeleteSession}
          closeSidebar={() => setSidebarOpen(false)}  // close button prop
        />
      </div>

      {/* overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* HEADER */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 glass sticky top-0 z-30">

          {/* hamburger (mobile only) */}
          <button
            className="md:hidden text-slate-400 hover:text-cyan-400"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* title */}
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-slate-700"}`}></div>
            <h2 className="text-xs md:text-sm font-semibold uppercase text-slate-400">
              {activeSession ? `${activeSession.mode} Workspace` : "New Workspace"}
            </h2>
          </div>

        </header>

        {/* contents */}
        <div className="flex-1 overflow-hidden">
          {activeSession ? (
            activeSession.mode === AppMode.IMAGE ? (
              <ImageGenerator />
            ) : activeSession.mode === AppMode.VOICE ? (
              <VoiceInterface />
            ) : (
              <ChatInterface
                messages={activeSession.messages}
                onSendMessage={handleSendMessage}
                onStop={stopGeneration}
                isLoading={isLoading}
                mode={activeSession.mode}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center">
                <span className="text-3xl">+</span>
              </div>
              <p className="text-sm">Select a tool from the sidebar to begin</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;