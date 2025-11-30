export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface PitchPrompt {
  id: string;
  text: string;
  category: 'General' | 'Sales' | 'Interview' | 'Startup';
  durationTarget: number; // in seconds (default)
}

export interface EvaluationScores {
  overall: number;
  structure: number;
  clarity: number;
  brevity: number;
  delivery: number;
}

export interface EvaluationFeedback {
  structure: string;
  clarity: string;
  brevity: string;
  delivery: string;
  summary: string;
}

export interface PitchSession {
  id: string;
  timestamp: number;
  prompt: PitchPrompt;
  audioUrl?: string;
  transcription: string;
  scores: EvaluationScores;
  feedback: EvaluationFeedback;
  duration: number; // actual duration in seconds
  fillerWordCount: number;
  difficulty: DifficultyLevel; // New: Game difficulty
  xpEarned: number; // New: Gamified points
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY',
}