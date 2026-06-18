"use client";

import { startOfWeek, addDays, isSameDay, startOfDay, endOfDay, format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/hooks/use-calendar";
import { PLATFORM_DOT } from "./month-view";

const HOUR_START = 7;
const HOUR_END = 22;
const ROW = 48; // px por hora

export function WeekView({
  week,
  items,
  onItemClick,
  onSlotClick,
}: {
  week: Date;
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  onSlotClick: (date: Date) => void;
}) {
  const start = startOfWeek(week, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const today = new Date();

  const timedItems = items.filter((it) => !it.allDay);
  const allDayItems = items.filter((it) => it.allDay);
  const allDayFor = (day: Date) =>
    allDayItems.filter((it) => it.start <= endOfDay(day) && it.end > startOfDay(day));

  const topFor = (d: Date) => ((d.getHours() + d.getMinutes() / 60 - HOUR_START) * ROW);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      {/* Cabecera de días */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border)] bg-[var(--muted)]/40">
        <div />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={cn(
              "px-2 py-2 text-center text-xs",
              isSameDay(d, today) ? "font-semibold text-[var(--primary)]" : "text-[var(--muted-foreground)]",
            )}
          >
            {format(d, "EEE d", { locale: es })}
          </div>
        ))}
      </div>

      {/* Fila "todo el día" */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border)]">
        <div className="flex items-center justify-end px-1 py-1 text-[10px] text-[var(--muted-foreground)]">
          todo el día
        </div>
        {days.map((day) => (
          <div key={day.toISOString()} className="min-h-7 space-y-0.5 border-l border-[var(--border)] p-1">
            {allDayFor(day).map((it) => (
              <div
                key={it.id}
                onClick={() => onItemClick(it)}
                className={cn(
                  "cursor-pointer truncate rounded px-1.5 py-0.5 text-[11px] leading-tight",
                  it.source === "app"
                    ? "bg-[color-mix(in_oklab,var(--primary)_22%,transparent)] text-[var(--foreground)]"
                    : "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[var(--foreground)]",
                )}
                title={it.title}
              >
                {it.title}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Rejilla horaria */}
      <div className="grid max-h-[60vh] grid-cols-[56px_repeat(7,1fr)] overflow-y-auto">
        {/* Columna de horas */}
        <div>
          {hours.map((h) => (
            <div key={h} className="relative border-b border-[var(--border)]" style={{ height: ROW }}>
              <span className="absolute -top-2 right-1 text-[10px] text-[var(--muted-foreground)]">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        {days.map((day) => {
          const dayItems = timedItems.filter((it) => isSameDay(it.start, day));
          return (
            <div key={day.toISOString()} className="relative border-l border-[var(--border)]">
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b border-[var(--border)] hover:bg-[var(--accent)]/30"
                  style={{ height: ROW }}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onSlotClick(d);
                  }}
                />
              ))}
              {dayItems.map((it) => {
                const top = Math.max(0, topFor(it.start));
                const durMin = (it.end.getTime() - it.start.getTime()) / 60000;
                const height = Math.max(20, (durMin / 60) * ROW);
                return (
                  <div
                    key={it.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(it);
                    }}
                    className={cn(
                      "absolute inset-x-1 cursor-pointer overflow-hidden rounded-md border px-1.5 py-1 text-[11px] leading-tight",
                      it.source === "app"
                        ? "border-[var(--brand-400)]/40 bg-[color-mix(in_oklab,var(--primary)_22%,var(--card))]"
                        : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
                    )}
                    style={{ top, height }}
                    title={`${format(it.start, "HH:mm")} · ${it.title}`}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: it.platform ? PLATFORM_DOT[it.platform] : "var(--muted-foreground)" }}
                      />
                      <span className="truncate font-medium">{it.title}</span>
                    </div>
                    <span className="text-[10px] opacity-70">{format(it.start, "HH:mm")}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
