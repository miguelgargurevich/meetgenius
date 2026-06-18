"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { desktop, isDesktopApp } from "@/lib/desktop";

interface FormValues {
  title: string;
  description?: string;
  scheduledAt?: string; // datetime-local
  durationMinutes?: number;
  meetingUrl?: string;
  participantsRaw?: string;
}

export function CreateMeetingDialog({
  open,
  onClose,
  startRecording,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  startRecording?: boolean;
  /** Prefilla la fecha/hora (formato datetime-local: YYYY-MM-DDTHH:mm). */
  defaultDate?: string;
}) {
  const router = useRouter();
  const create = useCreateMeeting();
  const desktopApp = isDesktopApp();
  const [addToCalendar, setAddToCalendar] = React.useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { durationMinutes: 30 } });

  React.useEffect(() => {
    if (open) reset({ durationMinutes: 30, scheduledAt: defaultDate });
  }, [open, defaultDate, reset]);

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
      // Sync bidireccional: crear el evento en el calendario de macOS primero
      // para obtener su id y deduplicarlo en la vista de calendario.
      let externalEventId: string | undefined;
      if (desktopApp && addToCalendar && values.scheduledAt) {
        const start = new Date(values.scheduledAt);
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        const res = await desktop()?.createCalendarEvent?.({
          title: values.title,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          notes: values.description,
          url: values.meetingUrl,
        });
        if (res?.id) externalEventId = res.id;
        else if (res?.error && res.error !== "unsupported")
          toast.warning("No se pudo añadir al calendario de macOS (revisa el permiso de Calendarios).");
      }

      const meeting = await create.mutateAsync({
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
      router.push(`/meetings/${meeting.id}${startRecording ? "?record=1" : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  });

  return (
    <Dialog open={open} onClose={onClose} title="Nueva reunión" description="Programa o graba una reunión y analízala con IA.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" placeholder="Sync semanal de producto" {...register("title")} />
          {errors.title && <p className="text-xs text-[var(--danger)]">{errors.title.message}</p>}
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
            Añadir también a mi calendario de macOS
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            {startRecording ? "Crear y grabar" : "Crear reunión"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
