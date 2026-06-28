'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Mail, 
  Calendar, 
  FileSpreadsheet, 
  FolderOpen, 
  MessageSquare, 
  Cpu, 
  Settings, 
  LogOut,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', name: 'Inbox', icon: Mail },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'sheets', name: 'Sheets', icon: FileSpreadsheet },
    { id: 'drive', name: 'Drive', icon: FolderOpen },
    { id: 'chat', name: 'AI Chat', icon: MessageSquare },
    { id: 'automations', name: 'Automations', icon: Cpu },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-cyber-border flex flex-col justify-between h-screen sticky top-0 z-20">
      {/* Top Brand / Logo */}
      <div className="p-6 border-b border-cyber-border/40">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyber-blueGlow border border-cyber-blue shadow-glow-cyan">
            <Sparkles className="w-5 h-5 text-cyber-blue animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-xl text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyber-blue text-glow-cyan">
              JARVIS AI
            </h1>
            <p className="text-[10px] text-cyber-blue tracking-widest font-mono">SYS_ONLINE</p>
          </div>
        </div>
      </div>

      {/* Navigation Options */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-all duration-300 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyber-blueGlow to-transparent text-white border-l-2 border-cyber-blue'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                isActive ? 'text-cyber-blue' : 'text-slate-400 group-hover:text-cyber-blue'
              }`} />
              <span className="font-medium tracking-wide">{item.name}</span>
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyber-blue shadow-glow-cyan" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Status bottom panel */}
      {user && (
        <div className="p-4 border-t border-cyber-border/40 bg-cyber-dark/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border border-cyber-blue/40 shadow-glow-cyan object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-cyber-gray border border-cyber-blue/30 flex items-center justify-center font-bold text-cyber-blue">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-cyber-bg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
