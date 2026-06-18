import { z } from "zod";

/**
 * Validación centralizada de variables de entorno.
 * Falla rápido en arranque si falta configuración crítica.
 */
const schema = z.object({
  DATABASE_URL: z.string().url().optional(),

  AI_PROVIDER: z.enum(["groq", "gemini", "grok", "openai", "mock"]).default("groq"),

  // Groq Cloud (OpenAI-compatible) — análisis + transcripción Whisper
  GROQ_API_KEY: z.string().optional(),
  GROQ_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),

  // Google Gemini (vía endpoint compatible con OpenAI)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_BASE_URL: z
    .string()
    .url()
    .default("https://generativelanguage.googleapis.com/v1beta/openai"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),

  // xAI Grok (OpenAI-compatible)
  XAI_API_KEY: z.string().optional(),
  XAI_BASE_URL: z.string().url().default("https://api.x.ai/v1"),
  XAI_MODEL: z.string().default("grok-2-latest"),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  TRANSCRIPTION_PROVIDER: z
    .enum(["groq-whisper", "openai-whisper", "mock"])
    .default("groq-whisper"),
  WHISPER_MODEL: z.string().default("whisper-large-v3"),

  STORAGE_DIR: z.string().default("./.storage/recordings"),
  NODE_ENV: z.string().default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Logueamos pero no abortamos en dev para permitir el modo mock.
  console.warn("[env] configuración incompleta:", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : schema.parse({ ...process.env });

export const isProd = env.NODE_ENV === "production";
