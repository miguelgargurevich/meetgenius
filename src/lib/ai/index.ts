import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { MockLanguageProvider } from "./providers/mock";
import { OpenAICompatibleProvider } from "./providers/openai-compatible";
import type { LanguageProvider } from "./types";

const log = logger.child("ai");

/**
 * Factory del proveedor de lenguaje activo.
 * AI_PROVIDER controla la selección; si falta la API key, cae a mock
 * para que la app siga siendo usable en desarrollo.
 */
export function getLanguageProvider(): LanguageProvider {
  switch (env.AI_PROVIDER) {
    case "groq":
      if (!env.GROQ_API_KEY) {
        log.warn("GROQ_API_KEY ausente → usando proveedor mock");
        return new MockLanguageProvider();
      }
      return new OpenAICompatibleProvider("groq", env.GROQ_MODEL, {
        apiKey: env.GROQ_API_KEY,
        baseURL: env.GROQ_BASE_URL,
      });

    case "gemini":
      if (!env.GEMINI_API_KEY) {
        log.warn("GEMINI_API_KEY ausente → usando proveedor mock");
        return new MockLanguageProvider();
      }
      return new OpenAICompatibleProvider("gemini", env.GEMINI_MODEL, {
        apiKey: env.GEMINI_API_KEY,
        baseURL: env.GEMINI_BASE_URL,
      });

    case "grok":
      if (!env.XAI_API_KEY) {
        log.warn("XAI_API_KEY ausente → usando proveedor mock");
        return new MockLanguageProvider();
      }
      return new OpenAICompatibleProvider("grok", env.XAI_MODEL, {
        apiKey: env.XAI_API_KEY,
        baseURL: env.XAI_BASE_URL,
      });

    case "openai":
      if (!env.OPENAI_API_KEY) {
        log.warn("OPENAI_API_KEY ausente → usando proveedor mock");
        return new MockLanguageProvider();
      }
      return new OpenAICompatibleProvider("openai", env.OPENAI_MODEL, {
        apiKey: env.OPENAI_API_KEY,
      });

    default:
      return new MockLanguageProvider();
  }
}

export * from "./types";
export * from "./schema";
export { getTranscriptionProvider } from "./transcription";
