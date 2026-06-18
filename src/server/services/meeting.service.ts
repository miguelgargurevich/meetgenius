import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { storage } from "@/server/storage";
import { getCurrentOrg } from "@/server/context";
import { meetingRepository } from "@/server/repositories/meeting.repository";
import { audit } from "./audit.service";
import { runAnalysisPipeline } from "./analysis.service";
import type { CreateMeetingInput } from "@/server/validators";

const log = logger.child("meetings");

export const meetingService = {
  async list(filters?: { q?: string; status?: string; from?: string; to?: string }) {
    const org = await getCurrentOrg();
    return meetingRepository.findMany({
      organizationId: org.id,
      ...(filters?.status ? { status: filters.status as never } : {}),
      ...(filters?.q
        ? {
            OR: [
              { title: { contains: filters.q } },
              { description: { contains: filters.q } },
            ],
          }
        : {}),
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    });
  },

  async getById(id: string) {
    const meeting = await meetingRepository.findDetail(id);
    if (!meeting) throw new NotFoundError("Reunión", id);
    return meeting;
  },

  async create(input: CreateMeetingInput) {
    const org = await getCurrentOrg();
    const meeting = await meetingRepository.create({
      title: input.title,
      description: input.description,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      participants: input.participants,
      organization: { connect: { id: org.id } },
      owner: { connect: { id: org.userId } },
    });
    await audit({ ...org, action: "create", entity: "Meeting", entityId: meeting.id });
    return meeting;
  },

  async startRecording(id: string) {
    return meetingRepository.update(id, { status: "RECORDING", startedAt: new Date() });
  },

  async pauseRecording(id: string) {
    return meetingRepository.update(id, { status: "PAUSED" });
  },

  async resumeRecording(id: string) {
    return meetingRepository.update(id, { status: "RECORDING" });
  },

  /**
   * Finaliza la grabación: persiste el archivo, registra duración y
   * dispara el pipeline de transcripción + análisis IA.
   */
  async finishRecording(
    id: string,
    audio: { data: Buffer; mimeType: string; durationSec: number } | null,
  ) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundError("Reunión", id);

    if (audio) {
      const ext = audio.mimeType.includes("mp4") ? "mp4" : "webm";
      const { filePath, sizeBytes } = await storage.saveRecording(id, audio.data, ext);
      await prisma.recording.upsert({
        where: { meetingId: id },
        create: {
          meetingId: id,
          filePath,
          mimeType: audio.mimeType,
          sizeBytes,
          durationSec: audio.durationSec,
        },
        update: { filePath, sizeBytes, durationSec: audio.durationSec },
      });
    }

    await meetingRepository.update(id, {
      status: "PROCESSING",
      endedAt: new Date(),
      durationSec: audio?.durationSec ?? meeting.durationSec,
    });

    // Pipeline asíncrono (no bloquea la respuesta al cliente).
    runAnalysisPipeline(id).catch((err) =>
      log.error("pipeline falló", { meetingId: id, err: String(err) }),
    );

    return { ok: true };
  },

  async remove(id: string) {
    const org = await getCurrentOrg();
    await meetingRepository.delete(id);
    await audit({ ...org, action: "delete", entity: "Meeting", entityId: id });
  },

  async updateTask(taskId: string, data: { status?: string; priority?: string }) {
    return prisma.task.update({
      where: { id: taskId },
      data: data as never,
    });
  },
};
