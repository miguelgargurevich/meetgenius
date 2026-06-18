"use client";

import { useQuery } from "@tanstack/react-query";
import { desktop, isDesktopApp, type CalendarEvent } from "@/lib/desktop";

/** Agenda de hoy desde el calendario de macOS (solo en la app de escritorio). */
export function useTodayAgenda() {
  return useQuery({
    queryKey: ["agenda-today"],
    enabled: isDesktopApp(),
    refetchInterval: 5 * 60 * 1000, // refresca cada 5 min
    queryFn: async () => {
      const res = await desktop()?.getTodayAgenda?.();
      return res ?? { events: [] as CalendarEvent[] };
    },
  });
}

/** Eventos del calendario de macOS en un rango (vista de calendario). */
export function useCalendarRange(startISO: string, endISO: string) {
  return useQuery({
    queryKey: ["calendar-range", startISO, endISO],
    enabled: isDesktopApp(),
    queryFn: async () => {
      const res = await desktop()?.getCalendarRange?.(startISO, endISO);
      return res ?? { events: [] as CalendarEvent[] };
    },
  });
}

/** Evento que está ocurriendo ahora (o el próximo en arrancar). */
export function findCurrentEvent(events: CalendarEvent[], at = Date.now()): CalendarEvent | null {
  const ongoing = events.find(
    (e) => new Date(e.start).getTime() <= at && new Date(e.end).getTime() >= at,
  );
  return ongoing ?? null;
}
