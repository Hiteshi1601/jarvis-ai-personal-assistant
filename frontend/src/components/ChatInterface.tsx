'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Terminal, 
  Check, 
  Info, 
  AlertCircle, 
  Sparkles, 
  Mic, 
  HelpCircle,
  FileText
} from 'lucide-react';

export interface Log {
  id: string;
  status: 'info' | 'success' | 'error';
  message: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  logs?: Log[];
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  sending: boolean;
  activeLogs: Log[];
}

export default function ChatInterface({ messages, onSendMessage, sending, activeLogs }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeLogs, sending]);

  return (
    <div className="flex-1 flex flex-col h-screen relative bg-cyber-bg">
      {/* Background glowing orb */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyber-blueGlow/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 left-1/3 w-[300px] h-[300px] bg-cyber-purpleGlow/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Bar Header */}
      <header className="p-6 border-b border-cyber-border/40 flex justify-between items-center z-10 glass-panel">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-cyber-blue shadow-glow-cyan animate-pulse" />
            <div className="absolute -inset-1 rounded-full border border-cyber-blue/30 animate-ping" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono tracking-wide text-white uppercase">
              JARVIS_COORDINATOR_V3.5
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">Status: Awaiting commands</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-cyber-blue" />
            AGENT_STREAM: ACTIVE
          </span>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
            {/* Cinematic holographic sphere */}
            <div className="relative flex items-center justify-center w-36 h-36 rounded-full border border-cyber-blue/30 bg-cyber-blueGlow/5 shadow-glow-cyan animate-pulse-slow">
              <div className="absolute inset-4 rounded-full border border-cyber-purple/20 bg-cyber-purpleGlow/5 animate-spin-slow" />
              <Sparkles className="w-10 h-10 text-cyber-blue animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold tracking-wide text-white">How can I assist you today?</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                I am connected to your Google Workspace. Ask me to summarize emails, schedule calendar events, analyze spreadsheet figures, or compile document briefs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full text-[11px] font-mono text-slate-400">
              <div className="p-3 rounded-lg glass-card border border-cyber-border/40 text-left hover:border-cyber-blue/40 cursor-pointer transition-all" onClick={() => setInput("Summarize today's emails.")}>
                <span className="text-cyber-blue block font-bold mb-1">Gmail</span>
                "Summarize today's unread emails."
              </div>
              <div className="p-3 rounded-lg glass-card border border-cyber-border/40 text-left hover:border-cyber-blue/40 cursor-pointer transition-all" onClick={() => setInput("Schedule meeting tomorrow at 3 PM.")}>
                <span className="text-cyber-blue block font-bold mb-1">Calendar</span>
                "Schedule meeting tomorrow at 3 PM."
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col max-w-3xl ${
              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            {/* Role Header */}
            <span className="text-[9.5px] text-slate-500 font-mono tracking-widest uppercase mb-1.5">
              {msg.role === 'user' ? 'User Command' : 'JARVIS Core'}
            </span>

            {/* Bubble */}
            <div
              className={`p-4 rounded-xl text-sm leading-relaxed border transition-all ${
                msg.role === 'user'
                  ? 'bg-cyber-blue/5 border-cyber-blue/30 text-white shadow-glow-cyan/5 rounded-tr-none'
                  : 'glass-card border-cyber-border/80 text-slate-100 shadow-glass rounded-tl-none'
              }`}
            >
              {/* Message Content */}
              <div className="prose prose-invert max-w-none text-xs md:text-sm font-medium whitespace-pre-wrap">
                {msg.content}
              </div>

              {/* Execution Trace Logs (Inside Assistant Bubble if present) */}
              {msg.logs && msg.logs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-cyber-border/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <Terminal className="w-3.5 h-3.5 text-cyber-blue" />
                    <span>SYSTEM_EXECUTION_TRACE:</span>
                  </div>
                  <div className="space-y-1 bg-black/40 rounded p-2.5 font-mono text-[10.5px] border border-cyber-border/10 max-h-40 overflow-y-auto">
                    {msg.logs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <Check className="w-3 h-3 text-green-400 stroke-[3] flex-shrink-0" />
                        ) : log.status === 'error' ? (
                          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        ) : (
                          <Info className="w-3 h-3 text-cyber-blue flex-shrink-0" />
                        )}
                        <span className={
                          log.status === 'success' ? 'text-green-300' :
                          log.status === 'error' ? 'text-red-300' : 'text-slate-400'
                        }>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming/Active thinking logs */}
        {sending && (
          <div className="flex flex-col mr-auto items-start max-w-3xl">
            <span className="text-[9.5px] text-slate-500 font-mono tracking-widest uppercase mb-1.5">
              JARVIS Coordinator
            </span>
            <div className="p-4 rounded-xl text-sm border glass-card border-cyber-border text-slate-300 rounded-tl-none shadow-glass w-full">
              <div className="flex items-center gap-3">
                {/* Voice wave loading bars */}
                <div className="flex items-center gap-1">
                  <span className="wave-bar"></span>
                  <span className="wave-bar"></span>
                  <span className="wave-bar"></span>
                  <span className="wave-bar"></span>
                </div>
                <span className="text-xs text-cyber-blue font-mono animate-pulse">JARVIS is thinking...</span>
              </div>

              {activeLogs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-cyber-border/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <Terminal className="w-3.5 h-3.5 text-cyber-blue" />
                    <span>REAL_TIME_STREAM:</span>
                  </div>
                  <div className="space-y-1 bg-black/40 rounded p-2.5 font-mono text-[10.5px] border border-cyber-border/10 max-h-40 overflow-y-auto">
                    {activeLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <Check className="w-3 h-3 text-green-400 stroke-[3] flex-shrink-0" />
                        ) : log.status === 'error' ? (
                          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        ) : (
                          <Info className="w-3 h-3 text-cyber-blue flex-shrink-0" />
                        )}
                        <span className={
                          log.status === 'success' ? 'text-green-300' :
                          log.status === 'error' ? 'text-red-300' : 'text-slate-400'
                        }>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Dock */}
      <footer className="p-6 border-t border-cyber-border/40 z-10 glass-panel">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            placeholder="Instruct JARVIS (e.g. 'Read my unread emails and outline critical action points')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            className="w-full glass-input pl-4 pr-24 py-4 text-sm font-medium"
          />

          <div className="absolute right-3 flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-lg text-slate-400 hover:text-cyber-blue hover:bg-white/5 transition-all"
              title="Voice Input (Ready)"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-lg bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue hover:bg-cyber-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-cyan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <p className="text-[9.5px] text-center text-slate-500 font-mono mt-3">
          SECURE_ENCRYPTED_LINK // PRESS ENTER TO TRANSMIT COMMAND
        </p>
      </footer>
    </div>
  );
}
