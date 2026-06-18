"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/lib/api-client";
import { desktop, isDesktopApp, type MeetingStatus } from "@/lib/desktop";
import { findCurrentEvent } from "@/hooks/use-agenda";

const AUTO_RECORD_KEY = "mg:autoRecord";
const TOAST_ID = "meeting-detected";

export function autoRecordEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_RECORD_KEY) === "1";
}

/**
 * Vigila la detección de llamadas (Meet/Teams/Zoom) en la app de escritorio.
 * Cuando arranca una llamada, ofrece grabar (o auto-graba si está activado).
 * No renderiza nada: actúa mediante toasts y navegación.
 */
export function MeetingWatcher() {
  const router = useRouter();
  const handledRef = React.useRef(false);
  const creatingRef = React.useRef(false);

  const createAndRecord = React.useCallback(
    async (title: string, participants: string[]) => {
      if (creatingRef.current) return;
      creatingRef.current = true;
      try {
        const meeting = await api.post<{ id: string }>("/api/meetings", { title, participants });
        toast.dismiss(TOAST_ID);
        router.push(`/meetings/${meeting.id}?record=1`);
      } catch (e) {
        toast.error(`No se pudo iniciar la grabación: ${(e as Error).message}`);
      } finally {
        creatingRef.current = false;
      }
    },
    [router],
  );

  const startForDetected = React.useCallback(
    async (status: MeetingStatus) => {
      // Intentamos enriquecer con el evento del calendario en curso.
      let title = `Reunión en ${status.detail ?? "videollamada"} — ${format(new Date(), "d MMM HH:mm", { locale: es })}`;
      let participants: string[] = [];
      try {
        const agenda = await desktop()?.getTodayAgenda?.();
        const current = findCurrentEvent(agenda?.events ?? []);
        if (current) {
          title = current.title;
          participants = current.attendees.slice(0, 25);
        }
      } catch {
        /* sin calendario: usamos el título genérico */
      }
      await createAndRecord(title, participants);
    },
    [createAndRecord],
  );

  React.useEffect(() => {
    if (!isDesktopApp()) return;
    const bridge = desktop();
    if (!bridge?.onMeetingStatus) return;

    const unsubscribe = bridge.onMeetingStatus((status) => {
      if (status.active && !handledRef.current) {
        handledRef.current = true;

        if (autoRecordEnabled()) {
          toast.success(`Reunión detectada en ${status.detail}. Grabando automáticamente…`, {
            id: TOAST_ID,
            icon: <Sparkles className="size-4" />,
          });
          startForDetected(status);
          return;
        }

        toast(`Reunión detectada en ${status.detail}`, {
          id: TOAST_ID,
          duration: Infinity,
          icon: <Mic className="size-4 text-[var(--brand-400)]" />,
          description: "¿Quieres que MeetGenius la grabe y analice?",
          action: {
            label: "Grabar",
            onClick: () => startForDetected(status),
          },
          cancel: { label: "Ahora no", onClick: () => {} },
        });
      } else if (!status.active) {
        // La llamada terminó: reseteamos para la próxima.
        handledRef.current = false;
        toast.dismiss(TOAST_ID);
      }
    });

    return unsubscribe;
  }, [startForDetected]);

  // Clic en una notificación de recordatorio → grabar ese evento.
  React.useEffect(() => {
    if (!isDesktopApp()) return;
    const bridge = desktop();
    if (!bridge?.onReminderRecord) return;
    return bridge.onReminderRecord((payload) => {
      createAndRecord(payload.title, payload.attendees.slice(0, 25));
    });
  }, [createAndRecord]);

  return null;
}
