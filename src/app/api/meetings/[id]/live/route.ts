import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextRequest } from "next/server";
import { handle } from "../../../_helpers";
import { getTranscriptionProvider } from "@/lib/ai";
import { logger } from "@/lib/logger";

const log = logger.child("live");

/**
 * Transcripción en vivo: recibe una VENTANA de audio (un fragmento corto y
 * autocontenido grabado durante la reunión), la transcribe con Whisper y
 * devuelve el texto parcial. No persiste nada: la transcripción definitiva la
 * produce el pipeline al finalizar. Si no hay clave de IA, usa el mock.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return handle(async () => {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file || file.size === 0) return { text: "" };

    const ext = file.type.includes("mp4") ? "mp4" : "webm";
    const tmp = join(tmpdir(), `mg-live-${id}-${file.size}.${ext}`);
    await writeFile(tmp, Buffer.from(await file.arrayBuffer()));
    try {
      const provider = getTranscriptionProvider();
      const result = await provider.transcribe(tmp);
      return { text: result.text.trim() };
    } catch (err) {
      log.warn("ventana en vivo falló", { meetingId: id, err: String(err) });
      return { text: "" };
    } finally {
      await unlink(tmp).catch(() => {});
    }
  });
}
