import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  getLanguageProvider,
  getTranscriptionProvider,
  type AnalysisResult,
} from "@/lib/ai";
import type { TranscriptionResult } from "@/lib/ai/types";
import { vocabularyService, buildVocabularyPrompt } from "./vocabulary.service";

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

  const vocabulary = await vocabularyService.getVocabulary().catch(() => [] as string[]);
  const ctx = {
    title: meeting.title,
    participants: (meeting.participants as string[] | null) ?? [],
    vocabulary,
  };

  try {
    // ── 1. Transcripción (sesgada por el vocabulario del usuario) ──
    const transcript = await transcribe(
      meetingId,
      meeting.recording?.filePath,
      buildVocabularyPrompt(vocabulary),
    );

    // ── 2. Diarización (¿quién dijo qué?) ─────────────────────
    // Aproximada por texto; no aborta el pipeline si falla.
    await diarizeSegments(meetingId, transcript, ctx);

    // ── 3. Análisis IA ────────────────────────────────────────
    const analysis = await analyze(meetingId, transcript.text, ctx);

    // ── 4. Persistencia de resultados ─────────────────────────
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

async function transcribe(
  meetingId: string,
  filePath?: string | null,
  prompt?: string,
): Promise<TranscriptionResult> {
  const provider = getTranscriptionProvider();
  const started = Date.now();
  const job = await prisma.aIJob.create({
    data: { meetingId, type: "TRANSCRIPTION", provider: provider.name, status: "RUNNING" },
  });

  const result = await provider.transcribe(filePath ?? "", prompt ? { prompt } : undefined);
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
      // Reanálisis: regeneramos segments → el mapeo de nombres queda obsoleto.
      speakerNames: {},
    },
  });
  await prisma.aIJob.update({
    where: { id: job.id },
    data: { status: "SUCCEEDED", runtimeMs },
  });
  return result;
}

/**
 * Diarización aproximada: pide al modelo el hablante de cada segmento y
 * reescribe `Transcription.segments` con la etiqueta. Best-effort: cualquier
 * fallo se registra y se omite sin tumbar el pipeline.
 */
async function diarizeSegments(
  meetingId: string,
  transcript: TranscriptionResult,
  ctx: { participants: string[] },
): Promise<void> {
  const segments = transcript.segments ?? [];
  if (segments.length === 0) return;

  const provider = getLanguageProvider();
  const started = Date.now();
  const job = await prisma.aIJob.create({
    data: {
      meetingId,
      type: "DIARIZATION",
      provider: provider.name,
      model: provider.model,
      status: "RUNNING",
    },
  });
  try {
    const speakers = await provider.diarize(
      segments.map((s) => ({ start: s.start, end: s.end, text: s.text })),
      ctx,
    );
    const withSpeakers = segments.map((s, i) => ({ ...s, speaker: speakers[i] ?? null }));
    transcript.segments = withSpeakers;
    await prisma.transcription.update({
      where: { meetingId },
      data: { segments: withSpeakers as unknown as object },
    });
    await prisma.aIJob.update({
      where: { id: job.id },
      data: { status: "SUCCEEDED", runtimeMs: Date.now() - started },
    });
  } catch (err) {
    log.warn("diarización omitida", { meetingId, err: String(err) });
    await prisma.aIJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: String(err), runtimeMs: Date.now() - started },
    });
  }
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
    prisma.insight.upsert({
      where: { meetingId },
      create: {
        meetingId,
        chapters: (a.chapters ?? []) as unknown as object,
        highlights: (a.highlights ?? []) as unknown as object,
        diagrams: (a.diagrams ?? []) as unknown as object,
        followUpSubject: a.followUpEmail?.subject ?? null,
        followUpBody: a.followUpEmail?.body ?? null,
      },
      update: {
        chapters: (a.chapters ?? []) as unknown as object,
        highlights: (a.highlights ?? []) as unknown as object,
        diagrams: (a.diagrams ?? []) as unknown as object,
        followUpSubject: a.followUpEmail?.subject ?? null,
        followUpBody: a.followUpEmail?.body ?? null,
      },
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
