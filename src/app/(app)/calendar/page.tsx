"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  addWeeks,
  addDays,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, CalendarPlus, CalendarX } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { CalendarSourcesDialog } from "@/components/calendar/calendar-sources-dialog";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { useCalendar, useSyncCalendar, type CalendarItem } from "@/hooks/use-calendar";
import { useSources } from "@/hooks/use-calendar-sources";
import { api } from "@/lib/api-client";

type ViewMode = "month" | "week";

function toLocalInput(d: Date) {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export default function CalendarPage() {
  const router = useRouter();
  const sync = useSyncCalendar();
  const { data: sources } = useSources();
  const [view, setView] = React.useState<ViewMode>("month");
  const [cursor, setCursor] = React.useState(new Date());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sourcesOpen, setSourcesOpen] = React.useState(false);
  const [defaultDate, setDefaultDate] = React.useState<string | undefined>();

  const { rangeStart, rangeEnd } = React.useMemo(() => {
    if (view === "month") {
      return {
        rangeStart: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        rangeEnd: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
      };
    }
    const s = startOfWeek(cursor, { weekStartsOn: 1 });
    return { rangeStart: s, rangeEnd: addDays(s, 7) };
  }, [view, cursor]);

  const { items, isLoading, syncing } = useCalendar(rangeStart, rangeEnd);
  const noSources = sources && sources.length === 0;

  const navigate = (dir: -1 | 1) =>
    setCursor((c) => (view === "month" ? addMonths(c, dir) : addWeeks(c, dir)));

  const openCreate = (date?: Date) => {
    const base = date ?? new Date();
    if (date) base.setHours(9, 0, 0, 0);
    setDefaultDate(toLocalInput(base));
    setDialogOpen(true);
  };

  const onItemClick = async (it: CalendarItem) => {
    if (it.source === "app" && it.meetingId) {
      router.push(`/meetings/${it.meetingId}`);
      return;
    }
    // Evento del calendario externo: si es videollamada, ofrecemos grabarla.
    if (it.joinUrl || it.platform) {
      try {
        const meeting = await api.post<{ id: string }>("/api/meetings", {
          title: it.title,
          participants: (it.attendees ?? []).slice(0, 25),
          scheduledAt: it.start.toISOString(),
          meetingUrl: it.joinUrl || "",
        });
        router.push(`/meetings/${meeting.id}?record=1`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    } else {
      toast.info("Evento del calendario sin enlace de videollamada.");
    }
  };

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: es })
      : `${format(rangeStart, "d MMM", { locale: es })} – ${format(addDays(rangeStart, 6), "d MMM yyyy", { locale: es })}`;

  return (
    <div>
      <PageHeader
        title="Calendario"
        description="Tus reuniones y los calendarios que conectes, en un solo lugar."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSourcesOpen(true)}>
              <CalendarPlus className="size-4" /> Calendarios
            </Button>
            <Button onClick={() => openCreate()}>
              <Plus className="size-4" /> Nueva reunión
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-8">
        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="ml-2 text-lg font-semibold capitalize">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-[var(--border)] p-0.5">
              {(["month", "week"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    view === v ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {v === "month" ? "Mes" : "Semana"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => sync()} disabled={syncing}>
              <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </Button>
          </div>
        </div>

        {noSources && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-[color-mix(in_oklab,var(--primary)_6%,var(--card))] p-4 text-sm">
            <div className="flex items-start gap-2">
              <CalendarX className="mt-0.5 size-4 shrink-0 text-[var(--brand-400)]" />
              <p className="text-[var(--muted-foreground)]">
                Aún no has conectado ningún calendario. Suscríbete por URL <strong>.ics</strong> (Outlook/Microsoft 365
                o Google) para ver tus eventos junto a tus reuniones.
              </p>
            </div>
            <Button size="sm" onClick={() => setSourcesOpen(true)}>
              <CalendarPlus className="size-4" /> Conectar
            </Button>
          </div>
        )}

        {/* Leyenda */}
        <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[color-mix(in_oklab,var(--primary)_60%,transparent)]" /> Reuniones de la app
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[var(--muted-foreground)]" /> Eventos del calendario
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-[60vh] w-full" />
        ) : view === "month" ? (
          <MonthView month={cursor} items={items} onDayClick={openCreate} onItemClick={onItemClick} />
        ) : (
          <WeekView week={cursor} items={items} onSlotClick={openCreate} onItemClick={onItemClick} />
        )}
      </div>

      <CreateMeetingDialog open={dialogOpen} onClose={() => setDialogOpen(false)} defaultDate={defaultDate} />
      <CalendarSourcesDialog open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </div>
  );
}
