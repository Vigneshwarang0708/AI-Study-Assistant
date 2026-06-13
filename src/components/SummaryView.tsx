import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Sparkles, BookOpen, Clock, Award, 
  HelpCircle, ChevronRight, FileText, Loader2, Info, ListChecks, Code, Database, AlertTriangle
} from 'lucide-react';
import { StudySummary, DocumentMetadata } from '../types';

interface SummaryViewProps {
  document: DocumentMetadata;
  userEmail: string;
  onNavigateHome: () => void;
}

type TabType = 'overview' | 'concepts' | 'exam';

export default function SummaryView({ document, userEmail, onNavigateHome }: SummaryViewProps) {
  const [summaryData, setSummaryData] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorError, setErrorError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const fetchSummary = async () => {
    setLoading(true);
    setErrorError('');
    try {
      const response = await fetch('/api/study/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-email': userEmail,
        },
        body: JSON.stringify({ documentId: document.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summarization details.');
      }

      setSummaryData(data);
    } catch (err: any) {
      console.error(err);
      setErrorError(err.message || 'Generation crashed. Ensure your API key is correctly active in Secrets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [document.id]);

  return (
    <div className="space-y-6" id="summary-view-root">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5" id="summary-header">
        <div className="space-y-1">
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-2">
            <Sparkles className="h-5.5 w-5.5 text-indigo-400" />
            <span>AI Smart Summary Generator</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Resource: <span className="text-indigo-300 font-semibold">{document.name}</span>
          </p>
        </div>

        {summaryData && (
          <button
            onClick={fetchSummary}
            className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
            disabled={loading}
          >
            <Loader2 className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Regenerate Summary
          </button>
        )}
      </div>

      {errorError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start space-x-2.5 max-w-2xl mx-auto" id="summary-error">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Summary generation was interrupted</p>
            <p className="text-slate-400">{errorError}</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="p-20 border border-slate-700/60 bg-slate-900/40 rounded-3xl text-center space-y-5 shadow-inner" id="summary-loader">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-base">Weaving study indexes...</h3>
            <p className="text-xs text-indigo-400 animate-pulse">Gemini is compiling structured summaries, core formulas, and vocab terms.</p>
          </div>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
            Generating full schemas can take 15-25 seconds depending on document length. Please leave this tab active!
          </p>
        </div>
      )}

      {/* Structured study data */}
      {!loading && summaryData && (
        <div className="space-y-6" id="summary-result-content">
          
          {/* Navigation Tab controllers */}
          <div className="flex border-b border-slate-850 gap-2 overflow-x-auto pb-px" id="summary-tab-buttons">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-4 font-semibold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'overview' 
                  ? 'text-indigo-400 border-indigo-500 font-bold' 
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Overview & Full Notes
            </button>
            <button
              onClick={() => setActiveTab('concepts')}
              className={`pb-3 px-4 font-semibold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'concepts' 
                  ? 'text-indigo-400 border-indigo-500 font-bold' 
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Key Concepts & Vocabulary
            </button>
            <button
              onClick={() => setActiveTab('exam')}
              className={`pb-3 px-4 font-semibold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'exam' 
                  ? 'text-indigo-400 border-indigo-500 font-bold' 
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              Exam Notes & Equations
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6" id="active-tab-container">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in" id="tab-overview">
                {/* Short Brief Summary */}
                <div className="p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl space-y-2">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>Executive Summary</span>
                  </h3>
                  <p className="text-slate-200 text-sm leading-relaxed font-medium">
                    {summaryData.shortSummary}
                  </p>
                </div>

                {/* Detailed study notes */}
                <div className="p-6 bg-slate-800/25 border border-slate-700/60 rounded-3xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-700 pb-3">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <span>Comprehensive Notes Study Guide</span>
                  </h3>
                  <div className="prose prose-sm prose-invert text-slate-300 leading-relaxed max-w-none text-xs sm:text-sm">
                    {summaryData.detailedSummary.split('\n\n').map((block, bIdx) => (
                      <p key={bIdx} className="mb-4 whitespace-pre-wrap">
                        {block}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: KEY CONCEPTS & VOCAB */}
            {activeTab === 'concepts' && (
              <div className="space-y-6 animate-fade-in" id="tab-concepts">
                
                {/* Key Concepts Grid */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Fundamental Concepts</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {summaryData.keyConcepts.map((item, idx) => (
                      <div key={idx} className="p-5 bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 rounded-2xl space-y-1.5 transition-colors">
                        <span className="text-[10px] font-bold text-indigo-400">CONCEPT {idx + 1}</span>
                        <h4 className="font-bold text-white text-sm">{item.concept}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Glossary Definitions */}
                <div className="space-y-4 pt-4 border-t border-slate-850">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <Info className="h-4.5 w-4.5" />
                    <span>Terminology Glossary</span>
                  </h3>
                  
                  {summaryData.definitions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No glossary definitions parsed.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {summaryData.definitions.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl space-y-1">
                          <h5 className="font-bold text-white text-xs">{item.term}</h5>
                          <p className="text-[11px] text-slate-400 leading-snug">{item.definition}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: EXAM & FORMULAS */}
            {activeTab === 'exam' && (
              <div className="space-y-6 animate-fade-in" id="tab-exam">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* High Yield Exam Tips */}
                  <div className="p-6 bg-slate-800/20 border border-slate-700/50 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-700 pb-3">
                      <ListChecks className="h-5 w-5" />
                      <span>High-Yield Exam Notes</span>
                    </h3>
                    <ul className="space-y-3">
                      {summaryData.examNotes.map((note, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5">
                          <span className="p-1 bg-pink-500/15 rounded-md text-pink-400 text-[10px] font-bold mt-0.5 shrink-0 px-2">
                            TIP {idx + 1}
                          </span>
                          <span className="leading-relaxed">{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Core Equations & Formulas */}
                  <div className="p-6 bg-slate-800/20 border border-slate-700/50 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-700 pb-3">
                      <Code className="h-5 w-5" />
                      <span>Mathematical Formulas & Laws</span>
                    </h3>

                    {(!summaryData.formulas || summaryData.formulas.length === 0) ? (
                      <div className="text-center py-10 text-slate-500 space-y-2">
                        <p className="text-xs">No explicit mathematical equations found in material context.</p>
                        <p className="text-[10px]">Formulas are generated when parsing calculus, physics, chemistry, or statistics files.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {summaryData.formulas.map((law, idx) => (
                          <div key={idx} className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-yellow-500">{law.name}</span>
                            </div>
                            <div className="p-2.5 bg-slate-950 font-mono text-center rounded-lg text-emerald-400 text-sm overflow-x-auto">
                              {law.formula}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{law.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
