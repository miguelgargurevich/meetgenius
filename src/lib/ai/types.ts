import type { AnalysisResult } from "./schema";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
}

/** Proveedor de lenguaje (análisis + chat). Implementado por Grok / OpenAI / mock. */
export interface LanguageProvider {
  readonly name: string;
  readonly model: string;
  /** Genera el análisis estructurado de una transcripción. */
  analyze(transcript: string, context?: AnalyzeContext): Promise<AnalysisResult>;
  /** Conversación libre (Ask MeetGenius / RAG). */
  chat(messages: ChatMessage[]): Promise<CompletionResult>;
}

export interface AnalyzeContext {
  title?: string;
  participants?: string[];
  language?: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  segments: TranscriptionSegment[];
  provider: string;
}

/** Proveedor de transcripción de audio. Implementado por Whisper / mock. */
export interface TranscriptionProvider {
  readonly name: string;
  transcribe(audioPath: string): Promise<TranscriptionResult>;
}
