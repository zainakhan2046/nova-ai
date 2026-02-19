import React, { useState, useEffect, useRef } from "react";
import { AppMode, ChatSession, Message } from "./types";
import { storageService } from "./services/storageService";
import { apiService } from "./services/apiService";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import ImageGenerator from "./components/ImageGenerator";
import VoiceInterface from "./components/VoiceInterface";


const NOVA_SYSTEM_INSTRUCTIONS = `
You are NovaAI, the response engine for a premium, futuristic SaaS platform. 
Follow these rules strictly:

1. FORMATTING:
- Never use ### or any markdown headers.
- Never use ** for bold or any markdown bold syntax.
- Keep formatting clean and minimal.
- Use bullet points (•) for lists.
- Use numbers (1. 2. 3.) for steps.
- Use clean spacing between sections.

2. CONTENT & STYLE:
- Professional, direct tone.
- No extra explanations or disclaimers.
- No repetition.
- Answer only what is asked.
- Optimize for streaming (short, readable chunks).
- Use relevant emojis intelligently but avoid overusing them.

3. GREETING RULE:
- If the user provides any greeting (e.g., "hi", "hello", "hey", "good morning"), respond ONLY with: "Hi 👋 How can I help you today?"
- No other text, no explanation.

4. CODE MODE:
- If explaining code, use:
  🧠 for explanation
  ⚡ for optimization
  🛠 for fixes
- Use bullet points and keep it concise.

5. RESTRICTIONS:
- Do NOT add intro lines or summaries.
- Do NOT wrap answers in code blocks unless the user specifically asks for code.
`;

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(storageService.getSessions());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 👇 NEW state for mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSession = sessions.find((s) => s.id === activeId);

  useEffect(() => {
    if (sessions.length > 0 && !activeId) {
      setActiveId(sessions[0].id);
    }
  }, [sessions, activeId]);

  const handleNewSession = (mode: AppMode) => {
    const session = storageService.createSession(mode);
    setSessions(storageService.getSessions());
    setActiveId(session.id);
    setSidebarOpen(false); // auto close sidebar on mobile
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeSession || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsgId = crypto.randomUUID();
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: "model",
      content: "",
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeSession.messages, userMsg, initialAssistantMsg];
    let updatedSession = { ...activeSession, messages: updatedMessages };

    if (activeSession.messages.length === 0) {
      updatedSession.title = text.length > 30 ? text.substring(0, 30) + "..." : text;
    }

    storageService.updateSession(updatedSession);
    setSessions(storageService.getSessions());
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      let currentInstruction = NOVA_SYSTEM_INSTRUCTIONS;

      if (activeSession.mode === AppMode.CODE) {
        currentInstruction += "\n[EXTRA CONTEXT: User is in Code Mode. Focus on high-density technical analysis.]";
      }

      let fullContent = "";
      await apiService.chatStream(
        updatedMessages.slice(0, -1),
        currentInstruction,
        (chunk) => {
          fullContent += chunk;
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeId) {
                const msgs = [...s.messages];
                const lastIdx = msgs.findIndex((m) => m.id === assistantMsgId);
                if (lastIdx !== -1) {
                  msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent };
                }
                return { ...s, messages: msgs };
              }
              return s;
            })
          );
        },
        abortControllerRef.current.signal
      );
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteSession = (id: string) => {
    storageService.deleteSession(id);
    const newSessions = storageService.getSessions();
    setSessions(newSessions);
    setActiveId(newSessions[0]?.id || null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">

      {/* 👇 MOBILE SIDEBAR SLIDE PANEL */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-slate-950 transition-transform transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 md:w-80 w-[70%]`}
      >
        <Sidebar
          sessions={sessions}
          activeSessionId={activeId}
          onSelectSession={(id) => {
            setActiveId(id);
            setSidebarOpen(false); // close on mobile select
          }}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      {/* 👇 BACKDROP WHEN SIDEBAR IS OPEN (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* 👇 MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* HEADER */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 glass sticky top-0 z-30">

          {/* 🍔 HAMBURGER (mobile only) */}
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

          {/* TITLE */}
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${isLoading ? "bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-slate-700"}`}></div>
            <h2 className="text-xs md:text-sm font-semibold tracking-wide uppercase text-slate-400">
              {activeSession ? `${activeSession.mode} Workspace` : "New Workspace"}
            </h2>
          </div>

        </header>

        {/* CONTENT */}
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
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 px-4 text-center">
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
