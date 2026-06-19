"use client";

import * as React from "react";
import { Trash2, Plus, Link2, FileText, Upload, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSources, useAddSource, useRemoveSource } from "@/hooks/use-calendar-sources";

export function CalendarSourcesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: sources, isLoading } = useSources();
  const add = useAddSource();
  const remove = useRemoveSource();

  // Tab URL
  const [name, setName] = React.useState("");
  const [url, setUrl] = React.useState("");

  // Tab Archivo
  const [fileName, setFileName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  const onAddUrl = async (e: React.FormEvent) => {
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

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !fileName.trim()) setFileName(f.name.replace(/\.ics$/i, ""));
  };

  const onAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      const icsContent = await file.text();
      const res = await add.mutateAsync({
        name: fileName.trim() || file.name.replace(/\.ics$/i, "") || "Calendario importado",
        icsContent,
      });
      setFile(null);
      setFileName("");
      const created = res?.meetingsCreated ?? 0;
      toast.success(
        created > 0
          ? `Eventos añadidos · ${created} reunión${created === 1 ? "" : "es"} con videollamada creada${created === 1 ? "" : "s"}`
          : "Eventos del archivo añadidos al calendario",
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Conectar calendario">
      <div className="space-y-5">
        <Tabs defaultValue="url">
          <TabsList>
            <TabsTrigger value="url">Suscripción URL</TabsTrigger>
            <TabsTrigger value="file">Archivo .ics</TabsTrigger>
          </TabsList>

          {/* ── Tab: URL ─────────────────────────────────────── */}
          <TabsContent value="url">
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Suscríbete a un calendario por su URL <strong>.ics</strong> (Outlook/Microsoft 365 o Google). Se mantiene
              sincronizado y es de solo lectura.
            </p>
            <form onSubmit={onAddUrl} className="space-y-3">
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

            <details className="mt-4 rounded-md border border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
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
          </TabsContent>

          {/* ── Tab: Archivo .ics ────────────────────────────── */}
          <TabsContent value="file">
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Sube un archivo <strong>.ics</strong> exportado de cualquier calendario. Sus eventos se guardan y aparecen
              en el calendario (no se vuelve a sincronizar).
            </p>
            <form onSubmit={onAddFile} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="file-name">Nombre</Label>
                <Input
                  id="file-name"
                  placeholder="Eventos importados"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="file-input">Archivo .ics</Label>
                <label
                  htmlFor="file-input"
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-sm transition-colors hover:border-[var(--brand-400)]"
                >
                  <UploadCloud className="size-5 shrink-0 text-[var(--muted-foreground)]" />
                  {file ? (
                    <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">
                      Haz clic para elegir un archivo <strong>.ics</strong>
                    </span>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept=".ics,text/calendar"
                    onChange={onPickFile}
                    className="hidden"
                  />
                </label>
              </div>
              <Button type="submit" disabled={add.isPending || !file}>
                {add.isPending ? <Spinner /> : <Upload className="size-4" />} Importar eventos
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* ── Lista compartida de fuentes conectadas ─────────── */}
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
                    {s.kind === "file" ? (
                      <FileText className="size-4 shrink-0 text-[var(--muted-foreground)]" />
                    ) : (
                      <Link2 className="size-4 shrink-0 text-[var(--muted-foreground)]" />
                    )}
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      {s.kind === "file" ? "archivo" : "URL"}
                    </span>
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
      </div>
    </Dialog>
  );
}
