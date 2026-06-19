"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Users, Video, Mic } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/misc";
import { useTodayAgenda } from "@/hooks/use-agenda";
import { type CalendarEvent } from "@/lib/desktop";
import { api } from "@/lib/api-client";

const PLATFORM_LABEL: Record<string, string> = {
  meet: "Google Meet",
  teams: "Teams",
  zoom: "Zoom",
  webex: "Webex",
};

export function AgendaToday() {
  const router = useRouter();
  const { data, isLoading } = useTodayAgenda();
  const [creatingId, setCreatingId] = React.useState<string | null>(null);

  const record = async (ev: CalendarEvent) => {
    setCreatingId(ev.id);
    try {
      const meeting = await api.post<{ id: string }>("/api/meetings", {
        title: ev.title,
        participants: ev.attendees.slice(0, 25),
        description: ev.location || undefined,
      });
      router.push(`/meetings/${meeting.id}?record=1`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreatingId(null);
    }
  };

  const now = Date.now();
  const events = data?.events ?? [];
  const withCalls = events.filter((e) => e.platform || e.joinUrl);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="size-4" /> Agenda de hoy
        </CardTitle>
        <span className="text-xs text-[var(--muted-foreground)]">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-[var(--muted-foreground)]">
            <Spinner /> Cargando agenda…
          </div>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
            No hay reuniones en tu calendario hoy.
          </p>
        ) : (
          <div className="space-y-1">
            {events.map((ev) => {
              const start = new Date(ev.start);
              const end = new Date(ev.end);
              const ongoing = start.getTime() <= now && end.getTime() >= now;
              const isCall = Boolean(ev.platform || ev.joinUrl);
              return (
                <div
                  key={ev.id}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${
                    ongoing ? "bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]" : ""
                  }`}
                >
                  <div className="w-14 shrink-0 text-sm tabular-nums text-[var(--muted-foreground)]">
                    {format(start, "HH:mm")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{ev.title}</p>
                      {ongoing && <Badge variant="success">En curso</Badge>}
                      {ev.platform && (
                        <Badge variant="brand">
                          <Video className="size-3" /> {PLATFORM_LABEL[ev.platform]}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {format(start, "HH:mm")}–{format(end, "HH:mm")}
                      </span>
                      {ev.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3" /> {ev.attendees.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {isCall && (
                    <Button
                      size="sm"
                      variant={ongoing ? "default" : "outline"}
                      onClick={() => record(ev)}
                      disabled={creatingId === ev.id}
                    >
                      {creatingId === ev.id ? <Spinner /> : <Mic className="size-4" />} Grabar
                    </Button>
                  )}
                </div>
              );
            })}
            {withCalls.length === 0 && (
              <p className="px-3 pt-2 text-xs text-[var(--muted-foreground)]">
                Ninguna de las reuniones de hoy tiene enlace de videollamada detectable.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
