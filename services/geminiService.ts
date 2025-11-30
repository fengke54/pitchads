import { GoogleGenAI, Type } from "@google/genai";
import { EvaluationScores, EvaluationFeedback, PitchPrompt, DifficultyLevel } from "../types";
import { RECEIVER_PERSONAS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeminiResponse {
  transcription: string;
  scores: EvaluationScores;
  feedback: EvaluationFeedback;
  fillerWordCount: number;
}

export const analyzePitch = async (
  audioBase64: string,
  promptText: string,
  targetDuration: number,
  difficulty: DifficultyLevel
): Promise<GeminiResponse> => {
  
  const persona = RECEIVER_PERSONAS[difficulty];

  const systemInstruction = `
    Role: ${persona.context}
    
    Task: Analyze an audio recording of a user practicing a pitch for the Ads/Marketing industry.
    The user was responding to: "${promptText}".
    The target duration was ${targetDuration} seconds.

    Your Persona Behavior:
    - If Easy: Be kind, give higher scores for effort, focus on basics.
    - If Medium: Be balanced, standard corporate evaluation.
    - If Hard: Be strict. Penalize heavily for filler words, lack of clarity, or going over time. It should be hard to get a score above 80.

    Requirements:
    1. Transcribe the audio verbatim.
    2. Count filler words (um, uh, like, you know).
    3. Evaluate 0-100 on: Structure, Clarity, Brevity, Delivery.
    4. Provide feedback matching your persona (Warm vs Cold tone).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/wav", 
            data: audioBase64,
          },
        },
        {
          text: "Analyze this pitch.",
        },
      ],
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcription: { type: Type.STRING },
          fillerWordCount: { type: Type.INTEGER },
          scores: {
            type: Type.OBJECT,
            properties: {
              overall: { type: Type.INTEGER },
              structure: { type: Type.INTEGER },
              clarity: { type: Type.INTEGER },
              brevity: { type: Type.INTEGER },
              delivery: { type: Type.INTEGER },
            },
            required: ["overall", "structure", "clarity", "brevity", "delivery"]
          },
          feedback: {
            type: Type.OBJECT,
            properties: {
              structure: { type: Type.STRING },
              clarity: { type: Type.STRING },
              brevity: { type: Type.STRING },
              delivery: { type: Type.STRING },
              summary: { type: Type.STRING },
            },
            required: ["structure", "clarity", "brevity", "delivery", "summary"]
          }
        },
        required: ["transcription", "fillerWordCount", "scores", "feedback"]
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  return JSON.parse(text) as GeminiResponse;
};

export const generatePracticePrompts = async (
  pastPrompts: string[],
  userContext: string = "Advertising Agency roles (Account, Creative, Strategy)"
): Promise<PitchPrompt[]> => {
  
  const systemInstruction = `
    You are an endless engine of Advertising & Sales training scenarios.
    Generate 10 NEW, distinct, challenging pitch prompts for a user in the: ${userContext}.
    
    The user has already practiced these: ${JSON.stringify(pastPrompts.slice(-20))}. 
    DO NOT repeat similar topics. 
    
    Vary the duration targets (30s, 60s, 120s, 300s).
    Categories must be one of: 'General', 'Sales', 'Interview', 'Startup'.
    Ensure high variety: Crisis management, Award acceptance, Pitching to procurement, Networking at Cannes, etc.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", 
    contents: {
      parts: [{ text: "Generate 10 new pitch prompts." }],
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            category: { type: Type.STRING },
            durationTarget: { type: Type.INTEGER },
          },
          required: ["text", "category", "durationTarget"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];

  const raw = JSON.parse(text) as any[];
  return raw.map(p => ({
    ...p,
    id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }));
};