
import { GoogleGenAI } from "@google/genai";
import type { GeminiErrorInfo } from "../types";

const DEFAULT_REFINEMENT = 'gemini-1.5-flash-latest';

export interface RefineOptions {
  apiKey?: string;
  modelName?: string;
}

export class RefineError extends Error {
  info: GeminiErrorInfo;
  constructor(info: GeminiErrorInfo) {
    super(info.message);
    this.name = 'RefineError';
    this.info = info;
  }
}

/** Refine text using Gemini. Uses BYOK from User Hub. Throws RefineError on failure. */
export const refineNoteText = async (text: string, options?: RefineOptions): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  const apiKey = options?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const modelName = options?.modelName || DEFAULT_REFINEMENT;

  if (!apiKey || !apiKey.trim()) {
    throw new RefineError({
      message: 'No API key configured. Add a Gemini API key in User Hub (Neural Link).',
      code: 'auth',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Refine the following transcription. 
      1. Correct grammatical errors.
      2. Reformat it into a clean, professional, and academic-style text.
      3. Do NOT use any AI marks, stars, asterisks, or placeholders.
      4. Keep the original meaning and tone human and natural.
      5. Avoid overly complex words that seem artificial.
      
      Text to refine: "${text}"`,
    });

    const refined = response.text?.trim();
    return refined || text;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();

    if (lower.includes('api key') || lower.includes('invalid') || lower.includes('401')) {
      throw new RefineError({
        message: 'Invalid or expired API key. Check your key in User Hub → Neural Link, or create a new one at Google AI Studio.',
        code: 'auth',
      });
    }
    if (lower.includes('quota') || lower.includes('429') || lower.includes('resource exhausted')) {
      throw new RefineError({
        message: 'API quota limit reached. Your request could not be completed.',
        code: 'quota',
        retryHint: 'RPM/TPM limits reset in ~1 minute. Daily limits reset at midnight Pacific Time. Check billing at ai.google.dev.',
      });
    }
    if (lower.includes('model') || lower.includes('404') || lower.includes('not found')) {
      throw new RefineError({
        message: `Model "${modelName}" unavailable. Try a different refinement model in User Hub (e.g. Gemini 1.5 Flash).`,
        code: 'model',
      });
    }

    throw new RefineError({
      message: `Refinement failed: ${msg}`,
      code: 'other',
      retryHint: 'Check your API key and model selection in User Hub.',
    });
  }
};
