import { PitchPrompt, DifficultyLevel } from './types';

export const PITCH_PROMPTS: PitchPrompt[] = [
  {
    id: 'ad1',
    text: 'Pitch a bold rebranding concept to a conservative C-Suite that is afraid of alienating existing customers.',
    category: 'Sales',
    durationTarget: 60,
  },
  {
    id: 'ad2',
    text: 'Explain your strategic value as a Creative/Strategist to a new client who thinks agencies are too expensive.',
    category: 'General',
    durationTarget: 30,
  },
  {
    id: 'ad3',
    text: 'The client says the data implies a safer route. Convince them that this "risky" creative idea is the only way to hit their growth targets.',
    category: 'Startup',
    durationTarget: 45,
  },
  {
    id: 'ad4',
    text: 'Walk us through your professional portfolio highlights relevant to the Automotive industry in 60 seconds.',
    category: 'Interview',
    durationTarget: 60,
  },
  {
    id: 'ad5',
    text: 'The CMO hates the storyboard because it "doesn\'t show the product enough". Handle this objection and sell the vision.',
    category: 'Sales',
    durationTarget: 30,
  },
];

export const STORAGE_KEY = 'ads_pitch_ai_history_v2';

export const RECEIVER_PERSONAS: Record<DifficultyLevel, { name: string; description: string; multiplier: number; context: string }> = {
  Ally: {
    name: "The Fan",
    description: "Loves your work. Wants you to succeed. Easy mode.",
    multiplier: 1.0,
    context: "You are 'The Fan'. You already like the agency/person. You are nodding along. Your objection is very soft, basically a 'softball' question to let them elaborate on something cool.",
  },
  Pragmatist: {
    name: "The Pragmatist",
    description: "Focused on logistics, timeline, and budget. Neutral.",
    multiplier: 1.2,
    context: "You are 'The Pragmatist'. You don't care about the fluff or the 'big idea' as much as execution. Your objection should be about timeline, resources, budget, or 'how does this actually work?'.",
  },
  Burned: {
    name: "The Burned Client",
    description: "Has been hurt by agencies before. Trust issues.",
    multiplier: 1.5,
    context: "You are 'The Burned Client'. You worked with an agency before and they overpromised and underdelivered. You have LOST TRUST. You are hesitant, cynical. Your objection is about risk, reliability, or 'is this just sales talk?'.",
  },
  Skeptic: {
    name: "The Data Skeptic",
    description: "Only cares about KPIs and ROI. Cold and analytical.",
    multiplier: 1.8,
    context: "You are 'The Data Skeptic'. You are a CFO or Head of Analytics. You don't care about 'brand magic'. You want numbers. Your objection is: 'Where is the data?' 'What is the ROI?' 'Prove this will convert.'",
  },
  Visionary: {
    name: "The Visionary",
    description: "Impatient. Wants big ideas. Get to the point fast.",
    multiplier: 2.0,
    context: "You are 'The Visionary' CEO. You have zero patience for details. You want to change the world. If the pitch is boring, you interrupt. Your objection is: 'This feels small.' 'Is this disruptive enough?' 'I'm bored, wow me.'",
  },
  Challenger: {
    name: "The Challenger",
    description: "Aggressive. Tears apart logic. Hard mode.",
    multiplier: 2.5,
    context: "You are 'The Challenger'. You are a combative, aggressive Procurement Officer or CMO. You think this pitch is a waste of time. You challenge every assumption. You are looking for a fight. Your objection is rude and direct.",
  }
};