import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(2, "El título es obligatorio"),
  description: z.string().optional(),
  // Acepta formato `datetime-local` (sin segundos ni zona) o ISO.
  scheduledAt: z.string().min(1).optional().nullable(),
  durationMinutes: z.coerce.number().int().positive().max(1440).optional(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
  externalEventId: z.string().optional().nullable(),
  participants: z.array(z.string()).default([]),
});
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const updateMeetingSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  scheduledAt: z.string().min(1).optional().nullable(),
  durationMinutes: z.coerce.number().int().positive().max(1440).optional().nullable(),
  meetingUrl: z.string().url().optional().nullable().or(z.literal("")),
  externalEventId: z.string().optional().nullable(),
  participants: z.array(z.string()).optional(),
});
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

export const updateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export const chatSchema = z.object({
  question: z.string().min(2),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
});
export type ChatInput = z.infer<typeof chatSchema>;

export const vocabularySchema = z.object({
  terms: z.array(z.string()).max(200),
});
export type VocabularyInput = z.infer<typeof vocabularySchema>;

export const speakerNamesSchema = z.object({
  names: z.record(z.string(), z.string()),
});
export type SpeakerNamesInput = z.infer<typeof speakerNamesSchema>;

export const addSourceSchema = z
  .object({
    name: z.string().min(1, "Nombre requerido"),
    // Una fuente es una suscripción remota (url) o un archivo .ics subido (icsContent).
    url: z.string().url("URL .ics inválida").optional(),
    icsContent: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.url) || Boolean(d.icsContent), {
    message: "Indica una URL .ics o adjunta un archivo .ics",
  });
export type AddSourceInput = z.infer<typeof addSourceSchema>;

export const taxonomySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  color: z.string().optional().nullable(),
});
export type TaxonomyInput = z.infer<typeof taxonomySchema>;

export const meetingTaxonomySchema = z.object({
  folderIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const historyQuerySchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});
