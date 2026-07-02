'use client';

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Mail, 
  CheckSquare, 
  Sparkles, 
  Plus, 
  Check, 
  Clock, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
}

interface Meeting {
  id?: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface WidgetsPanelProps {
  data: {
    googleConnected: boolean;
    meetings: Meeting[];
    emails: Email[];
    tasks: Task[];
    aiRecommendations: string[];
  };
  loading: boolean;
  onTaskToggle: (id: string, completed: boolean) => Promise<void>;
  onTaskAdd: (title: string) => Promise<void>;
}

export default function WidgetsPanel({ data, loading, onTaskToggle, onTaskAdd }: WidgetsPanelProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await onTaskAdd(newTaskTitle.trim());
      setNewTaskTitle('');
    } finally {
      setAddingTask(false);
    }
  };

  const formatTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return 'All Day';
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="w-96 glass-panel border-l border-cyber-border flex flex-col h-screen sticky top-0 z-20 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-cyber-border/30">
        <h2 className="font-bold tracking-wide text-white uppercase text-sm font-mono text-glow-cyan flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyber-blue" />
          Productivity Monitor
        </h2>
        <span className="text-[10px] bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue px-2 py-0.5 rounded font-mono">
          SECURE_NODE
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
            <span className="wave-bar"></span>
          </div>
          <span className="text-xs text-cyber-blue font-mono">SYNCING_DATA...</span>
        </div>
      ) : (
        <>
          {/* Connection Error Widget */}
          {!data.googleConnected && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex flex-col gap-3 shadow-glow-purple">
              <div className="flex items-center gap-2 font-bold text-sm font-mono">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                WORKSPACE DISCONNECTED
              </div>
              <p className="text-xs text-red-200/80 leading-relaxed">
                Connect your Google account in settings to allow JARVIS to read/write emails, events, and sheets.
              </p>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`}
                className="w-full text-center py-2 rounded bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all"
              >
                CONNECT GOOGLE ACCOUNT
              </a>
            </div>
          )}

          {/* AI Recommendations */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-slate-400 font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyber-blue animate-pulse-slow" />
              JARVIS Insights
            </h3>
            <div className="space-y-2">
              {data.aiRecommendations.map((rec, i) => (
                <div key={i} className="p-3 rounded-lg glass-card text-xs text-slate-300 flex items-start gap-2 border-l-2 border-l-cyber-blue">
                  <ArrowRight className="w-3.5 h-3.5 text-cyber-blue mt-0.5 flex-shrink-0" />
                  <span>
                    {typeof rec === 'object' && rec !== null
                      ? (rec as any).recommendation || (rec as any).text || JSON.stringify(rec)
                      : String(rec)}
                  </span>
                </div>
              ))}
              {data.aiRecommendations.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4 italic">No insights available</div>
              )}
            </div>
          </div>

          {/* Today's Meetings */}
          {data.googleConnected && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-slate-400 font-mono tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-cyber-blue" />
                Today's Schedule
              </h3>
              <div className="space-y-2">
                {data.meetings.map((meet, i) => (
                  <div key={meet.id || i} className="p-3 rounded-lg glass-card flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{meet.summary}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 truncate">
                        {formatTime(meet.start.dateTime || meet.start.date)} - {formatTime(meet.end.dateTime || meet.end.date)}
                      </p>
                    </div>
                    <span className="text-[10px] bg-cyber-blue/10 border border-cyber-blue/20 text-cyber-blue px-2 py-0.5 rounded font-mono">
                      MEET
                    </span>
                  </div>
                ))}
                {data.meetings.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-4 italic">No meetings scheduled</div>
                )}
              </div>
            </div>
          )}

          {/* Important Emails */}
          {data.googleConnected && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-slate-400 font-mono tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyber-purple" />
                Unread Priority Emails
              </h3>
              <div className="space-y-2">
                {data.emails.map((email) => (
                  <div key={email.id} className="p-3 rounded-lg glass-card space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] text-cyber-purple font-mono truncate max-w-[120px]">
                        {email.from.split('<')[0].trim()}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">
                        {new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{email.subject}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {email.snippet}
                    </p>
                  </div>
                ))}
                {data.emails.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-4 italic">Inbox fully processed</div>
                )}
              </div>
            </div>
          )}

          {/* Tasks & Reminders */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-slate-400 font-mono tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyber-blue" />
              Checklist Tasks
            </h3>

            {/* Task Add Form */}
            <form onSubmit={handleCreateTask} className="flex gap-2">
              <input
                type="text"
                placeholder="New action item..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                disabled={addingTask}
                className="flex-1 glass-input px-3 py-1.5 text-xs placeholder-slate-500 font-medium"
              />
              <button
                type="submit"
                disabled={addingTask || !newTaskTitle}
                className="p-1.5 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20 transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Tasks list */}
            <div className="space-y-2">
              {data.tasks.map((task) => (
                <div key={task.id} className="p-3 rounded-lg glass-card flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onTaskToggle(task.id, !task.completed)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        task.completed 
                          ? 'bg-cyber-blue border-cyber-blue text-black' 
                          : 'border-slate-500 hover:border-cyber-blue'
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span className={`text-xs text-white truncate ${task.completed ? 'line-through text-slate-500' : ''}`}>
                      {task.title}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded capitalize ${
                    task.priority === 'high' 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                      : task.priority === 'medium'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
              {data.tasks.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4 italic">All tasks completed</div>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
