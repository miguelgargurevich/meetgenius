import { ANALYSIS_JSON_SHAPE } from "./schema";
import type { AnalyzeContext } from "./types";

export const ANALYSIS_SYSTEM_PROMPT = `Eres un analista senior de reuniones empresariales.
Tu tarea es transformar transcripciones en conocimiento accionable.
Eres preciso, conciso y nunca inventas información que no esté en la transcripción.
Respondes SIEMPRE en español y SIEMPRE devuelves JSON válido que cumpla el esquema indicado, sin texto adicional.`;

export function buildAnalysisPrompt(transcript: string, ctx?: AnalyzeContext): string {
  const meta: string[] = [];
  if (ctx?.title) meta.push(`Título de la reunión: ${ctx.title}`);
  if (ctx?.participants?.length)
    meta.push(`Participantes: ${ctx.participants.join(", ")}`);

  return `${meta.join("\n")}

Analiza la siguiente transcripción y devuelve EXCLUSIVAMENTE un objeto JSON con esta forma exacta:

${ANALYSIS_JSON_SHAPE}

Reglas:
- "summary": máximo 10 puntos, cada uno una frase ejecutiva.
- Extrae "tasks", "agreements" y "risks" SOLO si aparecen explícita o implícitamente. Si no hay, devuelve arrays vacíos.
- "owner"/"assignee": usa el nombre mencionado; si no se menciona, deja "".
- "sentiment": evalúa el tono general de la reunión.
- No añadas comentarios ni markdown. Solo el JSON.

TRANSCRIPCIÓN:
"""
${transcript}
"""`;
}

export const CHAT_SYSTEM_PROMPT = `Eres "Ask MeetGenius", un asistente que responde preguntas sobre el historial de reuniones de la organización.
Respondes en español, con precisión, citando reuniones por su título cuando sea relevante.
Si la información no está en el contexto proporcionado, dilo claramente en lugar de inventar.`;
