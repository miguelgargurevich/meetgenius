import { NextRequest } from "next/server";
import { handle } from "../../_helpers";
import { calendarService } from "@/server/services/calendar.service";
import { addSourceSchema } from "@/server/validators";

export async function GET() {
  return handle(() => calendarService.listSources());
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = addSourceSchema.parse(await req.json());
    return calendarService.addSource(body);
  });
}
