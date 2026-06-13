import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ClipboardCheck, Sparkles, HelpCircle, 
  CheckCircle, XCircle, ChevronRight, Loader2, AlertCircle, 
  Award, RefreshCw, BarChart2, Info
} from 'lucide-react';
import { QuizQuestion, DocumentMetadata } from '../types';

interface QuizViewProps {
  document: DocumentMetadata;
  userEmail: string;
  onNavigateHome: () => void;
  onQuizCompleted: () => void;
}

export default function QuizView({ document, userEmail, onNavigateHome, onQuizCompleted }: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  
  // Interactive quiz states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [blankInput, setBlankInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Results logging
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [postingStats, setPostingStats] = useState(false);

  const fetchQuiz = async () => {
    setLoading(true);
    setErrorText('');
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setQuizFinished(false);
    setHasSubmitted(false);
    setSelectedOption(null);
    setBlankInput('');

    try {
      const response = await fetch('/api/study/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-email': userEmail
        },
        body: JSON.stringify({ documentId: document.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz.');
      }

      setQuestions(data);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Quiz creation crashed. Please configure a valid API key.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [document.id]);

  const handleSelectOption = (opt: string) => {
    if (hasSubmitted) return;
    setSelectedOption(opt);
  };

  const handleSubmitAnswer = () => {
    if (hasSubmitted || questions.length === 0) return;

    const currentQuestion = questions[currentIndex];
    let isCorrect = false;

    if (currentQuestion.type === 'mcq') {
      if (!selectedOption) return;
      isCorrect = selectedOption.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    } else if (currentQuestion.type === 'tf') {
      if (!selectedOption) return;
      isCorrect = selectedOption.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    } else {
      if (!blankInput.trim()) return;
      // Simple containing-word or exact match tolerance
      const userClean = blankInput.trim().toLowerCase();
      const corClean = currentQuestion.correctAnswer.trim().toLowerCase();
      isCorrect = userClean === corClean || corClean.includes(userClean);
    }

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setHasSubmitted(true);
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setBlankInput('');
    setHasSubmitted(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      submitScore();
    }
  };

  const submitScore = async () => {
    setPostingStats(true);
    try {
      const response = await fetch('/api/study/quiz/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-email': userEmail
        },
        body: JSON.stringify({
          documentId: document.id,
          score: score + (checkLastQuestionWeight() ? 1 : 0),
          total: questions.length
        })
      });

      if (response.ok) {
        onQuizCompleted();
      }
    } catch (e) {
      console.error("Failed to post score to analytics", e);
    } finally {
      setPostingStats(false);
    }
  };

  const checkLastQuestionWeight = () => {
    // Helper to evaluate last score correction in active render loop state safely
    if (hasSubmitted) return false; // Already submitted beforehand
    return false;
  };

  const activeQuestion = questions[currentIndex];
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex) / questions.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="quiz-view-root">
      
      {/* Title Header */}
      <div className="flex border-b border-slate-800 pb-4 justify-between items-center" id="quiz-header">
        <div className="space-y-1">
          <button
            onClick={onNavigateHome}
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Workspace</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1.5">
            <ClipboardCheck className="h-5.5 w-5.5 text-indigo-400" />
            <span>Interactive Assessment Quizzes</span>
          </h1>
          <p className="text-xs text-slate-400">
            Topic resource: <span className="text-indigo-400 font-semibold">{document.name}</span>
          </p>
        </div>
      </div>

      {errorText && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start space-x-2.5" id="quiz-error">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Failed to build test template</p>
            <p className="text-slate-400">{errorText}</p>
          </div>
        </div>
      )}

      {/* Loading quiz panel */}
      {loading && (
        <div className="p-20 border border-slate-700/50 bg-slate-900/40 rounded-3xl text-center space-y-5 shadow-inner" id="quiz-loader">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-base">Structuring Active Recall Quiz...</h3>
            <p className="text-xs text-indigo-400 animate-pulse">Our RAG compiler is validating questions: MCQs, True/False, and Blanks.</p>
          </div>
          <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
            Please stand by. This takes around 10-20 seconds as Gemini generates comprehensive educational explanations.
          </p>
        </div>
      )}

      {/* QUIZ FORM */}
      {!loading && questions.length > 0 && !quizFinished && (
        <div className="bg-slate-800/25 border border-slate-700/60 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl" id="quiz-card">
          
          {/* Progress Header bar */}
          <div className="space-y-2.5" id="quiz-progress-bar">
            <div className="flex justify-between text-xs text-slate-400 font-semibold">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}% Completed</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Active Question Box */}
          <div className="space-y-4 pt-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase rounded-lg">
              <Sparkles className="h-3 w-3" />
              <span>{activeQuestion.type === 'mcq' ? 'Multiple Choice' : activeQuestion.type === 'tf' ? 'True / False' : 'Fill in the Blank'}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
              {activeQuestion.question}
            </h2>
          </div>

          {/* ANSWER INPUT RENDERERS */}
          <div className="space-y-3 pt-2" id="question-responses">
            {/* 1. MCQ OPTIONS */}
            {activeQuestion.type === 'mcq' && activeQuestion.options?.map((opt, oIdx) => {
              const isSelected = selectedOption === opt;
              const isCorrectOpt = opt === activeQuestion.correctAnswer;
              
              let btnStyle = 'border-slate-700 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-550 text-slate-300';
              if (isSelected && !hasSubmitted) {
                btnStyle = 'border-indigo-500 bg-indigo-500/10 text-indigo-300';
              } else if (hasSubmitted) {
                if (isCorrectOpt) {
                  btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold';
                } else if (isSelected) {
                  btnStyle = 'border-rose-500 bg-rose-500/10 text-rose-300';
                } else {
                  btnStyle = 'border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed';
                }
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  id={`opt-${oIdx}`}
                  onClick={() => handleSelectOption(opt)}
                  disabled={hasSubmitted}
                  className={`w-full text-left p-4 rounded-xl text-xs sm:text-sm border transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {hasSubmitted && isCorrectOpt && <CheckCircle className="h-4.5 w-4.5 text-emerald-500 inline ml-2 shrink-0" />}
                  {hasSubmitted && isSelected && !isCorrectOpt && <XCircle className="h-4.5 w-4.5 text-rose-500 inline ml-2 shrink-0" />}
                </button>
              );
            })}

            {/* 2. TRUE OR FALSE OPTIONS */}
            {activeQuestion.type === 'tf' && ['True', 'False'].map((opt, oIdx) => {
              const optVal = opt.toLowerCase();
              const isSelected = selectedOption === optVal;
              const isCorrectOpt = optVal === activeQuestion.correctAnswer.toLowerCase();

              let btnStyle = 'border-slate-700 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-550 text-slate-300';
              if (isSelected && !hasSubmitted) {
                btnStyle = 'border-indigo-500 bg-indigo-500/10 text-indigo-300';
              } else if (hasSubmitted) {
                if (isCorrectOpt) {
                  btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold';
                } else if (isSelected) {
                  btnStyle = 'border-rose-500 bg-rose-500/10 text-rose-300';
                } else {
                  btnStyle = 'border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed';
                }
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  id={`tf-opt-${oIdx}`}
                  onClick={() => handleSelectOption(optVal)}
                  disabled={hasSubmitted}
                  className={`w-full text-left p-4 rounded-xl text-xs sm:text-sm border transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {hasSubmitted && isCorrectOpt && <CheckCircle className="h-4.5 w-4.5 text-emerald-500 inline ml-2 shrink-0" />}
                  {hasSubmitted && isSelected && !isCorrectOpt && <XCircle className="h-4.5 w-4.5 text-rose-500 inline ml-2 shrink-0" />}
                </button>
              );
            })}

            {/* 3. BLANKS FILL INPUTS */}
            {activeQuestion.type === 'blank' && (
              <div className="space-y-3" id="blank-form-wrapper">
                <input
                  id="blank-text-input"
                  type="text"
                  value={blankInput}
                  onChange={(e) => setBlankInput(e.target.value)}
                  placeholder="Type your single keyword or short direct answer..."
                  disabled={hasSubmitted}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-200 placeholder-slate-550 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                
                {hasSubmitted && (
                  <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-1.5 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">System Verification Reference</span>
                    <p className="text-slate-300">
                      Your answer: <span className="font-bold text-white italic">"{blankInput}"</span>
                    </p>
                    <p className="text-emerald-400 font-semibold flex items-center gap-1.5 pt-0.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Correct Reference phrase: <strong className="text-white">"{activeQuestion.correctAnswer}"</strong></span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACCORDION EXPLANATION REVEALER ON SUBMIT */}
          {hasSubmitted && (
            <div className="p-5 bg-indigo-500/5 border border-indigo-500/15 rounded-2.5xl space-y-2 animate-fade-in text-xs leading-relaxed" id="quiz-explanation">
              <h4 className="font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Answer & Logical Explanation
              </h4>
              <p className="text-slate-300 font-medium">
                {activeQuestion.explanation}
              </p>
            </div>
          )}

          {/* Action buttons (Submit / Next) */}
          <div className="flex justify-end pt-4 border-t border-slate-700/50" id="quiz-actions-block">
            {!hasSubmitted ? (
              <button
                id="btn-quiz-submit"
                onClick={handleSubmitAnswer}
                disabled={
                  (activeQuestion.type === 'mcq' && !selectedOption) ||
                  (activeQuestion.type === 'tf' && !selectedOption) ||
                  (activeQuestion.type === 'blank' && !blankInput.trim())
                }
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/10 cursor-pointer transition-colors"
              >
                Submit Answer
              </button>
            ) : (
              <button
                id="btn-quiz-next"
                onClick={handleNextQuestion}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-colors shadow-lg shadow-indigo-600/10"
              >
                <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

        </div>
      )}

      {/* RESULTS DISPLAY OUTRO */}
      {quizFinished && (
        <div className="bg-slate-800/25 border border-slate-700/60 rounded-3xl p-8 text-center space-y-6 shadow-xl animate-scale-up" id="quiz-outro">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-full inline-block text-indigo-400">
            <Award className="h-10 w-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Quiz Completed Successfully!</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your test response data has been safely formulated and added to your study metrics.
            </p>
          </div>

          {/* Big Score counter */}
          <div className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-3xl inline-block px-10" id="score-counter">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Final Scorecard</span>
            <div className="text-4xl font-black text-indigo-400">
              {score} <span className="text-lg text-slate-500 font-bold">/ {questions.length}</span>
            </div>
            <span className="text-xs font-semibold text-slate-300 mt-1 block">
              {Math.round((score / questions.length) * 100)}% Accuracy
            </span>
          </div>

          {/* Performance feedback */}
          <p className="text-slate-300 italic text-xs max-w-md mx-auto leading-relaxed">
            {score === questions.length 
              ? "Perfect score! You have fully mastered every concept introduced in this material document."
              : score >= questions.length * 0.7 
              ? "Great job! You have a solid grasp over most core topics. Re-run active recall flashcards to patch any vocabulary gaps."
              : "Good try! Retake this quiz or consult RAG Search chat assistant for complex page sections to level up your score average."
            }
          </p>

          <div className="flex justify-center gap-3 pt-4 border-t border-slate-700/50" id="quiz-outro-actions">
            <button
              onClick={fetchQuiz}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retake Quiz</span>
            </button>
            <button
              onClick={onNavigateHome}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
