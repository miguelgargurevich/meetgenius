import { NextRequest } from "next/server";
import { handle } from "../../../_helpers";
import { meetingService } from "@/server/services/meeting.service";
import { speakerNamesSchema } from "@/server/validators";

/** Renombra los hablantes diarizados de una reunión ("Hablante 1" → "Ana"). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const { names } = speakerNamesSchema.parse(await req.json());
    return meetingService.renameSpeakers(id, names);
  });
}
