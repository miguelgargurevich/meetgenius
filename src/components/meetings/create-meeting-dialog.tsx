"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { createMeetingSchema, type CreateMeetingInput } from "@/server/validators";

export function CreateMeetingDialog({
  open,
  onClose,
  startRecording,
}: {
  open: boolean;
  onClose: () => void;
  startRecording?: boolean;
}) {
  const router = useRouter();
  const create = useCreateMeeting();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMeetingInput>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: { participants: [] },
  });

  const onSubmit = handleSubmit(async (values) => {
    const participants = String((values as { participantsRaw?: string }).participantsRaw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const meeting = await create.mutateAsync({ ...values, participants });
      toast.success("Reunión creada");
      reset();
      onClose();
      router.push(`/meetings/${meeting.id}${startRecording ? "?record=1" : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  });

  return (
    <Dialog open={open} onClose={onClose} title="Nueva reunión" description="Crea una reunión para empezar a grabar y analizar.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input id="title" placeholder="Sync semanal de producto" {...register("title")} />
          {errors.title && <p className="text-xs text-[var(--danger)]">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Textarea id="description" placeholder="Objetivo de la reunión…" {...register("description")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="participants">Participantes (separados por coma)</Label>
          <Input
            id="participants"
            placeholder="Ana, Luis, María"
            {...register("participantsRaw" as keyof CreateMeetingInput)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner />}
            Crear y continuar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
