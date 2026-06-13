import React, { useState } from 'react';
import { BookOpen, BrainCircuit, Sparkles, FileText, CheckCircle, ShieldAlert, GraduationCap, ArrowRight, Activity, Zap } from 'lucide-react';
import { UserProfile } from '../types';

interface LandingPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin ? { email, password } : { email, password, name };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student.demo@kalvium.community',
          name: 'Demo Student',
        }),
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Google auth failed');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans" id="landing-page-root">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 py-4 px-6" id="landing-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              AI Study <span className="text-indigo-400">Buddy</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400 hidden sm:inline px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700/50">
              ⚡ Powered by Gemini 3.5
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" id="landing-main">
        <div className="lg:col-span-7 space-y-8" id="landing-hero-copy">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-full text-indigo-300 text-sm font-medium">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>Smart Document Extraction & Active Learning</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
            Transform Your PDFs Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Interactive Study Companions</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Stop searching endlessly through tedious documents and textbooks. AI Study Buddy leverages Google Gemini API models to parse your notes instantly, generating summaries, custom quizzes, intelligent flashcards, and answering question contexts over active audio.
          </p>

          {/* Features Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8" id="landing-features-grid">
            <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/40 hover:border-indigo-500/20 transition-all">
              <div className="p-2 bg-indigo-500/10 rounded-lg w-10 h-10 flex items-center justify-center text-indigo-400 mb-3">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">Full PDF Parsing</h3>
              <p className="text-xs text-slate-400 mt-1">Upload up to 50MB of research papers or slide files. Instantly retrieve full text structures.</p>
            </div>

            <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/40 hover:border-indigo-500/20 transition-all">
              <div className="p-2 bg-purple-500/10 rounded-lg w-10 h-10 flex items-center justify-center text-purple-400 mb-3">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">Interactive RAG Search</h3>
              <p className="text-xs text-slate-400 mt-1">Engage with documents directly. Answers are pulled straight from contextual segment lines.</p>
            </div>

            <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/40 hover:border-indigo-500/20 transition-all">
              <div className="p-2 bg-pink-500/10 rounded-lg w-10 h-10 flex items-center justify-center text-pink-400 mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">Active Recalls & Quizzes</h3>
              <p className="text-xs text-slate-400 mt-1">Instantly generate flashcards, True/False sets, and blanks to master core subjects fast.</p>
            </div>

            <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/40 hover:border-indigo-500/20 transition-all">
              <div className="p-2 bg-emerald-500/10 rounded-lg w-10 h-10 flex items-center justify-center text-emerald-400 mb-3">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">AI Voice Synth</h3>
              <p className="text-xs text-slate-400 mt-1">Enable Voice synthesisation back. Study while listening anywhere via active TTS engine.</p>
            </div>
          </div>
        </div>

        {/* Authentication forms */}
        <div className="lg:col-span-5 bg-slate-800/40 backdrop-blur-md rounded-3xl border border-slate-700/50 p-8 shadow-2xl relative" id="landing-auth-card">
          <div className="absolute -top-4 right-8 bg-indigo-600 text-xs font-bold text-white px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-indigo-500/30">
            <Zap className="h-3 w-3" /> Hackathon Edition
          </div>

          <div className="flex border-b border-slate-700 mb-6" id="auth-tabs">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              type="button"
              id="btn-switch-login"
              className={`flex-1 pb-3 text-center font-semibold text-sm ${
                isLogin ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              type="button"
              id="btn-switch-signup"
              className={`flex-1 pb-3 text-center font-semibold text-sm ${
                !isLogin ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mb-1" id="auth-title">
            {isLogin ? 'Welcome Back!' : 'Start Learning Faster'}
          </h2>
          <p className="text-xs text-slate-400 mb-6" id="auth-subtitle">
            {isLogin ? 'Log in to access your study books and logs.' : 'Create your secure account to persist document libraries.'}
          </p>

          {error && (
            <div className="p-3.5 mb-5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start space-x-2" id="auth-error-alert">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300" htmlFor="auth-name-input">Full Name</label>
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300" htmlFor="auth-email-input">Email Address</label>
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300" htmlFor="auth-password-input">Password</label>
                {isLogin && <span className="text-[10px] text-indigo-400 hover:underline cursor-pointer">Forgot?</span>}
              </div>
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6" id="auth-divider">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-850 px-3 text-slate-400">Or Continue With</span>
            </div>
          </div>

          <button
            id="google-auth-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.253-3.133C18.25 1.763 15.47 1 12.24 1c-6.077 0-11 4.923-11 11s4.923 11 11 11c6.34 0 10.55-4.444 10.55-10.74 0-.72-.08-1.27-.175-1.685H12.24z"
              />
            </svg>
            <span>Sign In with Kalvium Google</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-6 text-center text-slate-500 text-xs bg-slate-950 mt-auto" id="landing-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI Study Buddy. Built for global hackathon. All rights reserved.</p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-400 cursor-pointer">Security</span>
            <span className="hover:text-slate-400 cursor-pointer">Supabase Stack</span>
            <span className="hover:text-slate-400 cursor-pointer">Gemini AI Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
