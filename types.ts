export type DifficultyLevel = 'Ally' | 'Pragmatist' | 'Burned' | 'Skeptic' | 'Visionary' | 'Challenger';

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
  audioUrl?: string; // Stores the first audio (or combined if we merge)
  responseAudioUrl?: string; // Stores the second audio
  objection: string; // The objection raised by the AI
  transcription: string;
  scores: EvaluationScores;
  feedback: EvaluationFeedback;
  duration: number; // actual duration in seconds
  fillerWordCount: number;
  difficulty: DifficultyLevel;
  xpEarned: number;
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING_PITCH = 'RECORDING_PITCH',
  GENERATING_OBJECTION = 'GENERATING_OBJECTION',
  VIEWING_OBJECTION = 'VIEWING_OBJECTION',
  RECORDING_RESPONSE = 'RECORDING_RESPONSE',
  PROCESSING_FINAL = 'PROCESSING_FINAL',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY',
}