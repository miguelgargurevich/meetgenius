import { getCurrentOrg } from "@/server/context";
import { taxonomyRepository } from "@/server/repositories/taxonomy.repository";

/** Carpetas y etiquetas para organizar reuniones (scope por organización). */
export const taxonomyService = {
  async listFolders() {
    const org = await getCurrentOrg();
    return taxonomyRepository.findFolders(org.id);
  },
  async createFolder(input: { name: string; color?: string | null }) {
    const org = await getCurrentOrg();
    return taxonomyRepository.createFolder(org.id, input);
  },
  async deleteFolder(id: string) {
    return taxonomyRepository.deleteFolder(id);
  },

  async listTags() {
    const org = await getCurrentOrg();
    return taxonomyRepository.findTags(org.id);
  },
  async createTag(input: { name: string; color?: string | null }) {
    const org = await getCurrentOrg();
    return taxonomyRepository.createTag(org.id, input);
  },
  async deleteTag(id: string) {
    return taxonomyRepository.deleteTag(id);
  },

  async setMeetingTaxonomy(
    meetingId: string,
    input: { folderIds?: string[]; tagIds?: string[] },
  ) {
    if (input.folderIds) await taxonomyRepository.setMeetingFolders(meetingId, input.folderIds);
    if (input.tagIds) await taxonomyRepository.setMeetingTags(meetingId, input.tagIds);
    return { ok: true };
  },
};
