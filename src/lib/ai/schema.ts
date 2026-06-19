import { z } from "zod";

/** Segundos tolerante: acepta número o string numérico; resto → null. */
const secOrNull = z.preprocess(
  (v) =>
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
        ? Number(v)
        : null,
  z.number().nullable(),
);

/**
 * Esquema canónico del análisis IA de una reunión.
 * Es el contrato entre el proveedor IA y la capa de servicios:
 * cualquier proveedor (Grok, OpenAI, mock) DEBE devolver esta forma.
 */
export const analysisSchema = z.object({
  summary: z.array(z.string()).max(10).describe("Resumen ejecutivo, máx 10 puntos"),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  agreements: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional().default(""),
      owner: z.string().optional().default(""),
      targetDate: z.string().optional().nullable(),
    }),
  ),
  tasks: z.array(
    z.object({
      title: z.string(),
      assignee: z.string().optional().default(""),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).default("TODO"),
    }),
  ),
  risks: z.array(
    z.object({
      risk: z.string(),
      impact: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
      mitigation: z.string().optional().default(""),
    }),
  ),
  openQuestions: z.array(z.string()),
  nextSteps: z.array(z.string()),
  // ── Campos enriquecidos (opcionales: compatibles con respuestas antiguas) ──
  chapters: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string().optional().default(""),
        startSec: secOrNull.optional().default(null),
      }),
    )
    .optional()
    .default([]),
  highlights: z
    .array(
      z.object({
        quote: z.string(),
        speaker: z.string().optional().default(""),
        atSec: secOrNull.optional().default(null),
      }),
    )
    .optional()
    .default([]),
  followUpEmail: z
    .object({ subject: z.string(), body: z.string() })
    .optional()
    .nullable()
    .default(null),
  diagrams: z
    .array(
      z.object({
        type: z.enum([
          "flowchart",
          "sequenceDiagram",
          "classDiagram",
          "mindmap",
          "timeline",
        ]),
        title: z.string(),
        mermaid: z.string(),
      }),
    )
    .optional()
    .default([]),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

/** JSON Schema textual para guiar al modelo (response_format json_object). */
export const ANALYSIS_JSON_SHAPE = `{
  "summary": string[],            // máximo 10 puntos ejecutivos, en español
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "agreements": [{ "title": string, "description": string, "owner": string, "targetDate": string|null }],
  "tasks": [{ "title": string, "assignee": string, "priority": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", "status": "TODO"|"IN_PROGRESS"|"DONE"|"BLOCKED" }],
  "risks": [{ "risk": string, "impact": "LOW"|"MEDIUM"|"HIGH", "mitigation": string }],
  "openQuestions": string[],
  "nextSteps": string[],
  "chapters": [{ "title": string, "summary": string, "startSec": number|null }],  // temas tratados, en orden cronológico
  "highlights": [{ "quote": string, "speaker": string, "atSec": number|null }],    // 3-6 frases textuales destacadas
  "followUpEmail": { "subject": string, "body": string },                           // borrador de email de seguimiento
  "diagrams": [{ "type": "flowchart"|"sequenceDiagram"|"classDiagram"|"mindmap"|"timeline", "title": string, "mermaid": string }]  // 1-3 diagramas en sintaxis Mermaid
}`;
