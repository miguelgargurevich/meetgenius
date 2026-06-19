"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Clock,
  MapPin,
  Users,
  FileText,
  Video,
  ExternalLink,
  CalendarPlus,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import type { CalendarItem } from "@/hooks/use-calendar";

const PLATFORM_LABEL: Record<string, string> = {
  meet: "Google Meet",
  teams: "Microsoft Teams",
  zoom: "Zoom",
  webex: "Webex",
};

function formatWhen(it: CalendarItem): string {
  const { start, end, allDay } = it;
  if (allDay) {
    return `Todo el día · ${format(start, "EEEE d 'de' MMMM", { locale: es })}`;
  }
  const sameDay = format(start, "yyyyMMdd") === format(end, "yyyyMMdd");
  const left = format(start, "EEE d MMM · HH:mm", { locale: es });
  const right = sameDay
    ? format(end, "HH:mm", { locale: es })
    : format(end, "d MMM · HH:mm", { locale: es });
  return `${left} – ${right}`;
}

/** Fila etiqueta + contenido con icono. */
function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Panel de detalle de un evento del calendario externo (ICS).
 * Muestra los datos del evento y, si es una videollamada, ofrece grabarla.
 */
export function EventDetailsDialog({
  open,
  onClose,
  event,
  onUse,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  event: CalendarItem | null;
  onUse: (event: CalendarItem, opts: { record: boolean }) => void;
  busy?: boolean;
}) {
  if (!event) return null;

  const isCall = Boolean(event.joinUrl || event.platform);
  const platformLabel = event.platform ? PLATFORM_LABEL[event.platform] : null;
  // Algunas fuentes ponen el enlace de la llamada en "location"; evitamos repetirlo.
  const showLocation =
    event.location && event.location.trim() && event.location.trim() !== event.joinUrl;

  return (
    <Dialog open={open} onClose={onClose} title={event.title}>
      <div className="space-y-4">
        <div className="space-y-3">
          <Row icon={Clock}>
            <span className="capitalize">{formatWhen(event)}</span>
          </Row>

          {event.calendar && (
            <Row icon={CalendarPlus}>
              <span className="text-[var(--muted-foreground)]">{event.calendar}</span>
            </Row>
          )}

          {showLocation && (
            <Row icon={MapPin}>
              {/^https?:\/\//i.test(event.location!) ? (
                <a
                  href={event.location}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[var(--brand-400)] hover:underline"
                >
                  {event.location}
                </a>
              ) : (
                <span>{event.location}</span>
              )}
            </Row>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <Row icon={Users}>
              <div className="flex flex-wrap gap-1.5">
                {event.attendees.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </Row>
          )}

          {event.notes && event.notes.trim() && (
            <Row icon={FileText}>
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[var(--muted-foreground)]">
                {event.notes.trim()}
              </p>
            </Row>
          )}

          {isCall && (
            <Row icon={Video}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--brand-400)]">
                  {platformLabel ?? "Videollamada"}
                </span>
                {event.joinUrl && (
                  <a
                    href={event.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand-400)] hover:underline"
                  >
                    <ExternalLink className="size-3" /> Abrir enlace
                  </a>
                )}
              </div>
            </Row>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="outline" onClick={() => onUse(event, { record: false })} disabled={busy}>
            <CalendarPlus className="size-4" /> Crear reunión
          </Button>
          {isCall && (
            <Button onClick={() => onUse(event, { record: true })} disabled={busy}>
              {busy ? <Spinner /> : <Video className="size-4" />} Grabar reunión
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
