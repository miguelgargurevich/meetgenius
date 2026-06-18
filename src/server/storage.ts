import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { env } from "@/lib/env";

/**
 * Almacenamiento de archivos de grabación.
 * En dev/desktop guarda en disco local (STORAGE_DIR).
 * Diseñado para sustituirse por S3/GCS sin tocar los servicios.
 */
export const storage = {
  async saveRecording(
    meetingId: string,
    data: Buffer,
    ext = "webm",
  ): Promise<{ filePath: string; sizeBytes: number }> {
    const dir = resolve(env.STORAGE_DIR);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${meetingId}.${ext}`);
    await writeFile(filePath, data);
    return { filePath, sizeBytes: data.byteLength };
  },

  resolveReportPath(meetingId: string, ext: "pdf" | "xlsx"): string {
    return join(resolve(env.STORAGE_DIR), "..", "reports", `${meetingId}.${ext}`);
  },
};
