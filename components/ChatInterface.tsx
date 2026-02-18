
import React, { useState, useRef, useEffect } from 'react';
import { Message, AppMode } from '../types';
import { SendIcon, CopyIcon, StopIcon } from './Icons';

interface TypewriterProps {
  text: string;
  isStreaming: boolean;
  onScrollNeeded: () => void;
  onAnimationStateChange: (isAnimating: boolean) => void;
}

const Typewriter: React.FC<TypewriterProps> = ({ text, isStreaming, onScrollNeeded, onAnimationStateChange }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const typingSpeed = 15;

  useEffect(() => {
    const isActuallyAnimating = currentIndex < text.length;
    onAnimationStateChange(isActuallyAnimating || isStreaming);

    if (!isStreaming && currentIndex < text.length) {
      const timer = setTimeout(() => {
        const nextBatch = text.slice(0, currentIndex + 5);
        setDisplayedText(nextBatch);
        setCurrentIndex(nextBatch.length);
        onScrollNeeded();
      }, 5);
      return () => clearTimeout(timer);
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(prev => prev + 1);
        onScrollNeeded();
      }, typingSpeed);
      return () => clearTimeout(timer);
    }
  }, [text, currentIndex, isStreaming, onScrollNeeded, onAnimationStateChange]);

  useEffect(() => {
    if (text.length < displayedText.length) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
    }
  }, [text]);

  const showCursor = isStreaming || currentIndex < text.length;

  return (
    <span className="whitespace-pre-wrap text-sm leading-relaxed">
      {displayedText}
      {showCursor && (
        <span className="inline-block w-[2px] h-[1.1em] bg-cyan-400 ml-1 animate-[pulse_0.8s_infinite] align-middle" style={{ verticalAlign: 'text-bottom' }}></span>
      )}
    </span>
  );
};

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
  mode: AppMode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onStop, isLoading, mode }) => {
  const [input, setInput] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const showStopButton = isLoading || isAnimating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showStopButton) {
      onStop();
      setIsAnimating(false);
    } else if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-cyan-500/10 text-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
              <span className="text-2xl font-bold">N</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">NovaAI Workspace</h2>
            <p className="text-slate-400 max-w-md mx-auto">Streaming mode active. Direct and professional responses only.</p>
          </div>
        ) : messages.map((msg, idx) => {
          const isLastMessage = idx === messages.length - 1;
          const isModel = msg.role === 'model';
          
          if (!msg.content && !isLastMessage && isModel) return null;

          return (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`max-w-[85%] rounded-2xl p-4 relative group ${
                msg.role === 'user' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20 rounded-tr-none' 
                  : 'glass text-slate-200 border-slate-800 rounded-tl-none'
              }`}>
                {isModel && isLastMessage ? (
                  <Typewriter 
                    text={msg.content} 
                    isStreaming={isLoading} 
                    onScrollNeeded={scrollToBottom}
                    onAnimationStateChange={setIsAnimating}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </div>
                )}
                
                {msg.content && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] opacity-50">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button 
                      onClick={() => copyToClipboard(msg.content)}
                      className="p-1 hover:bg-white/10 rounded-md transition-all text-white"
                      title="Copy"
                    >
                      <CopyIcon />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-950/50 backdrop-blur-xl border-t border-slate-800/50 sticky bottom-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-1.5 glass rounded-2xl border-slate-800 focus-within:border-cyan-500/50 transition-all shadow-2xl">
          <input
            type="text"
            value={input}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            placeholder={showStopButton ? "Generating response..." : "Type a message..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 py-2 placeholder:text-slate-600 disabled:opacity-50"
          />
          {showStopButton ? (
            <button 
              type="button"
              onClick={() => { onStop(); setIsAnimating(false); }}
              className="p-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-white transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center border border-cyan-400/30"
              title="Stop Generation"
            >
              <StopIcon />
            </button>
          ) : (
            <button 
              type="submit"
              disabled={!input.trim()}
              className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-white transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <SendIcon />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
