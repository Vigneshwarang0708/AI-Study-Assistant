/**
 * Type declarations for AI Study Buddy
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  sources?: string[];
}

export interface DocumentMetadata {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  textLength: number;
}

export interface DocumentDetail extends DocumentMetadata {
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'tf' | 'blank';
  question: string;
  options?: string[]; // only for MCQ
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface QuizAttempt {
  id: string;
  documentId: string;
  documentName: string;
  date: string;
  questions: QuizQuestion[];
  score: number;
  total: number;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  learned: boolean;
}

export interface Formula {
  name: string;
  formula: string;
  description: string;
}

export interface KeyConcept {
  concept: string;
  explanation: string;
}

export interface Definition {
  term: string;
  definition: string;
}

export interface StudySummary {
  documentId: string;
  shortSummary: string;
  detailedSummary: string;
  keyConcepts: KeyConcept[];
  definitions: Definition[];
  examNotes: string[];
  formulas: Formula[];
}

export interface LearningAnalytics {
  streak: number;
  lastActive: string;
  totalMinutes: number;
  totalQuizzesTaken: number;
  averageQuizScore: number; // percentage
  flashcardsLearnedCount: number;
  recentActivity: {
    id: string;
    type: 'upload' | 'chat' | 'summary' | 'quiz' | 'flashcard';
    description: string;
    timestamp: string;
    documentName: string;
  }[];
}

export interface UserProfile {
  email: string;
  name: string;
  isLoggedIn: boolean;
}
