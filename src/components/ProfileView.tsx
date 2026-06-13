import React from 'react';
import { 
  ArrowLeft, GraduationCap, Flame, Award, BookOpen, Clock, 
  BarChart2, FileText, Download, Share2, LogOut, CheckCircle, HelpCircle
} from 'lucide-react';
import { LearningAnalytics, UserProfile } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  analytics: LearningAnalytics | null;
  onNavigateHome: () => void;
  onLogout: () => void;
}

export default function ProfileView({ user, analytics, onNavigateHome, onLogout }: ProfileViewProps) {
  
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { 
        year: 'numeric', month: 'long', day: 'numeric', hour: "2-digit", minute: "2-digit" 
      });
    } catch {
      return isoStr;
    }
  };

  const handlePrintNotes = () => {
    window.print();
  };

  const handleExportMarkdown = () => {
    if (!analytics) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analytics, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ai_study_buddy_analytics_${user.email}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8" id="profile-view-root">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5" id="profile-header">
        <div>
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Workspace</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-2">
            <GraduationCap className="h-6 w-6 text-indigo-400" />
            <span>Student Performance Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View learning streak progress, test scores, hours studied, and export backups.
          </p>
        </div>

        <button
          onClick={onLogout}
          id="btn-profile-logout"
          className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="profile-grid">
        
        {/* Left Column: Student Bio */}
        <div className="md:col-span-4 space-y-6" id="profile-bio-card">
          <div className="bg-slate-800/20 border border-slate-700/60 rounded-3xl p-6 text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600/30 rounded-full flex items-center justify-center border-2 border-indigo-500 text-indigo-300 text-3xl font-black mx-auto">
              {user.name ? user.name[0].toUpperCase() : 'S'}
            </div>
            
            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">{user.name || 'Demo Student'}</h3>
              <p className="text-xs text-slate-400 break-all">{user.email}</p>
            </div>

            <div className="pt-3 border-t border-slate-700/50 flex justify-center items-center gap-4 text-xs font-semibold" id="bio-stats">
              <div className="text-center">
                <span className="text-slate-500 block text-[10px] uppercase">Level</span>
                <span className="text-indigo-400 font-black">Undergrad</span>
              </div>
              <div className="border-r border-slate-700 h-6" />
              <div className="text-center">
                <span className="text-slate-500 block text-[10px] uppercase">Badge</span>
                <span className="text-emerald-400 font-black">AI Scholar</span>
              </div>
            </div>
          </div>

          {/* Streaks calendars */}
          <div className="p-5 bg-gradient-to-br from-orange-500/5 to-slate-800/10 border border-orange-500/20 rounded-3xl space-y-3">
            <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs">
              <Flame className="h-4.5 w-4.5 animate-pulse" />
              <span>LEARNING STREAK SCORE</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Your streak stands at **{analytics?.streak || 0} consecutive { (analytics?.streak || 0) === 1 ? 'day' : 'days' }**. Master definitions every day to secure an Elite 100-day scholar ranking!
            </p>
          </div>
        </div>

        {/* Right Column: Performance Graphs */}
        <div className="md:col-span-8 space-y-6" id="profile-metrics-card">
          <div className="bg-slate-800/25 border border-slate-700/60 rounded-3xl p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <BarChart2 className="h-4.5 w-4.5 text-indigo-400" />
              <span>Core Study Metrics Hub</span>
            </h2>

            {/* Performance Indicators */}
            <div className="grid grid-cols-2 gap-4" id="metrics-grid">
              <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Study clock hours</span>
                <div className="text-2xl font-black text-white mt-1">
                  {Math.round((analytics?.totalMinutes || 0) / 60)} <span className="text-xs text-slate-400 font-normal">hrs</span> { (analytics?.totalMinutes || 0) % 60 } <span className="text-xs text-slate-400 font-normal">min</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Self-Quiz Average</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {analytics?.averageQuizScore || 0}% <span className="text-xs text-slate-500 font-bold">score</span>
                </div>
              </div>
            </div>

            {/* Print & exports */}
            <div className="space-y-4 pt-6 border-t border-slate-700/50">
              <span className="text-xs font-bold text-slate-400 uppercase block">Exports & High-yield Study Tools</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handlePrintNotes}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 p-4 rounded-2xl text-left hover:border-slate-600 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-indigo-400" /> Import/Print notes
                    </h4>
                    <p className="text-[10px] text-slate-400">Print or export summary tabs directly.</p>
                  </div>
                </button>

                <button
                  onClick={handleExportMarkdown}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 p-4 rounded-2xl text-left hover:border-slate-600 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Download className="h-4 w-4 text-emerald-400" /> Download JSON Backup
                    </h4>
                    <p className="text-[10px] text-slate-400">Download active recall structures.</p>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
