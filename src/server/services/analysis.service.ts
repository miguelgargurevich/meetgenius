import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  getLanguageProvider,
  getTranscriptionProvider,
  type AnalysisResult,
} from "@/lib/ai";

const log = logger.child("pipeline");

/**
 * Pipeline completo: audio → transcripción (Whisper) → análisis IA (Grok) →
 * persistencia de resumen, tareas, acuerdos, riesgos, etc.
 * Registra cada etapa como AIJob para trazabilidad.
 */
export async function runAnalysisPipeline(meetingId: string): Promise<void> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { recording: true },
  });
  if (!meeting) return;

  try {
    // ── 1. Transcripción ──────────────────────────────────────
    const transcript = await transcribe(meetingId, meeting.recording?.filePath);

    // ── 2. Análisis IA ────────────────────────────────────────
    const analysis = await analyze(meetingId, transcript, {
      title: meeting.title,
      participants: meeting.participants,
    });

    // ── 3. Persistencia de resultados ─────────────────────────
    await persistAnalysis(meetingId, analysis);

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "COMPLETED", sentiment: analysis.sentiment },
    });
    log.info("pipeline completo", { meetingId });
  } catch (err) {
    log.error("pipeline error", { meetingId, err: String(err) });
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "FAILED" },
    });
  }
}

async function transcribe(meetingId: string, filePath?: string | null): Promise<string> {
  const provider = getTranscriptionProvider();
  const started = Date.now();
  const job = await prisma.aIJob.create({
    data: { meetingId, type: "TRANSCRIPTION", provider: provider.name, status: "RUNNING" },
  });

  const result = await provider.transcribe(filePath ?? "");
  const runtimeMs = Date.now() - started;

  await prisma.transcription.upsert({
    where: { meetingId },
    create: {
      meetingId,
      text: result.text,
      language: result.language,
      provider: result.provider,
      status: "SUCCEEDED",
      runtimeMs,
      segments: result.segments as unknown as object,
    },
    update: {
      text: result.text,
      status: "SUCCEEDED",
      runtimeMs,
      segments: result.segments as unknown as object,
    },
  });
  await prisma.aIJob.update({
    where: { id: job.id },
    data: { status: "SUCCEEDED", runtimeMs },
  });
  return result.text;
}

async function analyze(
  meetingId: string,
  transcript: string,
  ctx: { title: string; participants: string[] },
): Promise<AnalysisResult> {
  const provider = getLanguageProvider();
  const started = Date.now();
  const job = await prisma.aIJob.create({
    data: {
      meetingId,
      type: "ANALYSIS",
      provider: provider.name,
      model: provider.model,
      status: "RUNNING",
    },
  });
  const analysis = await provider.analyze(transcript, ctx);
  await prisma.aIJob.update({
    where: { id: job.id },
    data: { status: "SUCCEEDED", runtimeMs: Date.now() - started },
  });
  return analysis;
}

async function persistAnalysis(meetingId: string, a: AnalysisResult) {
  await prisma.$transaction([
    prisma.summary.upsert({
      where: { meetingId },
      create: { meetingId, bullets: a.summary },
      update: { bullets: a.summary },
    }),
    // Reemplazamos resultados previos para idempotencia del pipeline.
    prisma.task.deleteMany({ where: { meetingId } }),
    prisma.agreement.deleteMany({ where: { meetingId } }),
    prisma.risk.deleteMany({ where: { meetingId } }),
    prisma.openQuestion.deleteMany({ where: { meetingId } }),
    prisma.nextStep.deleteMany({ where: { meetingId } }),
    prisma.task.createMany({
      data: a.tasks.map((t) => ({
        meetingId,
        title: t.title,
        assigneeRaw: t.assignee || null,
        priority: t.priority,
        status: t.status,
      })),
    }),
    prisma.agreement.createMany({
      data: a.agreements.map((g) => ({
        meetingId,
        title: g.title,
        description: g.description || null,
        owner: g.owner || null,
        targetDate: g.targetDate ? new Date(g.targetDate) : null,
      })),
    }),
    prisma.risk.createMany({
      data: a.risks.map((r) => ({
        meetingId,
        risk: r.risk,
        impact: r.impact,
        mitigation: r.mitigation || null,
      })),
    }),
    prisma.openQuestion.createMany({
      data: a.openQuestions.map((q) => ({ meetingId, question: q })),
    }),
    prisma.nextStep.createMany({
      data: a.nextSteps.map((s, i) => ({ meetingId, step: s, order: i })),
    }),
  ]);
}
