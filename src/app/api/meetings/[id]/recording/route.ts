import { NextRequest } from "next/server";
import { handle } from "../../../_helpers";
import { meetingService } from "@/server/services/meeting.service";

/**
 * Controla el ciclo de vida de la grabación.
 * - action=start|pause|resume → cambio de estado (JSON)
 * - action=finish → puede incluir el audio como multipart/form-data
 *     campos: file (blob), durationSec
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action");

  return handle(async () => {
    switch (action) {
      case "start":
        return meetingService.startRecording(id);
      case "pause":
        return meetingService.pauseRecording(id);
      case "resume":
        return meetingService.resumeRecording(id);
      case "finish": {
        const ct = req.headers.get("content-type") ?? "";
        if (ct.includes("multipart/form-data")) {
          const form = await req.formData();
          const file = form.get("file") as File | null;
          const durationSec = Number(form.get("durationSec") ?? 0);
          if (file) {
            const buf = Buffer.from(await file.arrayBuffer());
            return meetingService.finishRecording(id, {
              data: buf,
              mimeType: file.type || "audio/webm",
              durationSec,
            });
          }
        }
        return meetingService.finishRecording(id, null);
      }
      default:
        throw new Error(`Acción de grabación desconocida: ${action}`);
    }
  });
}
