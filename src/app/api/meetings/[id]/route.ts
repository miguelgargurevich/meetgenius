import { NextRequest } from "next/server";
import { handle } from "../../_helpers";
import { meetingService } from "@/server/services/meeting.service";
import { updateMeetingSchema } from "@/server/validators";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => meetingService.getById(id));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const body = updateMeetingSchema.parse(await req.json());
    return meetingService.update(id, body);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => meetingService.remove(id));
}
