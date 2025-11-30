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

export const generateObjection = async (
  audioBase64: string,
  promptText: string,
  difficulty: DifficultyLevel
): Promise<string> => {
  const persona = RECEIVER_PERSONAS[difficulty];

  const systemInstruction = `
    Role: ${persona.context}
    
    Task: Deeply listen to the user's audio pitch. You must output an objection that references specific content from the speech.
    
    CRITICAL INSTRUCTION:
    - You MUST reference a specific phrase, claim, or number the user mentioned.
    - Do NOT give generic advice like "I'm not convinced".
    - If the user said "we increase sales by 50%", you ask "How exactly do you prove that 50% increase?".
    - If the user was vague, attack the vagueness specifically by quoting them.
    - Keep it under 2 sentences. Spoken style.
    
    Persona Specifics:
    - If "The Ally": Ask a helpful clarifying question to help them shine.
    - If "The Burned Client": Express doubt based on past failure. Pick on a vague promise they made.
    - If "The Challenger": Be blunt. If they used buzzwords, call them out.
    - If "The Data Skeptic": Ask for proof/numbers related to a claim they just made.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/webm", 
              data: audioBase64,
            },
          },
          {
            text: `The user was answering this prompt: "${promptText}". Listen to their response and give me your objection.`,
          },
        ],
      },
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 150,
      },
    });

    return response.text || "I couldn't hear the details clearly. Could you give me a specific example of what you mean?";
  } catch (e) {
    console.error("Objection generation error", e);
    return "I'm a bit skeptical. Can you break that down with more specific numbers?";
  }
};

export const analyzePitch = async (
  pitchAudioBase64: string,
  objectionText: string,
  responseAudioBase64: string,
  promptText: string,
  targetDuration: number,
  difficulty: DifficultyLevel
): Promise<GeminiResponse> => {
  
  const persona = RECEIVER_PERSONAS[difficulty];

  const systemInstruction = `
    Role: ${persona.context}
    
    Task: Analyze a 2-turn conversation.
    1. User Pitch (Audio 1): Response to "${promptText}".
    2. Your Objection: "${objectionText}".
    3. User Rebuttal (Audio 2): Response to the objection.

    Your Persona Behavior:
    - If Ally: Be kind, give higher scores for effort.
    - If Burned Client: Did they restore trust?
    - If Challenger: Did they stand their ground?

    Requirements:
    1. Transcribe the FULL conversation (Pitch + Objection + Rebuttal).
    2. Count filler words in user speech.
    3. Evaluate 0-100 on: Structure, Clarity, Brevity, Delivery.
    4. Provide feedback matching your persona.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { text: "User Pitch:" },
        {
          inlineData: {
            mimeType: "audio/webm", 
            data: pitchAudioBase64,
          },
        },
        { text: `System Objection: ${objectionText}` },
        { text: "User Rebuttal:" },
        {
          inlineData: {
            mimeType: "audio/webm", 
            data: responseAudioBase64,
          },
        },
        {
          text: "Analyze the full interaction.",
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
    You are an endless engine of strictly professional Business, Advertising & Sales scenarios.
    Generate 10 NEW, distinct, challenging pitch prompts for a user in the: ${userContext}.
    
    The user has already practiced these: ${JSON.stringify(pastPrompts.slice(-20))}. 
    DO NOT repeat similar topics. 
    
    CRITICAL RULES:
    1. STRICTLY BUSINESS CONTEXT. No "tell me about your hobbies", no "favorite color", no casual icebreakers.
    2. Focus on: Client Presentations, Stakeholder Management, Salary Negotiations, Pitching Concepts, Handling Crises.
    3. Vary the duration targets (30s, 60s, 120s, 300s).
    4. Categories must be one of: 'General', 'Sales', 'Interview', 'Startup'.
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