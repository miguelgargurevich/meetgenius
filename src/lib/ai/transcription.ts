import { createReadStream, statSync } from "node:fs";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { AIProviderError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { TranscriptionProvider, TranscriptionResult } from "./types";

const log = logger.child("transcription");

/** Whisper vía API compatible con OpenAI (Groq o OpenAI). */
class WhisperProvider implements TranscriptionProvider {
  private client: OpenAI;

  constructor(
    readonly name: string,
    opts: { apiKey: string; baseURL?: string },
  ) {
    this.client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    try {
      const res = await this.client.audio.transcriptions.create({
        file: createReadStream(audioPath) as unknown as File,
        model: env.WHISPER_MODEL,
        response_format: "verbose_json",
      });
      // verbose_json incluye `segments` y `language`
      const anyRes = res as unknown as {
        text: string;
        language?: string;
        segments?: Array<{ start: number; end: number; text: string }>;
      };
      return {
        text: anyRes.text,
        language: anyRes.language ?? "es",
        provider: this.name,
        segments: (anyRes.segments ?? []).map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text.trim(),
        })),
      };
    } catch (err) {
      log.error("fallo whisper", { err: String(err) });
      throw new AIProviderError("Error de transcripción (Whisper)", err);
    }
  }
}

/** Transcripción mock: genera texto a partir del tamaño del archivo. */
class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = "mock";

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    let sizeKb = 0;
    try {
      sizeKb = Math.round(statSync(audioPath).size / 1024);
    } catch {
      /* archivo puede no existir en demo */
    }
    const text = `[Transcripción de demostración — ${sizeKb} KB de audio]
Buenos días a todos, gracias por conectarse. Hoy revisamos el avance del proyecto.
Acordamos que el equipo de backend entregará la API de reuniones la próxima semana.
La tarea principal es preparar el informe ejecutivo y enviarlo al cliente el viernes.
Existe un riesgo de retraso si no recibimos las credenciales del proveedor CRM a tiempo.
Quedó una pregunta abierta sobre el presupuesto del segundo trimestre.
Como próximo paso, agendaremos una reunión de seguimiento el lunes.`;
    return {
      text,
      language: "es",
      provider: this.name,
      segments: [],
    };
  }
}

export function getTranscriptionProvider(): TranscriptionProvider {
  const provider = env.TRANSCRIPTION_PROVIDER;

  if (provider === "groq-whisper") {
    if (env.GROQ_API_KEY) {
      return new WhisperProvider("groq-whisper", {
        apiKey: env.GROQ_API_KEY,
        baseURL: env.GROQ_BASE_URL,
      });
    }
    log.warn("GROQ_API_KEY ausente → usando transcripción mock");
  }

  if (provider === "openai-whisper") {
    if (env.OPENAI_API_KEY) {
      return new WhisperProvider("openai-whisper", { apiKey: env.OPENAI_API_KEY });
    }
    log.warn("OPENAI_API_KEY ausente → usando transcripción mock");
  }

  return new MockTranscriptionProvider();
}
