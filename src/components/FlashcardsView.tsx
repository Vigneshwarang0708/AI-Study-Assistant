import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Award, Sparkles, AlertCircle, Loader2, 
  ChevronLeft, ChevronRight, HelpCircle, CheckCircle, RefreshCw
} from 'lucide-react';
import { Flashcard, DocumentMetadata } from '../types';
import { getApiUrl } from '../utils';

interface FlashcardsViewProps {
  document: DocumentMetadata;
  userEmail: string;
  onNavigateHome: () => void;
  onCardLearnedStateChanged: () => void;
}

export default function FlashcardsView({
  document,
  userEmail,
  onNavigateHome,
  onCardLearnedStateChanged
}: FlashcardsViewProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  
  // Carousel pointers
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    setErrorText('');
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);

    try {
      const response = await fetch(getApiUrl('/api/study/flashcards'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-email': userEmail,
        },
        body: JSON.stringify({ documentId: document.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to design flashcard deck.');
      }

      setCards(data);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Flashcards generation crashed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [document.id]);

  const handleNext = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleToggleLearned = async () => {
    if (cards.length === 0) return;
    
    const card = cards[currentIndex];
    const newLearnedState = !card.learned;

    try {
      // Optimistic update
      setCards((prev) =>
        prev.map((c, idx) => (idx === currentIndex ? { ...c, learned: newLearnedState } : c))
      );

      const response = await fetch(getApiUrl('/api/study/flashcards/update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-email': userEmail,
        },
        body: JSON.stringify({
          documentId: document.id,
          cardId: card.id,
          learned: newLearnedState,
        }),
      });

      if (response.ok) {
        onCardLearnedStateChanged();
      }
    } catch (err) {
      console.error("Failed to update learned state:", err);
    }
  };

  const activeCard = cards[currentIndex];
  const learnedCount = cards.filter((c) => c.learned).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="flash-cards-view-root">
      {/* Upper header */}
      <div className="flex border-b border-slate-800 pb-4 justify-between items-center" id="flashcards-header">
        <div className="space-y-1">
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Workspace</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1.5">
            <Award className="h-5.5 w-5.5 text-indigo-400" />
            <span>Active Recall Flashcards</span>
          </h1>
          <p className="text-xs text-slate-400">
            Study deck: <span className="text-indigo-400 font-semibold">{document.name}</span>
          </p>
        </div>
      </div>

      {errorText && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start space-x-2.5" id="flashcards-error">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Failed to build flashcard deck</p>
            <p className="text-slate-400">{errorText}</p>
          </div>
        </div>
      )}

      {/* Loading cards overlay */}
      {loading && (
        <div className="p-20 border border-slate-700/50 bg-slate-900/40 rounded-3xl text-center space-y-5 shadow-inner" id="flashcards-loader">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-base">Forging flashcard recall metrics...</h3>
            <p className="text-xs text-indigo-400 animate-pulse">Analyzing vocabulary terms, historical dates, and chemical laws.</p>
          </div>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
            Please wait 10-15 seconds. Creating flashcards takes shorter, as explanation prompts are concise.
          </p>
        </div>
      )}

      {/* FLASHCARD GRID & RECALL BOARD */}
      {!loading && cards.length > 0 && (
        <div className="space-y-6" id="flash-cards-carousel-container">
          
          {/* Deck Progress Bar */}
          <div className="bg-slate-800/20 border border-slate-700/40 rounded-2xl p-4 flex items-center justify-between" id="flashcards-progress-bar">
            <div className="space-y-1 text-left">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Deck Memorization progress</span>
              <p className="text-xs font-bold text-white">{learnedCount} of {cards.length} cards mastered ({Math.round((learnedCount / cards.length) * 100)}%)</p>
            </div>
            
            <div className="w-1/2 h-2.5 bg-slate-800 border border-slate-700 rounded-full overflow-hidden shrink-0">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${(learnedCount / cards.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard 3D perspective Box */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            id="flashcard-card-box"
            className="h-80 w-full relative cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            {/* Card inner */}
            <div 
              className="w-full h-full duration-500 rounded-3xl border border-slate-700/60 shadow-2xl relative flex flex-col justify-between p-6 md:p-8"
              style={{ 
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'none',
                backgroundColor: isFlipped ? '#25213b' : '#141b2d', // distinct color on back
              }}
            >
              
              {/* 1. FRONT OF CARD */}
              <div 
                className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <span className="bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-400">ACTIVE RECALL</span>
                </div>

                <div className="text-center py-6">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Question / term</span>
                  <p className="text-base sm:text-lg font-bold text-white leading-normal max-w-md mx-auto">
                    {activeCard.question}
                  </p>
                </div>

                <div className="text-center text-[11px] text-slate-400 font-medium">
                  💡 Tap card anywhere to flip and see answer
                </div>
              </div>

              {/* 2. BACK OF CARD */}
              <div 
                className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between"
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold uppercase tracking-widest leading-none">
                  <span>Explanation reveal</span>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">EXPLANATION</span>
                </div>

                <div className="text-center py-6 px-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Answer / Definition</span>
                  <p className="text-sm sm:text-base font-bold text-slate-200 leading-relaxed max-w-md mx-auto h-[120px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    {activeCard.answer}
                  </p>
                </div>

                <div className="text-center text-[11px] text-indigo-300 font-semibold">
                  💡 Tap card again to return to question
                </div>
              </div>

            </div>
          </div>

          {/* Flashcard actions panel */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between" id="flashcard-buttons">
            <button
              onClick={handleToggleLearned}
              id="flash-mastered-btn"
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                activeCard.learned
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <CheckCircle className={`h-4.5 w-4.5 ${activeCard.learned ? 'fill-emerald-500 text-slate-950' : ''}`} />
              <span>{activeCard.learned ? 'Mastered!' : 'Mark as Mastered'}</span>
            </button>

            {/* Navigations */}
            <div className="flex space-x-2.5 w-full sm:w-auto" id="flashcard-arrows">
              <button
                onClick={handlePrev}
                id="btn-flash-prev"
                className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded-xl p-3 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Previous Card"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                id="btn-flash-flip"
                className="flex-1 sm:flex-initial bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 font-bold text-xs uppercase border border-indigo-500/20 rounded-xl px-5 py-2.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                Flip card
              </button>

              <button
                onClick={handleNext}
                id="btn-flash-next"
                className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded-xl p-3 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Next Card"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
