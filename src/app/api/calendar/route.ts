import { NextRequest } from "next/server";
import { handle } from "../_helpers";
import { calendarService } from "@/server/services/calendar.service";

/** Eventos de las suscripciones ICS en el rango [start, end). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const start = sp.get("start");
  const end = sp.get("end");
  return handle(async () => {
    if (!start || !end) return { events: [] };
    const events = await calendarService.getEventsInRange(start, end);
    return { events };
  });
}
