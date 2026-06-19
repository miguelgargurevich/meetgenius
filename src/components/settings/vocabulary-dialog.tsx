"use client";

import * as React from "react";
import { Plus, X, SpellCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useVocabulary, useSetVocabulary } from "@/hooks/use-vocabulary";

/**
 * Vocabulario personalizado: nombres propios y jerga que mejoran la precisión
 * de la transcripción (Whisper) y del análisis. Config global de la org.
 */
export function VocabularyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading } = useVocabulary();
  const save = useSetVocabulary();
  const [terms, setTerms] = React.useState<string[]>([]);
  const [input, setInput] = React.useState("");

  // Sincroniza la lista local cuando se abre / llegan datos.
  React.useEffect(() => {
    if (open && data) setTerms(data);
  }, [open, data]);

  const add = () => {
    const parts = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setTerms((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return next;
    });
    setInput("");
  };

  const remove = (term: string) => setTerms((prev) => prev.filter((t) => t !== term));

  const onSave = async () => {
    try {
      await save.mutateAsync(terms);
      toast.success("Vocabulario guardado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vocabulario personalizado"
      description="Nombres propios, marcas y jerga que aparecen en tus reuniones. Mejoran la transcripción y el análisis (respetando su ortografía)."
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="GlobalGo, MeetGenius, EBITDA…"
          />
          <Button type="button" variant="outline" onClick={add} disabled={!input.trim()}>
            <Plus className="size-4" /> Añadir
          </Button>
        </div>

        {isLoading ? (
          <Spinner />
        ) : terms.length ? (
          <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
            {terms.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs"
              >
                {t}
                <button
                  onClick={() => remove(t)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                  aria-label={`Quitar ${t}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <SpellCheck className="size-4" /> Aún no hay términos. Añade nombres y jerga frecuentes.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={save.isPending}>
            {save.isPending && <Spinner />} Guardar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
