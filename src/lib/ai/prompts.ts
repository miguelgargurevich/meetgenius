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
  if (ctx?.vocabulary?.length)
    meta.push(
      `Vocabulario/nombres propios (respeta su ortografía exacta si aparecen): ${ctx.vocabulary.join(", ")}`,
    );

  return `${meta.join("\n")}

Analiza la siguiente transcripción y devuelve EXCLUSIVAMENTE un objeto JSON con esta forma exacta:

${ANALYSIS_JSON_SHAPE}

Reglas:
- "summary": máximo 10 puntos, cada uno una frase ejecutiva.
- Extrae "tasks", "agreements" y "risks" SOLO si aparecen explícita o implícitamente. Si no hay, devuelve arrays vacíos.
- "owner"/"assignee": usa el nombre mencionado; si no se menciona, deja "".
- "sentiment": evalúa el tono general de la reunión.
- "chapters": divide la reunión en los temas principales tratados, en orden cronológico (título corto + resumen de 1 frase). "startSec" es el segundo aproximado en que empieza el tema, o null si no puedes estimarlo.
- "highlights": 3 a 6 frases TEXTUALES memorables o decisivas de la transcripción (cítalas literalmente). "speaker" si se conoce, "atSec" el segundo aproximado o null.
- "followUpEmail": redacta un borrador profesional de email de seguimiento en español, con "subject" y "body". El body debe resumir acuerdos, tareas (con responsables) y próximos pasos en un tono cordial y ejecutivo.
- "diagrams": genera de 1 a 3 diagramas que aporten valor según lo tratado: "flowchart" para un proceso/flujo de decisiones, "sequenceDiagram" para interacciones entre partes/sistemas, "classDiagram" para arquitectura/componentes (solo si se habló de algo técnico), "mindmap" para el "big picture" de los temas, "timeline" para la secuencia de próximos pasos. Reglas del campo "mermaid": código Mermaid VÁLIDO y autocontenido; empieza SIEMPRE con el tipo (p.ej. "flowchart TD", "sequenceDiagram", "mindmap", "timeline"); identificadores simples SIN acentos ni espacios; si una etiqueta lleva espacios, ponla entre comillas (p.ej. A["Texto largo"]); NO uses fences de markdown (\`\`\`); solo genera diagramas que tengan sentido (si no aplica ninguno, devuelve []).
- No añadas comentarios ni markdown. Solo el JSON.

TRANSCRIPCIÓN:
"""
${transcript}
"""`;
}

export const CHAT_SYSTEM_PROMPT = `Eres "Ask MeetGenius", un asistente que responde preguntas sobre el historial de reuniones de la organización.
Respondes en español, con precisión, citando reuniones por su título cuando sea relevante.
Si la información no está en el contexto proporcionado, dilo claramente en lugar de inventar.`;

export const DIARIZE_SYSTEM_PROMPT = `Eres un sistema de diarización de reuniones.
A partir de una lista numerada de intervenciones (segmentos consecutivos de una transcripción), infieres quién habla en cada una usando el flujo conversacional (cambios de turno, preguntas/respuestas, menciones de nombres).
Mantienes etiquetas de hablante CONSISTENTES a lo largo de toda la reunión.
Respondes SIEMPRE en JSON válido, sin texto adicional.`;

export function buildDiarizePrompt(
  segments: { text: string }[],
  participants?: string[],
  vocabulary?: string[],
): string {
  const lines = segments.map((s, i) => `${i}: ${s.text}`).join("\n");
  const namesRule = participants?.length
    ? `Participantes conocidos (usa estos nombres cuando puedas identificarlos por el contexto): ${participants.join(", ")}.`
    : `No se conocen los nombres: usa etiquetas genéricas "Hablante 1", "Hablante 2", etc.`;
  const vocabRule = vocabulary?.length
    ? `\nNombres/términos que pueden aparecer (respeta su ortografía): ${vocabulary.join(", ")}.`
    : "";

  return `${namesRule}${vocabRule}

A continuación tienes ${segments.length} segmentos numerados (índice: texto). Asigna un hablante a CADA uno.

Reglas:
- Devuelve EXCLUSIVAMENTE un objeto JSON con esta forma: { "speakers": string[] }.
- El array "speakers" debe tener EXACTAMENTE ${segments.length} elementos, en el mismo orden que los segmentos.
- Usa el mismo nombre/etiqueta para el mismo hablante en toda la reunión.
- Si dudas entre dos turnos seguidos, asume que el mismo hablante continúa.
- No añadas comentarios ni markdown. Solo el JSON.

SEGMENTOS:
"""
${lines}
"""`;
}
