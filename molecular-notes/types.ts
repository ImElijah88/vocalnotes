
export type NoteType = 'idea' | 'step' | 'note' | 'cost' | 'tool' | 'actor' | 'task';
export type LineType = 'solid' | 'dashed' | 'dotted' | 'arrow' | 'double' | 'glow' | 'cable';

export interface Note {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  folderId: string;
  type: NoteType;
  color: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  lineType: LineType;
  color: string;
  thickness: number;
}

export interface Folder {
  id: string;
  name: string;
  order: number;
}

export type RadialOption = 'create' | 'move' | 'connect' | 'view' | 'delete' | 'share';

export interface Point {
  x: number;
  y: number;
}

export interface UIState {
  zoom: number;
  pan: Point;
  activeColor: string;
  savedColors: string[];
  activeLineType: LineType;
}

export interface GeminiConfig {
  id: string;
  name: string;
  apiKey: string;
  /** @deprecated Use liveModelName. Kept for migration. */
  modelName?: string;
  /** Model for Live transcription (mic). Must support audio input. */
  liveModelName: string;
  /** Model for text refinement (grammar/style). Must support generateContent. */
  refinementModelName: string;
}

/** Error from Gemini API with user-friendly handling */
export interface GeminiErrorInfo {
  message: string;
  code: 'auth' | 'quota' | 'quota_warning' | 'model' | 'other';
  retryHint?: string; // e.g. "Try again in ~1 min" or "Resets at midnight PT"
}
