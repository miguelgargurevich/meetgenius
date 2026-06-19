import OpenAI from "openai";
import { AIProviderError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { analysisSchema, type AnalysisResult } from "../schema";
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisPrompt,
  DIARIZE_SYSTEM_PROMPT,
  buildDiarizePrompt,
} from "../prompts";
import type {
  AnalyzeContext,
  ChatMessage,
  CompletionResult,
  DiarizeInput,
  LanguageProvider,
} from "../types";

const log = logger.child("ai");

/** Extrae el primer objeto JSON de un texto, tolerando fences ```json. */
function parseJsonObject(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new AIProviderError("La respuesta del modelo no es JSON válido");
  }
}

/**
 * Implementación común para cualquier API compatible con OpenAI Chat Completions.
 * Grok (xAI) y OpenAI comparten este cliente; solo cambian baseURL/apiKey/model.
 */
export class OpenAICompatibleProvider implements LanguageProvider {
  private client: OpenAI;

  constructor(
    public readonly name: string,
    public readonly model: string,
    opts: { apiKey: string; baseURL?: string },
  ) {
    this.client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
  }

  async analyze(transcript: string, ctx?: AnalyzeContext): Promise<AnalysisResult> {
    const started = Date.now();
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: buildAnalysisPrompt(transcript, ctx) },
        ],
      });
      const content = res.choices[0]?.message?.content ?? "";
      const parsed = analysisSchema.parse(parseJsonObject(content));
      log.info("análisis completado", {
        provider: this.name,
        ms: Date.now() - started,
        tasks: parsed.tasks.length,
        agreements: parsed.agreements.length,
      });
      return parsed;
    } catch (err) {
      log.error("fallo de análisis", { provider: this.name, err: String(err) });
      throw err instanceof AIProviderError
        ? err
        : new AIProviderError(`Error de análisis (${this.name})`, err);
    }
  }

  async diarize(segments: DiarizeInput[], ctx?: AnalyzeContext): Promise<string[]> {
    if (!segments.length) return [];
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: DIARIZE_SYSTEM_PROMPT },
          { role: "user", content: buildDiarizePrompt(segments, ctx?.participants) },
        ],
      });
      const parsed = parseJsonObject(res.choices[0]?.message?.content ?? "") as {
        speakers?: unknown;
      };
      const raw = Array.isArray(parsed.speakers) ? parsed.speakers : [];
      // Normalizamos a la longitud exacta: rellenamos huecos arrastrando el
      // último hablante conocido (un turno suele continuar).
      const out: string[] = [];
      let last = "Hablante 1";
      for (let i = 0; i < segments.length; i++) {
        const v = raw[i];
        const label = typeof v === "string" && v.trim() ? v.trim() : last;
        out.push(label);
        last = label;
      }
      log.info("diarización completada", { provider: this.name, segments: segments.length });
      return out;
    } catch (err) {
      log.error("fallo de diarización", { provider: this.name, err: String(err) });
      throw err instanceof AIProviderError
        ? err
        : new AIProviderError(`Error de diarización (${this.name})`, err);
    }
  }

  async chat(messages: ChatMessage[]): Promise<CompletionResult> {
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.3,
        messages,
      });
      return {
        text: res.choices[0]?.message?.content ?? "",
        model: this.model,
        tokensIn: res.usage?.prompt_tokens ?? 0,
        tokensOut: res.usage?.completion_tokens ?? 0,
      };
    } catch (err) {
      throw new AIProviderError(`Error de chat (${this.name})`, err);
    }
  }
}
