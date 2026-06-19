"use client";

import * as React from "react";
import { Search, Volume2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Inbox } from "lucide-react";
import { formatClock } from "@/lib/utils";
import { type Segment, speakersOf, speakerColor } from "@/lib/transcript";

/**
 * Transcripción interactiva: reproductor de audio sincronizado con los
 * segmentos (Whisper). Click en un segmento → salta el audio a ese punto;
 * el segmento en reproducción se resalta; búsqueda dentro del transcript.
 */
export function TranscriptView({
  meetingId,
  segments,
  text,
  hasRecording,
  seek,
}: {
  meetingId: string;
  segments?: Segment[] | null;
  text?: string | null;
  hasRecording?: boolean;
  /** Señal externa de salto (p. ej. desde Capítulos): nonce fuerza re-aplicar. */
  seek?: { sec: number; nonce: number } | null;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const pendingSeek = React.useRef<number | null>(null);
  const [current, setCurrent] = React.useState(0);
  const [query, setQuery] = React.useState("");

  // Aplica un salto pendiente cuando el audio está listo (o ya lo estaba).
  const applyPendingSeek = React.useCallback(() => {
    const a = audioRef.current;
    if (a && pendingSeek.current != null && !Number.isNaN(a.duration)) {
      a.currentTime = pendingSeek.current;
      a.play().catch(() => {});
      pendingSeek.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!seek) return;
    pendingSeek.current = seek.sec;
    applyPendingSeek();
  }, [seek, applyPendingSeek]);

  const segs = React.useMemo(
    () => (Array.isArray(segments) ? segments.filter((s) => s && typeof s.start === "number") : []),
    [segments],
  );
  const speakers = React.useMemo(() => speakersOf(segs), [segs]);

  const activeIndex = React.useMemo(() => {
    if (!segs.length) return -1;
    let idx = -1;
    for (let i = 0; i < segs.length; i++) {
      if (current >= segs[i].start) idx = i;
      else break;
    }
    return idx;
  }, [segs, current]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return segs.map((s, i) => ({ s, i }));
    return segs.map((s, i) => ({ s, i })).filter(({ s }) => s.text.toLowerCase().includes(q));
  }, [segs, query]);

  const seekTo = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    a.play().catch(() => {});
  };

  // Auto-scroll suave al segmento activo (solo si no estás buscando).
  React.useEffect(() => {
    if (query || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-seg="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, query]);

  // Sin segmentos: caemos a texto plano (más reproductor si hay grabación).
  if (!segs.length) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          {hasRecording && (
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={`/api/meetings/${meetingId}/audio`}
              onLoadedMetadata={applyPendingSeek}
              className="w-full"
            />
          )}
          {text ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted-foreground)]">
              {text}
            </p>
          ) : (
            <EmptyState icon={Inbox} title="Sin transcripción" description="Aún no hay transcripción disponible." />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Reproductor + búsqueda */}
        <div className="sticky top-0 z-10 -mx-4 -mt-4 space-y-3 border-b border-[var(--border)] bg-[var(--card)] px-4 pb-3 pt-4 sm:-mx-6 sm:px-6">
          {hasRecording && (
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={`/api/meetings/${meetingId}/audio`}
              onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
              onLoadedMetadata={applyPendingSeek}
              className="w-full"
            />
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en la transcripción…"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-9 text-sm outline-none focus:border-[var(--brand-400)]"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  aria-label="Limpiar"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {query && (
              <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {speakers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {speakers.map((sp) => (
                <span key={sp} className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: speakerColor(sp, speakers) }}
                  />
                  {sp}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Segmentos */}
        <div ref={listRef} className="space-y-1">
          {filtered.map(({ s, i }) => {
            const sp = (s.speaker ?? "").trim();
            const color = sp ? speakerColor(sp, speakers) : "var(--muted-foreground)";
            const active = i === activeIndex && !query;
            return (
              <button
                key={i}
                data-seg={i}
                onClick={() => seekTo(s.start)}
                className={`flex w-full gap-3 rounded-md p-2 text-left transition-colors hover:bg-[var(--muted)] ${
                  active ? "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]" : ""
                }`}
              >
                <span className="mt-0.5 shrink-0 font-mono text-xs tabular-nums text-[var(--muted-foreground)]">
                  {formatClock(s.start)}
                </span>
                <span className="min-w-0 flex-1">
                  {sp && (
                    <span className="mr-2 text-xs font-semibold" style={{ color }}>
                      {sp}
                    </span>
                  )}
                  <span
                    className={`text-sm leading-relaxed ${active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
                  >
                    {query ? highlight(s.text, query) : s.text}
                  </span>
                </span>
                {active && <Volume2 className="mt-0.5 size-3.5 shrink-0 text-[var(--primary)]" />}
              </button>
            );
          })}
          {!filtered.length && (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Sin coincidencias para «{query}».
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Resalta las coincidencias del término de búsqueda dentro del texto. */
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-[var(--warning)]/30 text-[var(--foreground)]">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
