import type { AnalysisResult } from "../schema";
import type {
  AnalyzeContext,
  ChatMessage,
  CompletionResult,
  DiarizeInput,
  LanguageProvider,
} from "../types";

/**
 * Proveedor determinístico para desarrollo y tests, sin API keys.
 * Deriva un análisis plausible a partir del texto de la transcripción.
 */
export class MockLanguageProvider implements LanguageProvider {
  readonly name = "mock";
  readonly model = "mock-analyst-v1";

  async analyze(transcript: string): Promise<AnalysisResult> {
    const sentences = transcript
      .split(/[.\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const pick = (kw: RegExp) => sentences.filter((s) => kw.test(s.toLowerCase()));

    return {
      summary: sentences.slice(0, 6).map((s) => s.slice(0, 140)),
      sentiment: /problema|riesgo|retraso|no funciona/i.test(transcript)
        ? "NEGATIVE"
        : /acuerdo|excelente|logramos|aprobado/i.test(transcript)
          ? "POSITIVE"
          : "NEUTRAL",
      agreements: pick(/acord|acuerdo|aprob|decidim/).slice(0, 3).map((s, i) => ({
        title: `Acuerdo ${i + 1}`,
        description: s.slice(0, 160),
        owner: "",
        targetDate: null,
      })),
      tasks: pick(/tarea|hacer|enviar|preparar|revisar|asign/).slice(0, 5).map((s) => ({
        title: s.slice(0, 100),
        assignee: "",
        priority: "MEDIUM" as const,
        status: "TODO" as const,
      })),
      risks: pick(/riesgo|problema|peligro|bloque|retraso/).slice(0, 3).map((s) => ({
        risk: s.slice(0, 140),
        impact: "MEDIUM" as const,
        mitigation: "",
      })),
      openQuestions: pick(/\?|pregunta|duda|aclarar/).slice(0, 3),
      nextSteps: pick(/siguiente|próximo|luego|después|seguir/).slice(0, 4),
      chapters: sentences.slice(0, 3).map((s, i) => ({
        title: `Tema ${i + 1}`,
        summary: s.slice(0, 120),
        startSec: i * 60,
      })),
      highlights: sentences.slice(0, 3).map((s, i) => ({
        quote: s.slice(0, 160),
        speaker: "",
        atSec: i * 45,
      })),
      followUpEmail: {
        subject: "Seguimiento de la reunión",
        body: `Hola equipo,\n\nGracias por participar. Resumen de lo tratado:\n${sentences
          .slice(0, 3)
          .map((s) => `• ${s.slice(0, 100)}`)
          .join("\n")}\n\nQuedo atento a los próximos pasos.\n\nSaludos.`,
      },
    };
  }

  async diarize(segments: DiarizeInput[], ctx?: AnalyzeContext): Promise<string[]> {
    // Heurística demo: alterna de hablante tras una pregunta (turno de
    // respuesta) y cada ~2 segmentos, para simular una conversación.
    const names =
      ctx?.participants && ctx.participants.length >= 2
        ? ctx.participants
        : ["Hablante 1", "Hablante 2"];
    let idx = 0;
    return segments.map((s, i) => {
      const label = names[idx % names.length];
      if (s.text.trim().endsWith("?") || i % 2 === 1) idx++;
      return label;
    });
  }

  async chat(messages: ChatMessage[]): Promise<CompletionResult> {
    const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    return {
      text: `(modo demo) Recibí tu pregunta: "${last.slice(0, 120)}". Configura XAI_API_KEY para respuestas reales de Grok sobre tus reuniones.`,
      model: this.model,
      tokensIn: 0,
      tokensOut: 0,
    };
  }
}
