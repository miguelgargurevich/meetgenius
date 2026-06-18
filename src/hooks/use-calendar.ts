"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMeetings } from "./use-meetings";
import { useCalendarRange } from "./use-agenda";

export interface CalendarItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: "app" | "macos";
  allDay: boolean;
  platform: "meet" | "teams" | "zoom" | "webex" | null;
  joinUrl: string | null;
  /** id de la reunión en la app (si source === "app"). */
  meetingId?: string;
  /** estado de la reunión de la app. */
  status?: string;
  attendees?: string[];
}

const DEFAULT_MIN = 30;

function platformOfUrl(url: string | null): CalendarItem["platform"] {
  if (!url) return null;
  if (/teams\./i.test(url)) return "teams";
  if (/meet\.google\.com/i.test(url)) return "meet";
  if (/zoom\.us/i.test(url)) return "zoom";
  if (/webex\.com/i.test(url)) return "webex";
  return null;
}

/**
 * Une las reuniones de la app (SQLite) con los eventos del calendario de macOS
 * (EventKit) en un solo conjunto de items, deduplicando los eventos macOS que
 * ya corresponden a una reunión creada desde la app (por externalEventId).
 */
export function useCalendar(rangeStart: Date, rangeEnd: Date) {
  const meetingsQ = useMeetings();
  // Consultamos el rango visible (mes/semana). La automatización de Calendar.app
  // es lenta para rangos grandes, así que evitamos pedir todo el año de golpe.
  const macosQ = useCalendarRange(rangeStart.toISOString(), rangeEnd.toISOString());

  const items = React.useMemo<CalendarItem[]>(() => {
    const meetings = meetingsQ.data ?? [];
    const externalIds = new Set(
      meetings.map((m) => m.externalEventId).filter(Boolean) as string[],
    );

    const appItems: CalendarItem[] = meetings.map((m) => {
      const start = new Date(m.scheduledAt ?? m.createdAt);
      const minutes = m.scheduledMinutes ?? Math.max(DEFAULT_MIN, Math.round(m.durationSec / 60));
      return {
        id: `app-${m.id}`,
        title: m.title,
        start,
        end: new Date(start.getTime() + minutes * 60_000),
        source: "app",
        allDay: false,
        platform: platformOfUrl(m.meetingUrl),
        joinUrl: m.meetingUrl,
        meetingId: m.id,
        status: m.status,
      };
    });

    const macItems: CalendarItem[] = (macosQ.data?.events ?? [])
      .filter((e) => !externalIds.has(e.id))
      .map((e) => ({
        id: `mac-${e.id}`,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        source: "macos",
        allDay: e.allDay,
        platform: e.platform,
        joinUrl: e.joinUrl,
        attendees: e.attendees,
      }));

    return [...appItems, ...macItems].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [meetingsQ.data, macosQ.data]);

  return {
    items,
    isLoading: meetingsQ.isLoading || macosQ.isLoading,
    macosError: macosQ.data?.error,
  };
}

/** Botón "Sincronizar": refetch del calendario de macOS y reuniones. */
export function useSyncCalendar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["calendar-range"] });
    qc.invalidateQueries({ queryKey: ["meetings"] });
    qc.invalidateQueries({ queryKey: ["agenda-today"] });
  };
}
