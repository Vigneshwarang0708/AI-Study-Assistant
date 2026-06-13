import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, LayoutDashboard, UploadCloud, MessageSquare, 
  Sparkles, ClipboardCheck, Award, GraduationCap, LogOut, 
  User, Menu, X, HelpCircle, Loader2, RefreshCw
} from 'lucide-react';
import { DocumentMetadata, LearningAnalytics, UserProfile } from './types';

// Import sub-components
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import UploadView from './components/UploadView';
import ChatView from './components/ChatView';
import SummaryView from './components/SummaryView';
import QuizView from './components/QuizView';
import FlashcardsView from './components/FlashcardsView';
import ProfileView from './components/ProfileView';

type ViewType = 'dashboard' | 'upload' | 'chat' | 'summary' | 'quiz' | 'flashcards' | 'profile';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedDoc, setSelectedDoc] = useState<DocumentMetadata | null>(null);
  
  // Data lists
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize session from LocalStorage
  useEffect(() => {
    const cached = localStorage.getItem('ai_study_buddy_session');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse cached session:", e);
      }
    }
  }, []);

  // Fetch documents and analytics when user changes or refetches
  const fetchWorkspaceData = async () => {
    if (!user || !user.isLoggedIn) return;
    setFetchingData(true);
    try {
      // 1. Fetch Docs list
      const docsRes = await fetch('/api/docs', {
        headers: {
          'user-email': user.email
        }
      });
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }

      // 2. Fetch Analytics
      const analyticsRes = await fetch('/api/study/analytics', {
        headers: {
          'user-email': user.email
        }
      });
      if (analyticsRes.ok) {
        const stats = await analyticsRes.json();
        setAnalytics(stats);
      }
    } catch (e) {
      console.error("Workspace details fetch failed:", e);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    if (user && user.isLoggedIn) {
      fetchWorkspaceData();
    } else {
      setDocuments([]);
      setAnalytics(null);
    }
  }, [user]);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('ai_study_buddy_session', JSON.stringify(profile));
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ai_study_buddy_session');
    setActiveView('dashboard');
    setSelectedDoc(null);
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/docs/${docId}`, {
        method: 'DELETE',
        headers: {
          'user-email': user.email
        }
      });
      if (response.ok) {
        // Remove locally from state list
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setActiveView('dashboard');
        }
        // Refresh analytics timeline
        fetchWorkspaceData();
      }
    } catch (err) {
      console.error("Failed to delete PDF:", err);
    }
  };

  const handleSelectDoc = (docId: string, view: 'chat' | 'summary' | 'quiz' | 'flashcards') => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      setSelectedDoc(doc);
      setActiveView(view);
    }
  };

  // Nav actions
  const navigateTo = (view: ViewType) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  // Render content based on current view route
  const renderContent = () => {
    if (!user || !user.isLoggedIn) {
      return <LandingPage onLoginSuccess={handleLoginSuccess} />;
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            documents={documents}
            analytics={analytics}
            onSelectDocument={handleSelectDoc}
            onDeleteDocument={handleDeleteDoc}
            onNavigateToUpload={() => navigateTo('upload')}
            onRefreshStats={fetchWorkspaceData}
          />
        );
      case 'upload':
        return (
          <UploadView 
            userEmail={user.email}
            onNavigateHome={() => navigateTo('dashboard')}
            onUploadSuccess={(newDoc) => {
              setDocuments((prev) => [newDoc, ...prev]);
              fetchWorkspaceData(); // refresh analytics metrics
            }}
          />
        );
      case 'chat':
        return selectedDoc ? (
          <ChatView 
            document={selectedDoc}
            userEmail={user.email}
            onNavigateHome={() => navigateTo('dashboard')}
          />
        ) : (
          <div className="text-center py-10">Select a PDF on the dashboard to chat.</div>
        );
      case 'summary':
        return selectedDoc ? (
          <SummaryView 
            document={selectedDoc}
            userEmail={user.email}
            onNavigateHome={() => navigateTo('dashboard')}
          />
        ) : (
          <div className="text-center py-10">Select a PDF to view summary.</div>
        );
      case 'quiz':
        return selectedDoc ? (
          <QuizView 
            document={selectedDoc}
            userEmail={user.email}
            onNavigateHome={() => navigateTo('dashboard')}
            onQuizCompleted={fetchWorkspaceData}
          />
        ) : (
          <div className="text-center py-10">Select a PDF to take a quiz.</div>
        );
      case 'flashcards':
        return selectedDoc ? (
          <FlashcardsView 
            document={selectedDoc}
            userEmail={user.email}
            onCardLearnedStateChanged={fetchWorkspaceData}
            onNavigateHome={() => navigateTo('dashboard')}
          />
        ) : (
          <div className="text-center py-10">Select a PDF to practice flashcards.</div>
        );
      case 'profile':
        return (
          <ProfileView 
            user={user}
            analytics={analytics}
            onNavigateHome={() => navigateTo('dashboard')}
            onLogout={handleLogout}
          />
        );
      default:
        return <div className="text-center py-12">View not found.</div>;
    }
  };

  // If user is not logged in, render Landing without structural UI wrapper
  if (!user || !user.isLoggedIn) {
    return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root">
      
      {/* Structural Desktop Navigation header */}
      <header className="border-b border-slate-900 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 py-3.5 px-6" id="app-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateTo('dashboard')}>
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                <BrainCircuit className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                AI Study <span className="text-indigo-400 font-medium">Buddy</span>
              </span>
            </div>

            {/* Nav items */}
            <nav className="hidden md:flex items-center space-x-1 text-xs font-semibold" id="desktop-nav">
              <button
                onClick={() => navigateTo('dashboard')}
                id="link-dash"
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeView === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigateTo('upload')}
                id="link-upload"
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeView === 'upload' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload material
              </button>
              <button
                onClick={() => navigateTo('profile')}
                id="link-profile"
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                  activeView === 'profile' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Analytics Profile
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick Loading info */}
            {fetchingData && (
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin text-indigo-500" />
                Updating stats...
              </span>
            )}

            {/* Profile Avatar link */}
            <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
              <button 
                onClick={() => navigateTo('profile')}
                id="btn-nav-user"
                className="w-8.5 h-8.5 bg-slate-800 hover:bg-slate-700 transition-colors rounded-full flex items-center justify-center text-xs font-black cursor-pointer text-indigo-300 border border-indigo-500/30"
              >
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </button>
              
              <button
                onClick={handleLogout}
                id="btn-nav-logout"
                title="Log out of session"
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer hidden sm:flex"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                id="btn-mobile-trigger"
                className="p-2 text-slate-400 hover:text-white md:hidden hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile structural overlay menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-900 bg-slate-950 px-6 py-4 space-y-2 animate-fade-in" id="mobile-nav-panel">
          <button
            onClick={() => navigateTo('dashboard')}
            className={`w-full text-left p-3 rounded-xl block font-semibold text-xs transition-colors ${
              activeView === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigateTo('upload')}
            className={`w-full text-left p-3 rounded-xl block font-semibold text-xs transition-colors ${
              activeView === 'upload' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400'
            }`}
          >
            Upload PDF
          </button>
          <button
            onClick={() => navigateTo('profile')}
            className={`w-full text-left p-3 rounded-xl block font-semibold text-xs transition-colors ${
              activeView === 'profile' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400'
            }`}
          >
            Scholar Profile
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left p-3 rounded-xl block font-semibold text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Log Out
          </button>
        </div>
      )}

      {/* Main app panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8" id="app-content-box">
        {renderContent()}
      </main>

      {/* Global app footer */}
      <footer className="border-t border-slate-900 py-5 text-center text-slate-600 text-[10px] bg-slate-950 mt-auto" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-6 gap-3">
          <p>© 2026 AI Study Buddy Workspace. Powered by serverless RAG chunk indexers & Gemini 3.5 AI flash modeling.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Tutor Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
