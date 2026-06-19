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

/** Segmento de entrada para diarización (sin hablante todavía). */
export interface DiarizeInput {
  start: number;
  end: number;
  text: string;
}

/** Proveedor de lenguaje (análisis + chat). Implementado por Grok / OpenAI / mock. */
export interface LanguageProvider {
  readonly name: string;
  readonly model: string;
  /** Genera el análisis estructurado de una transcripción. */
  analyze(transcript: string, context?: AnalyzeContext): Promise<AnalysisResult>;
  /** Conversación libre (Ask MeetGenius / RAG). */
  chat(messages: ChatMessage[]): Promise<CompletionResult>;
  /**
   * Diarización aproximada: asigna un hablante a cada segmento a partir del
   * flujo conversacional. Devuelve una etiqueta por segmento (mismo orden).
   */
  diarize(segments: DiarizeInput[], context?: AnalyzeContext): Promise<string[]>;
}

export interface AnalyzeContext {
  title?: string;
  participants?: string[];
  language?: string;
  /** Vocabulario/nombres propios para sesgar transcripción y análisis. */
  vocabulary?: string[];
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

/** Opciones de transcripción (sesgo de vocabulario vía `prompt` de Whisper). */
export interface TranscribeOptions {
  prompt?: string;
}

/** Proveedor de transcripción de audio. Implementado por Whisper / mock. */
export interface TranscriptionProvider {
  readonly name: string;
  transcribe(audioPath: string, opts?: TranscribeOptions): Promise<TranscriptionResult>;
}
