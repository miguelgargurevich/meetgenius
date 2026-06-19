import { prisma } from "@/lib/db";

/** Acceso a datos de carpetas y etiquetas (organización de reuniones). */
export const taxonomyRepository = {
  // ── Folders ──
  findFolders(organizationId: string) {
    return prisma.folder.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { meetings: true } } },
    });
  },
  createFolder(organizationId: string, data: { name: string; color?: string | null }) {
    return prisma.folder.create({
      data: { organizationId, name: data.name, color: data.color ?? null },
    });
  },
  deleteFolder(id: string) {
    return prisma.folder.delete({ where: { id } });
  },

  // ── Tags ──
  findTags(organizationId: string) {
    return prisma.tag.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { meetings: true } } },
    });
  },
  createTag(organizationId: string, data: { name: string; color?: string | null }) {
    return prisma.tag.create({
      data: { organizationId, name: data.name, color: data.color ?? null },
    });
  },
  deleteTag(id: string) {
    return prisma.tag.delete({ where: { id } });
  },

  // ── Asignación a una reunión (reemplaza el conjunto) ──
  setMeetingFolders(meetingId: string, folderIds: string[]) {
    return prisma.meeting.update({
      where: { id: meetingId },
      data: { folders: { set: folderIds.map((id) => ({ id })) } },
    });
  },
  setMeetingTags(meetingId: string, tagIds: string[]) {
    return prisma.meeting.update({
      where: { id: meetingId },
      data: { tags: { set: tagIds.map((id) => ({ id })) } },
    });
  },
};
