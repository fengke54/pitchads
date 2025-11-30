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

interface ObjectionResponse {
  transcription: string;
  objection: string;
}

export const generateObjection = async (
  audioBase64: string,
  promptText: string,
  difficulty: DifficultyLevel
): Promise<string> => {
  const persona = RECEIVER_PERSONAS[difficulty];

  // 1. Define the Task for the AI
  const systemInstruction = `
    Role: ${persona.context}
    
    Task: Listen to the user's pitch answering: "${promptText}".
    
    Instructions:
    1. TRANSCRIPT: Accurately transcribe what the user said.
    2. ANALYZE: Identify a specific claim, number, or vague promise in their speech.
    3. OBJECTION: Formulate a short, sharp objection or follow-up question based DIRECTLY on that specific point.
    
    Fallback:
    - If the audio is silent or unintelligible, set the objection to: "I couldn't hear you clearly. Please check your mic and try again."
    
    Tone: ${persona.name}. Spoken style. Under 2 sentences.
  `;

  const generateWithModel = async (modelName: string): Promise<string> => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/webm", 
              data: audioBase64,
            },
          },
          {
            text: `Listen to this pitch about "${promptText}" and generate an objection.`,
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
            objection: { type: Type.STRING },
          },
          required: ["transcription", "objection"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from model");

    const result = JSON.parse(text) as ObjectionResponse;
    
    // If transcription is too short, it likely didn't hear anything
    if (result.transcription.length < 5) {
      return "I couldn't hear you clearly. Could you speak up?";
    }

    return result.objection;
  };

  try {
    // Primary: Try Gemini 3 Pro
    return await generateWithModel("gemini-3-pro-preview");
  } catch (error) {
    console.warn("Gemini 3 Pro failed for objection, failing over to Flash 2.5", error);
    try {
      // Fallback: Try Gemini 2.5 Flash (Very stable for audio)
      return await generateWithModel("gemini-2.5-flash");
    } catch (fallbackError) {
      console.error("All models failed", fallbackError);
      return "I'm not sure I caught that. Can you clarify your main value proposition?";
    }
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

  try {
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
    return raw.map((p: any) => ({
      ...p,
      id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
  } catch (e) {
    console.error("Error generating prompts", e);
    return [];
  }
};