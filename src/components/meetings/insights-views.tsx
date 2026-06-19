"use client";

import * as React from "react";
import { Play, Quote, Mail, Copy, Check, ListTree } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { formatClock } from "@/lib/utils";

export interface Chapter {
  title: string;
  summary?: string;
  startSec?: number | null;
}
export interface Highlight {
  quote: string;
  speaker?: string;
  atSec?: number | null;
}

/** Pequeña pastilla de tiempo clicable que salta el audio (si hay segundo). */
function TimeChip({ sec, onSeek }: { sec?: number | null; onSeek?: (s: number) => void }) {
  if (sec == null || Number.isNaN(sec)) return null;
  return (
    <button
      onClick={() => onSeek?.(sec)}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--muted-foreground)] transition-colors hover:border-[var(--brand-400)] hover:text-[var(--foreground)]"
      title="Reproducir desde aquí"
    >
      <Play className="size-3" /> {formatClock(sec)}
    </button>
  );
}

export function ChaptersView({
  chapters,
  onSeek,
}: {
  chapters?: Chapter[] | null;
  onSeek?: (sec: number) => void;
}) {
  if (!chapters?.length)
    return <EmptyState icon={ListTree} title="Sin capítulos" description="El análisis no generó una división por temas." />;
  return (
    <ol className="space-y-2">
      {chapters.map((c, i) => (
        <li key={i}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--muted-foreground)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{c.title}</p>
                    <TimeChip sec={c.startSec} onSeek={onSeek} />
                  </div>
                  {c.summary && (
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{c.summary}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}

export function HighlightsView({
  highlights,
  onSeek,
}: {
  highlights?: Highlight[] | null;
  onSeek?: (sec: number) => void;
}) {
  if (!highlights?.length)
    return <EmptyState icon={Quote} title="Sin momentos clave" description="El análisis no destacó frases relevantes." />;
  return (
    <div className="space-y-2">
      {highlights.map((h, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Quote className="size-5 shrink-0 text-[var(--brand-400)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm italic leading-relaxed">“{h.quote}”</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  {h.speaker && <span className="font-medium">{h.speaker}</span>}
                  <TimeChip sec={h.atSec} onSeek={onSeek} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FollowUpEmailView({
  subject,
  body,
}: {
  subject?: string | null;
  body?: string | null;
}) {
  const [copied, setCopied] = React.useState(false);

  if (!subject && !body)
    return <EmptyState icon={Mail} title="Sin email de seguimiento" description="El análisis no generó un borrador de email." />;

  const full = `Asunto: ${subject ?? ""}\n\n${body ?? ""}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      toast.success("Email copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };
  const mailto = `mailto:?subject=${encodeURIComponent(subject ?? "")}&body=${encodeURIComponent(body ?? "")}`;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--brand-400)]">
            <Mail className="size-4" /> Borrador de email de seguimiento
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar
            </Button>
            <a href={mailto}>
              <Button variant="secondary" size="sm">
                <Mail className="size-4" /> Abrir en email
              </Button>
            </a>
          </div>
        </div>
        {subject && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Asunto</p>
            <p className="text-sm font-medium">{subject}</p>
          </div>
        )}
        {body && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Mensaje</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
