import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Acceso a datos de las suscripciones de calendario (URLs .ics). */
export const calendarSourceRepository = {
  findEnabled(organizationId: string) {
    return prisma.calendarSource.findMany({
      where: { organizationId, enabled: true },
      orderBy: { createdAt: "asc" },
    });
  },

  findAll(organizationId: string) {
    return prisma.calendarSource.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
  },

  create(data: Prisma.CalendarSourceCreateInput) {
    return prisma.calendarSource.create({ data });
  },

  delete(id: string) {
    return prisma.calendarSource.delete({ where: { id } });
  },
};
