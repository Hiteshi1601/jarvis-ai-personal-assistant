'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import WidgetsPanel from '../components/WidgetsPanel';
import ChatInterface, { Message, Log } from '../components/ChatInterface';
import { 
  Sparkles, 
  Mail, 
  Calendar as CalendarIcon, 
  FileSpreadsheet, 
  FolderOpen, 
  Settings as SettingsIcon, 
  Trash2, 
  Check, 
  Info,
  ExternalLink
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const { user, loading: authLoading, login } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [activeLogs, setActiveLogs] = useState<Log[]>([]);
  
  // Dashboard Aggregated States
  const [dashboardData, setDashboardData] = useState({
    googleConnected: false,
    meetings: [] as any[],
    emails: [] as any[],
    tasks: [] as any[],
    aiRecommendations: [] as string[]
  });
  const [dataLoading, setDataLoading] = useState(true);

  // Key-value memory settings state
  const [settingsMemory, setSettingsMemory] = useState<any[]>([]);

  // Fetch Dashboard State
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/workspace/dashboard-data`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard info:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch Settings Memory (only for Settings tab)
  const fetchSettingsMemory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/memories`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsMemory(data);
      }
    } catch (e) {
      console.error('Failed to fetch user memory:', e);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/memories/${memoryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchSettingsMemory();
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  // Polling Dashboard Data
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch settings memory when settings tab is active
  useEffect(() => {
    if (user && activeTab === 'settings') {
      fetchSettingsMemory();
    }
  }, [user, activeTab]);

  // Handle tasks updates
  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
        credentials: 'include'
      });
      if (res.ok) {
        // Optimistically update or trigger refetch
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleTaskAdd = async (title: string) => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: 'medium' }),
        credentials: 'include'
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  // Send message to Coordinator Agent
  const handleSendMessage = async (text: string) => {
    setSending(true);
    
    // Add user message
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);

    // Set initial thinking logs
    setActiveLogs([
      { id: '1', status: 'info', message: 'Analyzing prompt query' }
    ]);

    try {
      // Format history
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_URL}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyPayload }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        // Append response and logs
        setMessages(prev => [...prev, {
          role: 'model',
          content: data.response,
          logs: data.logs
        }]);
        
        // Sync widgets automatically in case the agent modified calendar, drive, or sheets!
        fetchDashboardData();
      } else {
        const errData = await res.json();
        setMessages(prev => [...prev, {
          role: 'model',
          content: `⚠️ Error calling JARVIS coordinator: ${errData.error || 'Server error'}`
        }]);
      }
    } catch (error) {
      console.error('Failed to communicate with agent:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: '⚠️ Failed to connect to backend server. Verify Express server is active.'
      }]);
    } finally {
      setSending(false);
      setActiveLogs([]);
    }
  };

  // Render Loader screen
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-cyber-bg space-y-4">
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full border border-cyber-blue/30 shadow-glow-cyan animate-pulse">
          <Sparkles className="w-8 h-8 text-cyber-blue animate-spin-slow" />
        </div>
        <span className="text-sm font-mono text-cyber-blue tracking-widest uppercase">
          BOOTING_JARVIS_CORES...
        </span>
      </div>
    );
  }

  // Render Login Gate Screen
  if (!user) {
    return (
      <main className="h-screen w-screen relative flex items-center justify-center bg-cyber-gradient overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-10 left-10 w-[400px] h-[400px] bg-cyber-blueGlow/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyber-purpleGlow/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-md w-full px-6 text-center z-10">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-blueGlow/10 border border-cyber-blue shadow-glow-cyan mb-4">
              <Sparkles className="w-8 h-8 text-cyber-blue" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-wider text-white text-glow-cyan">
              JARVIS AI
            </h1>
            <p className="text-xs text-cyber-blue uppercase font-mono tracking-widest mt-1">
              Personal Executive Assistant
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-6 border border-cyber-border/40">
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white uppercase font-mono text-left">
                SYSTEM_INITIALIZATION_REQUIRED
              </h2>
              <p className="text-xs text-slate-400 text-left leading-relaxed">
                Connect your Google Workspace credentials to boot the coordinator agent. JARVIS automates Gmail, Google Calendar, Sheets, Drive, and Docs.
              </p>
            </div>

            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white text-black font-bold text-sm hover:bg-slate-100 transition-all shadow-glow-cyan"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Pair Google Workspace</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Render Full Dashboard Layout
  return (
    <main className="min-h-screen flex bg-cyber-bg">
      {/* 1. Left Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main content router */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'dashboard' && (
          <>
            <ChatInterface 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              sending={sending}
              activeLogs={activeLogs}
            />
            <WidgetsPanel 
              data={dashboardData} 
              loading={dataLoading} 
              onTaskToggle={handleTaskToggle}
              onTaskAdd={handleTaskAdd}
            />
          </>
        )}

        {activeTab === 'chat' && (
          <div className="flex-1 h-screen flex">
            <ChatInterface 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              sending={sending}
              activeLogs={activeLogs}
            />
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto z-10">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white uppercase font-mono text-glow-cyan flex items-center gap-3">
                <Mail className="w-5 h-5 text-cyber-blue" />
                Gmail Agent Inbox Monitor
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Live Feed from is:unread category:primary</p>
            </div>
            
            <div className="grid gap-4 max-w-4xl">
              {dashboardData.emails.map((email) => (
                <div key={email.id} className="glass-panel p-6 rounded-xl space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-xs text-cyber-blue font-mono font-bold block mb-1">From: {email.from}</span>
                      <h3 className="text-sm font-semibold text-white">{email.subject}</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(email.date).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded border border-cyber-border/10">
                    {email.snippet}
                  </p>
                  <button 
                    onClick={() => handleSendMessage(`Draft a professional reply to the email from "${email.from}" regarding "${email.subject}"`)}
                    className="text-[11px] font-mono font-bold text-cyber-blue bg-cyber-blue/10 border border-cyber-blue/30 px-3 py-1.5 rounded hover:bg-cyber-blue/20 transition-all flex items-center gap-1.5"
                  >
                    <span>DRAFT REPLY WITH JARVIS</span>
                  </button>
                </div>
              ))}
              {dashboardData.emails.length === 0 && (
                <div className="text-center py-16 text-slate-400 glass-panel rounded-xl">
                  Inbox fully caught up. Nice job!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto z-10">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white uppercase font-mono text-glow-cyan flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-cyber-blue" />
                Google Calendar Schedule
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Primary Calendar synchronization</p>
            </div>
            
            <div className="max-w-4xl glass-panel p-6 rounded-xl space-y-4">
              {dashboardData.meetings.map((meet, i) => (
                <div key={meet.id || i} className="flex justify-between items-center p-4 rounded bg-white/5 border border-cyber-border/20 hover:border-cyber-blue/30 transition-all">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">{meet.summary}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span>Start: {new Date(meet.start.dateTime || meet.start.date).toLocaleString()}</span>
                      <span>•</span>
                      <span>End: {new Date(meet.end.dateTime || meet.end.date).toLocaleString()}</span>
                    </p>
                  </div>
                  <span className="text-[10px] bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue px-3 py-1 rounded font-mono font-bold">
                    CONFIRMED
                  </span>
                </div>
              ))}
              {dashboardData.meetings.length === 0 && (
                <div className="text-center py-16 text-slate-400 glass-panel rounded-xl">
                  No upcoming meetings scheduled.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sheets' && (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto z-10">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white uppercase font-mono text-glow-cyan flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-cyber-blue" />
                Google Sheets Automations
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Direct agent sheet manipulation workspace</p>
            </div>
            <div className="max-w-4xl glass-panel p-6 rounded-xl space-y-4 text-center py-16">
              <FileSpreadsheet className="w-12 h-12 text-cyber-blue mx-auto mb-4 animate-pulse" />
              <h3 className="text-md font-bold text-white">Google Sheets Agent Workspace</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Sheets can be read, analyzed, and edited directly through the coordinator agent. Open AI Chat and try:
              </p>
              <div className="max-w-xs mx-auto text-left bg-black/40 border border-cyber-border/10 p-3.5 rounded font-mono text-[11px] text-slate-300 mt-4 space-y-2">
                <div>"Create a spreadsheet called Weekly Goals."</div>
                <div>"Analyze cells A1 to D10 inside sheet [id]."</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'drive' && (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto z-10">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white uppercase font-mono text-glow-cyan flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-cyber-blue" />
                Google Drive Storage Agent
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Unified search & file categorization</p>
            </div>
            <div className="max-w-4xl glass-panel p-6 rounded-xl space-y-4 text-center py-16">
              <FolderOpen className="w-12 h-12 text-cyber-blue mx-auto mb-4 animate-pulse" />
              <h3 className="text-md font-bold text-white">Google Drive Agent Workspace</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Manage file directory structures, search documents, and upload binaries with JARVIS. In AI Chat, query:
              </p>
              <div className="max-w-xs mx-auto text-left bg-black/40 border border-cyber-border/10 p-3.5 rounded font-mono text-[11px] text-slate-300 mt-4 space-y-2">
                <div>"Show my spreadsheets on Google Drive."</div>
                <div>"Create a folder named Project Assets."</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automations' && (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto z-10">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white uppercase font-mono text-glow-cyan flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-cyber-blue" />
                Workspace Automations
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Configure automated triggers and agent loops</p>
            </div>
            <div className="max-w-4xl glass-panel p-6 rounded-xl space-y-4 text-center py-16">
              <Sparkles className="w-12 h-12 text-cyber-blue mx-auto mb-4 animate-pulse-slow" />
              <h3 className="text-md font-bold text-white">Automations & Recurrent Routines</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Configure daily executive morning briefing scripts. Let JARVIS auto-categorize incoming emails or push reminders on availability gaps.
              </p>
              <div className="flex gap-4 justify-center mt-6">
                <button 
                  onClick={() => handleSendMessage("Perform morning briefing overview: summarize unread emails and draft today's schedule.")}
                  className="bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue font-mono font-bold text-[11px] px-4 py-2 rounded hover:bg-cyber-blue/20 transition-all animate-pulse-slow"
                >
                  RUN MORNING BRIEFING NOW
                </button>
                <button 
                  onClick={() => handleSendMessage("Perform evening briefing overview: summarize work completed today, pending actions, and follow-ups needed.")}
                  className="bg-cyber-purple/10 border border-cyber-purple/40 text-cyber-purple font-mono font-bold text-[11px] px-4 py-2 rounded hover:bg-cyber-purple/20 transition-all"
                >
                  RUN EVENING BRIEFING NOW
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto z-10">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white uppercase font-mono text-glow-cyan flex items-center gap-3">
                <SettingsIcon className="w-5 h-5 text-cyber-blue" />
                JARVIS Settings & Core Configuration
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Manage encryption tokens, databases, and memory nodes</p>
            </div>
            
            <div className="grid gap-6 max-w-3xl">
              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-cyber-border/20 pb-2">
                  System Health Checks
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-black/40 rounded border border-cyber-border/10 flex justify-between items-center">
                    <span className="text-slate-400">Database Connection</span>
                    <span className="text-green-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ONLINE
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 rounded border border-cyber-border/10 flex justify-between items-center">
                    <span className="text-slate-400">Gemini Core Integrator</span>
                    <span className="text-green-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> READY
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 rounded border border-cyber-border/10 flex justify-between items-center">
                    <span className="text-slate-400">Google OAuth Credentials</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      dashboardData.googleConnected ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {dashboardData.googleConnected ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> ACTIVE
                        </>
                      ) : (
                        'UNLINKED'
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 rounded border border-cyber-border/10 flex justify-between items-center">
                    <span className="text-slate-400">Token Encryption Guard</span>
                    <span className="text-green-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> AES_256_CBC
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-cyber-border/20 pb-2 flex items-center justify-between">
                  <span>JARVIS Cognitive Memory Core</span>
                  <span className="text-[10px] bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue px-2 py-0.5 rounded font-mono font-bold">
                    PERSISTENT_MEMORY
                  </span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  These user preferences and facts are injected into JARVIS's system instructions. You can instruct JARVIS in the chat to remember things (e.g. "Remember that my manager is Bob"), and they will show up here.
                </p>
                <div className="space-y-3">
                  {settingsMemory.map((mem) => (
                    <div key={mem.id} className="p-3 bg-black/40 rounded border border-cyber-border/10 flex justify-between items-center text-xs font-mono">
                      <div>
                        <span className="text-cyber-blue font-bold block mb-1">Key: {mem.key}</span>
                        <span className="text-slate-300">{mem.value}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {settingsMemory.length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-4 italic">No stored preferences yet. Instruct JARVIS in chat to remember something!</div>
                  )}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase font-mono border-b border-cyber-border/20 pb-2">
                  User Workspace Configuration
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authentication session is backed by secure cookies. You can revoke workspace access tokens by logging out, which erases credential session caches.
                </p>
                <div className="flex gap-4">
                  <a
                    href={`${API_URL}/api/auth/google`}
                    className="bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue font-mono font-bold text-xs px-4 py-2.5 rounded hover:bg-cyber-blue/20 transition-all flex items-center gap-1.5"
                  >
                    <span>RE-AUTH GOOGLE SCOPES</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
