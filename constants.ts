import { PitchPrompt, DifficultyLevel } from './types';

export const PITCH_PROMPTS: PitchPrompt[] = [
  {
    id: 'ad1',
    text: 'Pitch a bold rebranding concept to a conservative C-Suite.',
    category: 'Sales',
    durationTarget: 60,
  },
  {
    id: 'ad2',
    text: 'Explain your role as a Creative/Strategist to a new client.',
    category: 'General',
    durationTarget: 30,
  },
  {
    id: 'ad3',
    text: 'Defend a risky campaign idea that data doesnt explicitly support.',
    category: 'Startup',
    durationTarget: 45,
  },
  {
    id: 'ad4',
    text: 'Tell me about yourself (Agency Portfolio Review intro).',
    category: 'Interview',
    durationTarget: 60,
  },
  {
    id: 'ad5',
    text: 'The client hates the storyboard. Convince them to trust the vision.',
    category: 'Sales',
    durationTarget: 30,
  },
];

export const STORAGE_KEY = 'ads_pitch_ai_history_v2';

export const RECEIVER_PERSONAS: Record<DifficultyLevel, { name: string; description: string; multiplier: number; context: string }> = {
  Easy: {
    name: "The Supporter",
    description: "Warm, encouraging, and patient. An entry-level peer or friendly mentor.",
    multiplier: 1.0,
    context: "You are a supportive, enthusiastic junior colleague. You are easy to impress and focus on the positives. Be encouraging in your feedback.",
  },
  Medium: {
    name: "The Professional",
    description: "Objective, busy, and standard. A mid-level manager or standard client.",
    multiplier: 1.5,
    context: "You are a professional, objective Marketing Director. You are fair but expect clarity and professionalism. You dislike fluff.",
  },
  Hard: {
    name: "The Skeptic",
    description: "Cold, impatient, and critical. A C-level exec or hostile procurement officer.",
    multiplier: 2.5,
    context: "You are a busy, skeptical C-suite Executive or Procurement Officer. You have no patience for rambling. You are looking for reasons to say 'No'. Be harsh, critical, and demand high ROI.",
  }
};