"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CalendarEvent, TodayAgenda } from "@/lib/desktop";

function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Eventos del calendario (suscripciones ICS) en un rango. Server-side. */
export function useCalendarRange(startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["calendar-range", startISO, endISO],
    queryFn: () =>
      api.get<{ events: CalendarEvent[] }>(
        `/api/calendar?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`,
      ) as Promise<TodayAgenda>,
  });
}

/** Agenda de hoy (mismo origen ICS, rango = hoy). */
export function useTodayAgenda() {
  const start = startOfToday();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return useQuery({
    queryKey: ["agenda-today", start.toISOString()],
    refetchInterval: 5 * 60 * 1000,
    queryFn: () =>
      api.get<{ events: CalendarEvent[] }>(
        `/api/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
      ) as Promise<TodayAgenda>,
  });
}

/** Evento que está ocurriendo ahora (o el próximo en arrancar). */
export function findCurrentEvent(events: CalendarEvent[], at = Date.now()): CalendarEvent | null {
  const ongoing = events.find(
    (e) => new Date(e.start).getTime() <= at && new Date(e.end).getTime() >= at,
  );
  return ongoing ?? null;
}
