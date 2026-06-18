"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/hooks/use-calendar";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const DOT: Record<string, string> = {
  meet: "#22c55e",
  teams: "#6366f1",
  zoom: "#06b6d4",
  webex: "#f59e0b",
};

export function MonthView({
  month,
  items,
  onDayClick,
  onItemClick,
}: {
  month: Date;
  items: CalendarItem[];
  onDayClick: (date: Date) => void;
  onItemClick: (item: CalendarItem) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--muted)]/40">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-[var(--muted-foreground)]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((it) => isSameDay(it.start, day));
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-28 border-b border-r border-[var(--border)] p-1.5 text-left align-top transition-colors hover:bg-[var(--accent)]/40",
                !inMonth && "bg-[var(--muted)]/20 text-[var(--muted-foreground)]",
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isToday && "bg-[var(--primary)] font-semibold text-[var(--primary-foreground)]",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 3).map((it) => (
                  <div
                    key={it.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(it);
                    }}
                    className={cn(
                      "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] leading-tight",
                      it.source === "app"
                        ? "bg-[color-mix(in_oklab,var(--primary)_22%,transparent)] text-[var(--foreground)]"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                    )}
                    title={`${format(it.start, "HH:mm")} · ${it.title}`}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: it.platform ? DOT[it.platform] : "var(--muted-foreground)" }}
                    />
                    <span className="truncate">
                      {format(it.start, "HH:mm")} {it.title}
                    </span>
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div className="px-1.5 text-[10px] text-[var(--muted-foreground)]">
                    +{dayItems.length - 3} más
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { DOT as PLATFORM_DOT };
