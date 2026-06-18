import { z } from "zod";

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
  "nextSteps": string[]
}`;
