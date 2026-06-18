import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(2, "El título es obligatorio"),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  participants: z.array(z.string()).default([]),
});
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

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

export const historyQuerySchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});
