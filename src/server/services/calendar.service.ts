import IcalExpander from "ical-expander";
import { logger } from "@/lib/logger";
import { getCurrentOrg } from "@/server/context";
import { calendarSourceRepository } from "@/server/repositories/calendar-source.repository";
import type { AddSourceInput } from "@/server/validators";

const log = logger.child("calendar");

export interface CalendarEventDTO {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  url: string;
  notes: string;
  attendees: string[];
  calendar: string;
  joinUrl: string | null;
  platform: "meet" | "teams" | "zoom" | "webex" | null;
}

const JOIN_RE =
  /(https?:\/\/[^\s"'<>]*(?:teams\.microsoft\.com|teams\.live\.com|meet\.google\.com|zoom\.us|webex\.com)[^\s"'<>]*)/i;

function platformOf(joinUrl: string | null): CalendarEventDTO["platform"] {
  if (!joinUrl) return null;
  if (/teams\./i.test(joinUrl)) return "teams";
  if (/meet\.google\.com/i.test(joinUrl)) return "meet";
  if (/zoom\.us/i.test(joinUrl)) return "zoom";
  if (/webex\.com/i.test(joinUrl)) return "webex";
  return null;
}

function extractJoin(...fields: string[]): string | null {
  for (const f of fields) {
    const m = f && f.match(JOIN_RE);
    if (m) return m[1];
  }
  return null;
}

/** Asistentes del VEVENT: usa el CN (nombre) o, si no, el email sin "mailto:". */
function extractAttendees(component: any): string[] {
  try {
    const props = component?.getAllProperties?.("attendee") ?? [];
    const out: string[] = [];
    for (const p of props) {
      const cn = p.getParameter?.("cn");
      let label = typeof cn === "string" ? cn.trim() : "";
      if (!label) {
        const v = p.getFirstValue?.();
        label = typeof v === "string" ? v.replace(/^mailto:/i, "").trim() : "";
      }
      if (label && !out.includes(label)) out.push(label);
    }
    return out;
  } catch {
    return [];
  }
}

// ── Caché en memoria del texto ICS (TTL corto) ─────────────────
const cache = new Map<string, { ts: number; text: string }>();
const TTL_MS = 60_000;

async function fetchIcs(url: string): Promise<string | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.text;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    // webcal:// → https://
    const httpUrl = url.replace(/^webcal:\/\//i, "https://");
    const res = await fetch(httpUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      log.warn("fetch ICS no-ok", { url, status: res.status });
      return null;
    }
    const text = await res.text();
    cache.set(url, { ts: Date.now(), text });
    return text;
  } catch (err) {
    log.warn("fetch ICS falló", { url, err: String(err) });
    return null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapItem(item: any, start: any, end: any, sourceName: string): CalendarEventDTO {
  const title = item.summary || "(sin título)";
  const location = item.location || "";
  const notes = item.description || "";
  let evUrl = "";
  try {
    evUrl = item.component?.getFirstPropertyValue?.("url") || "";
  } catch {
    /* sin url */
  }
  const startJs: Date = start.toJSDate();
  const endJs: Date = end.toJSDate();
  const joinUrl = extractJoin(evUrl, location, notes);
  return {
    id: `${item.uid || "ev"}:${startJs.getTime()}`,
    title,
    start: startJs.toISOString(),
    end: endJs.toISOString(),
    allDay: Boolean(start.isDate),
    location,
    url: evUrl,
    notes,
    attendees: extractAttendees(item.component),
    calendar: sourceName,
    joinUrl,
    platform: platformOf(joinUrl),
  };
}

/** Parsea un texto ICS y devuelve los eventos (incl. recurrencias) en el rango. Pura/testeable. */
export function parseIcsRange(
  ics: string,
  start: Date,
  end: Date,
  sourceName: string,
): CalendarEventDTO[] {
  const expander = new IcalExpander({ ics, maxIterations: 2000 });
  const { events, occurrences } = expander.between(start, end);
  const out: CalendarEventDTO[] = [];
  for (const e of events) out.push(mapItem(e, e.startDate, e.endDate, sourceName));
  for (const o of occurrences) out.push(mapItem(o.item, o.startDate, o.endDate, sourceName));
  return out;
}

export const calendarService = {
  /** Eventos de todas las fuentes ICS activas, en [startISO, endISO). */
  async getEventsInRange(startISO: string, endISO: string): Promise<CalendarEventDTO[]> {
    const org = await getCurrentOrg();
    const sources = await calendarSourceRepository.findEnabled(org.id);
    if (!sources.length) return [];

    const start = new Date(startISO);
    const end = new Date(endISO);
    const all: CalendarEventDTO[] = [];

    await Promise.all(
      sources.map(async (src) => {
        const ics = await fetchIcs(src.url);
        if (!ics) return;
        try {
          all.push(...parseIcsRange(ics, start, end, src.name));
        } catch (err) {
          log.warn("parseo ICS falló", { source: src.name, err: String(err) });
        }
      }),
    );

    return all.sort((a, b) => +new Date(a.start) - +new Date(b.start));
  },

  async listSources() {
    const org = await getCurrentOrg();
    return calendarSourceRepository.findAll(org.id);
  },

  async addSource(input: AddSourceInput) {
    const org = await getCurrentOrg();
    return calendarSourceRepository.create({
      name: input.name,
      url: input.url,
      organization: { connect: { id: org.id } },
    });
  },

  async removeSource(id: string) {
    return calendarSourceRepository.delete(id);
  },
};
