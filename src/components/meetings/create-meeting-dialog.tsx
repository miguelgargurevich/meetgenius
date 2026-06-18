"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useCreateMeeting, useUpdateMeeting } from "@/hooks/use-meetings";
import { desktop, isDesktopApp } from "@/lib/desktop";

interface FormValues {
  title: string;
  description?: string;
  scheduledAt?: string; // datetime-local
  durationMinutes?: number;
  meetingUrl?: string;
  participantsRaw?: string;
}

/** Forma mínima de una reunión para editar. */
export interface EditableMeeting {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
  scheduledMinutes?: number | null;
  meetingUrl?: string | null;
  externalEventId?: string | null;
  participants?: string[];
}

function toLocalInput(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export function CreateMeetingDialog({
  open,
  onClose,
  startRecording,
  defaultDate,
  meeting,
}: {
  open: boolean;
  onClose: () => void;
  startRecording?: boolean;
  /** Prefilla la fecha/hora (formato datetime-local). */
  defaultDate?: string;
  /** Si se pasa, el diálogo opera en modo EDICIÓN. */
  meeting?: EditableMeeting;
}) {
  const router = useRouter();
  const create = useCreateMeeting();
  const update = useUpdateMeeting();
  const isEdit = Boolean(meeting);
  const desktopApp = isDesktopApp();
  const [addToCalendar, setAddToCalendar] = React.useState(true);
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { durationMinutes: 30 },
  });

  React.useEffect(() => {
    if (!open) return;
    if (meeting) {
      reset({
        title: meeting.title,
        description: meeting.description ?? "",
        scheduledAt: meeting.scheduledAt ? toLocalInput(meeting.scheduledAt) : "",
        durationMinutes: meeting.scheduledMinutes ?? 30,
        meetingUrl: meeting.meetingUrl ?? "",
        participantsRaw: (meeting.participants ?? []).join(", "),
      });
      setAddToCalendar(Boolean(meeting.externalEventId) || true);
    } else {
      reset({ durationMinutes: 30, scheduledAt: defaultDate });
      setAddToCalendar(true);
    }
  }, [open, meeting, defaultDate, reset]);

  const pending = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    if (!values.title || values.title.trim().length < 2) {
      toast.error("El título es obligatorio");
      return;
    }
    const participants = String(values.participantsRaw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const durationMinutes = Number(values.durationMinutes) || 30;

    try {
      // ── Gestión del evento en el calendario de macOS ──
      let externalEventId: string | undefined = meeting?.externalEventId ?? undefined;
      if (desktopApp) {
        const start = values.scheduledAt ? new Date(values.scheduledAt) : null;
        const end = start ? new Date(start.getTime() + durationMinutes * 60_000) : null;

        if (addToCalendar && start && end) {
          const payload = {
            title: values.title,
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            notes: values.description,
            url: values.meetingUrl,
          };
          const res = externalEventId
            ? await desktop()?.updateCalendarEvent?.({ ...payload, eventId: externalEventId })
            : await desktop()?.createCalendarEvent?.(payload);
          if (res?.id) externalEventId = res.id;
          else if (res?.error === "not-found") {
            // El evento fue borrado en macOS: lo recreamos.
            const created = await desktop()?.createCalendarEvent?.(payload);
            if (created?.id) externalEventId = created.id;
          } else if (res?.error && res.error !== "unsupported") {
            toast.warning("No se pudo sincronizar con el calendario de macOS (revisa el permiso).");
          }
        } else if (!addToCalendar && externalEventId) {
          // Se desmarcó: eliminamos el evento sincronizado.
          await desktop()?.deleteCalendarEvent?.(externalEventId).catch(() => {});
          externalEventId = undefined;
        }
      }

      if (isEdit && meeting) {
        await update.mutateAsync({
          id: meeting.id,
          title: values.title,
          description: values.description ?? "",
          scheduledAt: values.scheduledAt || null,
          durationMinutes,
          meetingUrl: values.meetingUrl || "",
          externalEventId: externalEventId ?? null,
          participants,
        });
        toast.success("Reunión actualizada");
        onClose();
        return;
      }

      const created = await create.mutateAsync({
        title: values.title,
        description: values.description,
        scheduledAt: values.scheduledAt || null,
        durationMinutes,
        meetingUrl: values.meetingUrl || "",
        externalEventId,
        participants,
      });
      toast.success("Reunión creada");
      reset();
      onClose();
      router.push(`/meetings/${created.id}${startRecording ? "?record=1" : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar reunión" : "Nueva reunión"}
      description={
        isEdit
          ? "Cambia los datos; se sincronizan con tu calendario de macOS."
          : "Programa o graba una reunión y analízala con IA."
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" placeholder="Sync semanal de producto" {...register("title")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt">Fecha y hora</Label>
            <Input id="scheduledAt" type="datetime-local" {...register("scheduledAt")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="durationMinutes">Duración (min)</Label>
            <Input id="durationMinutes" type="number" min={5} step={5} {...register("durationMinutes")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="meetingUrl">URL de la reunión (opcional)</Label>
          <Input id="meetingUrl" placeholder="https://meet.google.com/… o Teams/Zoom" {...register("meetingUrl")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="participants">Participantes (separados por coma)</Label>
          <Input id="participants" placeholder="Ana, Luis, María" {...register("participantsRaw")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea id="description" placeholder="Objetivo de la reunión…" {...register("description")} />
        </div>

        {desktopApp && (
          <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              checked={addToCalendar}
              onChange={(e) => setAddToCalendar(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Sincronizar con mi calendario de macOS
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Guardar cambios" : startRecording ? "Crear y grabar" : "Crear reunión"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
