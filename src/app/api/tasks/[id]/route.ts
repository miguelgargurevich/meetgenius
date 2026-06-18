import { NextRequest } from "next/server";
import { handle } from "../../_helpers";
import { meetingService } from "@/server/services/meeting.service";
import { updateTaskSchema } from "@/server/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const body = updateTaskSchema.parse(await req.json());
    return meetingService.updateTask(id, body);
  });
}
