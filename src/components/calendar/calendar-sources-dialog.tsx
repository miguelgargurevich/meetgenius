"use client";

import * as React from "react";
import { Trash2, Plus, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useSources, useAddSource, useRemoveSource } from "@/hooks/use-calendar-sources";

export function CalendarSourcesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: sources, isLoading } = useSources();
  const add = useAddSource();
  const remove = useRemoveSource();
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await add.mutateAsync({ name: name.trim() || "Mi calendario", url: url.trim() });
      setName("");
      setUrl("");
      toast.success("Calendario conectado");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Conectar calendario"
      description="Suscríbete a un calendario por su URL .ics (Outlook/Microsoft 365 o Google). Es de solo lectura."
    >
      <div className="space-y-5">
        <form onSubmit={onAdd} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="src-name">Nombre</Label>
            <Input id="src-name" placeholder="Trabajo (Outlook)" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-url">URL .ics</Label>
            <Input
              id="src-url"
              placeholder="https://outlook.office365.com/owa/calendar/.../calendar.ics"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={add.isPending || !url.trim()}>
            {add.isPending ? <Spinner /> : <Plus className="size-4" />} Añadir
          </Button>
        </form>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">Calendarios conectados</p>
          {isLoading ? (
            <Spinner />
          ) : sources && sources.length > 0 ? (
            <ul className="space-y-1.5">
              {sources.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Link2 className="size-4 shrink-0 text-[var(--muted-foreground)]" />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <button
                    onClick={() => remove.mutate(s.id)}
                    className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                    title="Quitar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">Aún no hay calendarios conectados.</p>
          )}
        </div>

        <details className="rounded-md border border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
          <summary className="cursor-pointer font-medium text-[var(--foreground)]">
            ¿Cómo obtengo mi URL .ics?
          </summary>
          <div className="mt-2 space-y-2">
            <p>
              <span className="font-medium text-[var(--foreground)]">Outlook / Microsoft 365:</span> Outlook Web →
              Configuración → Calendario → Calendarios compartidos → <em>Publicar calendario</em> → copia el enlace
              <strong> ICS</strong>.
            </p>
            <p>
              <span className="font-medium text-[var(--foreground)]">Google Calendar:</span> Configuración del
              calendario → Integrar calendario → <em>Dirección secreta en formato iCal</em>.
            </p>
          </div>
        </details>
      </div>
    </Dialog>
  );
}
