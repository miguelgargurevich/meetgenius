import { prisma } from "@/lib/db";
import { getLanguageProvider } from "@/lib/ai";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getCurrentOrg } from "@/server/context";
import type { ChatMessage } from "@/lib/ai/types";
import type { ChatInput } from "@/server/validators";

/**
 * "Ask MeetGenius". Arquitectura preparada para RAG:
 * hoy construye el contexto recuperando reuniones completadas relevantes
 * por coincidencia de texto (keyword retrieval). Mañana, sustituir
 * `retrieveContext` por búsqueda vectorial sobre la tabla Embedding.
 */
export const chatService = {
  async ask(input: ChatInput): Promise<{ answer: string; sources: { id: string; title: string }[] }> {
    const org = await getCurrentOrg();
    const { context, sources } = await retrieveContext(org.id, input.question);

    const provider = getLanguageProvider();
    const messages: ChatMessage[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      {
        role: "system",
        content: `Contexto de reuniones recuperado:\n${context || "(sin coincidencias)"}`,
      },
      ...input.history,
      { role: "user", content: input.question },
    ];

    const res = await provider.chat(messages);
    return { answer: res.text, sources };
  },
};

async function retrieveContext(organizationId: string, question: string) {
  const terms = question
    .toLowerCase()
    .replace(/[¿?¡!.,]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const meetings = await prisma.meeting.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
      OR: [
        { title: { contains: question, mode: "insensitive" } },
        ...terms.map((t) => ({ transcription: { text: { contains: t, mode: "insensitive" as const } } })),
      ],
    },
    include: { summary: true, agreements: true, tasks: true, risks: true },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  const sources = meetings.map((m) => ({ id: m.id, title: m.title }));
  const context = meetings
    .map((m) => {
      const parts = [`### Reunión: ${m.title} (${m.createdAt.toISOString().slice(0, 10)})`];
      if (m.summary?.bullets.length) parts.push(`Resumen:\n- ${m.summary.bullets.join("\n- ")}`);
      if (m.agreements.length)
        parts.push(`Acuerdos:\n- ${m.agreements.map((a) => a.title).join("\n- ")}`);
      if (m.tasks.length)
        parts.push(`Tareas:\n- ${m.tasks.map((t) => `${t.title} [${t.status}]`).join("\n- ")}`);
      if (m.risks.length) parts.push(`Riesgos:\n- ${m.risks.map((r) => r.risk).join("\n- ")}`);
      return parts.join("\n");
    })
    .join("\n\n");

  return { context, sources };
}
