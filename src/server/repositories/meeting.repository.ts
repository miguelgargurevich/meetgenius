import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Repository Pattern: aísla el acceso a datos de reuniones.
 * Los servicios dependen de esta interfaz, no de Prisma directamente,
 * lo que facilita testear y sustituir el motor de persistencia.
 */
export const meetingRepository = {
  findMany(where: Prisma.MeetingWhereInput) {
    return prisma.meeting.findMany({
      where,
      include: {
        _count: { select: { tasks: true, agreements: true, risks: true } },
        owner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  findDetail(id: string) {
    return prisma.meeting.findUnique({
      where: { id },
      include: {
        owner: true,
        recording: true,
        transcription: true,
        summary: true,
        tasks: { orderBy: { createdAt: "asc" } },
        agreements: true,
        risks: true,
        openQuestions: true,
        nextSteps: { orderBy: { order: "asc" } },
        reports: true,
        aiJobs: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  create(data: Prisma.MeetingCreateInput) {
    return prisma.meeting.create({ data });
  },

  update(id: string, data: Prisma.MeetingUpdateInput) {
    return prisma.meeting.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.meeting.delete({ where: { id } });
  },
};
