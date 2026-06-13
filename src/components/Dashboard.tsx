import React, { useState } from 'react';
import { 
  Plus, FileText, Trash2, Calendar, MessageSquare, 
  Sparkles, Award, ClipboardCheck, BookOpen, Clock, 
  Flame, ChevronRight, RefreshCw, BarChart2, CheckCircle
} from 'lucide-react';
import { DocumentMetadata, LearningAnalytics } from '../types';

interface DashboardProps {
  documents: DocumentMetadata[];
  analytics: LearningAnalytics | null;
  onSelectDocument: (docId: string, view: 'chat' | 'summary' | 'quiz' | 'flashcards') => void;
  onDeleteDocument: (docId: string) => void;
  onNavigateToUpload: () => void;
  onRefreshStats: () => void;
}

export default function Dashboard({
  documents,
  analytics,
  onSelectDocument,
  onDeleteDocument,
  onNavigateToUpload,
  onRefreshStats
}: DashboardProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', hour: "2-digit", minute: "2-digit" 
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Overview Head & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6" id="dashboard-header-block">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Study Workspace <span className="text-indigo-400 font-normal">Dashboard</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access your course materials, analytical progress trackers, and generate smart RAG interactive cards.
          </p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={onRefreshStats}
            title="Refresh database records"
            aria-label="Refresh stats"
            className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={onNavigateToUpload}
            id="dash-upload-btn"
            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Upload new Material</span>
          </button>
        </div>
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-analytics-grid">
        {/* Streak */}
        <div className="p-5 bg-gradient-to-br from-orange-500/10 via-slate-800/20 to-slate-800/30 rounded-2xl border border-orange-500/20 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Active Streak</span>
            <div className="text-2xl sm:text-3xl font-black text-white">{analytics?.streak || 0} { (analytics?.streak || 0) === 1 ? 'day' : 'days' }</div>
            <p className="text-[10px] text-slate-400">Keep uploading & self-testing daily!</p>
          </div>
          <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Minutes Studied */}
        <div className="p-5 bg-gradient-to-br from-indigo-500/10 via-slate-800/20 to-slate-800/30 rounded-2xl border border-indigo-500/20 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Studied Time</span>
            <div className="text-2xl sm:text-3xl font-black text-white">{analytics?.totalMinutes || 0} <span className="text-sm font-normal text-slate-400">min</span></div>
            <p className="text-[10px] text-slate-400">Accumulated active sessions</p>
          </div>
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Quizzes Taken */}
        <div className="p-5 bg-gradient-to-br from-emerald-500/10 via-slate-800/20 to-slate-800/30 rounded-2xl border border-emerald-500/20 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Quizzes Taken</span>
            <div className="text-2xl sm:text-3xl font-black text-white">{analytics?.totalQuizzesTaken || 0}</div>
            <p className="text-[10px] text-emerald-400">Avg Score: {analytics?.averageQuizScore || 0}%</p>
          </div>
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <ClipboardCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Flashcards Learned */}
        <div className="p-5 bg-gradient-to-br from-pink-500/10 via-slate-800/20 to-slate-800/30 rounded-2xl border border-pink-500/20 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-pink-400 uppercase tracking-widest">Cards Mastered</span>
            <div className="text-2xl sm:text-3xl font-black text-white">{analytics?.flashcardsLearnedCount || 0}</div>
            <p className="text-[10px] text-slate-400">Anki-style active recall cards</p>
          </div>
          <div className="p-3 bg-pink-500/20 rounded-xl text-pink-400">
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="dashboard-content-grid">
        {/* Main Document list section */}
        <div className="lg:col-span-8 space-y-6" id="dashboard-doc-list-section">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <span>Uploaded Study Materials</span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                {documents.length} File{documents.length === 1 ? '' : 's'}
              </span>
            </h2>
          </div>

          {documents.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-700/60 rounded-3xl bg-slate-900/40 text-center space-y-5" id="dashboard-empty-state">
              <div className="p-3 bg-slate-800 rounded-2xl inline-block mx-auto text-slate-400">
                <FileText className="h-8 w-8" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="font-semibold text-white">Your PDF library is empty.</h4>
                <p className="text-xs text-slate-400">Upload a study syllabus, class presentation slides, or textbook chapter to instantly generate study material prompts.</p>
              </div>
              <button
                onClick={onNavigateToUpload}
                id="empty-dash-upload"
                className="bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload First PDF</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="document-grid-list">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  id={`doc-card-${doc.id}`}
                  className="bg-slate-800/35 border border-slate-700/50 hover:border-indigo-500/40 rounded-2xl p-5 hover:bg-slate-800/50 transition-all flex flex-col justify-between shadow-lg relative group"
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-indigo-500/15 rounded-xl text-indigo-400 shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${doc.name}? All generated summary indexes, quizzes, and flashcards will be removed.`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-700/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer absolute top-3 right-3"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Word title */}
                    <div className="space-y-1 pr-6">
                      <h3 className="font-bold text-white text-sm line-clamp-1 hover:text-indigo-400 transition-colors cursor-pointer" title={doc.name}>
                        {doc.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span>{formatSize(doc.size)}</span>
                        <span>•</span>
                        <span>{doc.textLength ? `${Math.round(doc.textLength / 500)} pgs text` : 'Empty PDF'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Pathway Segment */}
                  <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-700/55 text-xs font-semibold">
                    <button
                      onClick={() => onSelectDocument(doc.id, 'chat')}
                      id={`btn-chat-doc-${doc.id}`}
                      className="bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>RAG Chat</span>
                    </button>
                    <button
                      onClick={() => onSelectDocument(doc.id, 'summary')}
                      id={`btn-summary-doc-${doc.id}`}
                      className="bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Summary</span>
                    </button>
                    <button
                      onClick={() => onSelectDocument(doc.id, 'quiz')}
                      id={`btn-quiz-doc-${doc.id}`}
                      className="bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      <span>Take Quiz</span>
                    </button>
                    <button
                      onClick={() => onSelectDocument(doc.id, 'flashcards')}
                      id={`btn-flash-doc-${doc.id}`}
                      className="bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-700 rounded-xl px-3 py-2 flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer"
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span>Flashcards</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Activity Feed / Tracking timelines */}
        <div className="lg:col-span-4 space-y-6" id="dashboard-sidebar-analytics">
          <div className="bg-slate-800/20 rounded-3xl border border-slate-700/50 p-6 shadow-xl" id="sidebar-activity-box">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
              <BarChart2 className="h-4 w-4 text-indigo-400" />
              <span>Recent Activities</span>
            </h2>

            {(!analytics?.recentActivity || analytics.recentActivity.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recent activities on study record.</p>
            ) : (
              <div className="relative border-l border-slate-850 ml-2 space-y-5" id="timeline-feed">
                {analytics.recentActivity.slice(0, 6).map((act) => (
                  <div key={act.id} className="relative pl-5 group/item" id={`activity-item-${act.id}`}>
                    {/* Circle Node Indicator */}
                    <div className="absolute -left-[5px] top-1.5 rounded-full bg-slate-900 border border-indigo-500 w-2.5 h-2.5 group-hover/item:scale-125 transition-transform" />
                    
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 block">
                        {formatDate(act.timestamp)}
                      </span>
                      <p className="text-xs font-medium text-slate-300 group-hover/item:text-white transition-colors">
                        {act.description}
                      </p>
                      {act.documentName && (
                        <span className="inline-flex items-center text-[9px] font-semibold text-indigo-400 mt-1">
                          ↳ {act.documentName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips card */}
          <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-3xl space-y-3" id="study-buddy-tip-card">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs">
              <Sparkles className="h-4 w-4 animate-bounce" />
              <span>PRO STUDY TIP</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Use **RAG Chat** to scan through complex chapters, and immediately test your vocabulary retention by generating **Interactive Flashcards**. Doing active-recalls within 30 minutes dramatically boosts retention!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
