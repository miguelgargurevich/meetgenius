import { NextRequest } from "next/server";
import { handle } from "../_helpers";
import { meetingService } from "@/server/services/meeting.service";
import { createMeetingSchema } from "@/server/validators";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return handle(() =>
    meetingService.list({
      q: sp.get("q") ?? undefined,
      status: sp.get("status") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    }),
  );
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = createMeetingSchema.parse(await req.json());
    return meetingService.create(body);
  });
}
