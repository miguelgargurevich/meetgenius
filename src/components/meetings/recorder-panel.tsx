"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Pause, Play, Square, Volume2, AlertCircle, Radio } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { useRecorder } from "@/hooks/use-recorder";
import { api } from "@/lib/api-client";
import { formatClock } from "@/lib/utils";
import { isDesktop, screenAccessStatus } from "@/lib/audio-capture";

/**
 * Panel de grabación. Orquesta el hook MediaRecorder con el ciclo de vida
 * en el backend (start/pause/resume/finish + subida del audio).
 */
export function RecorderPanel({ meetingId, autoStart }: { meetingId: string; autoStart?: boolean }) {
  const qc = useQueryClient();
  const [liveEnabled, setLiveEnabled] = React.useState(true);
  const { state, seconds, error, mode, liveTranscript, start, pause, resume, stop } = useRecorder({
    meetingId,
    live: liveEnabled,
  });
  const [uploading, setUploading] = React.useState(false);
  const [screenAccess, setScreenAccess] = React.useState<string | null>(null);
  const started = React.useRef(false);
  const desktop = isDesktop();
  const active = state === "recording" || state === "paused";
  const liveBoxRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll del panel en vivo al texto más reciente.
  React.useEffect(() => {
    if (liveBoxRef.current) liveBoxRef.current.scrollTop = liveBoxRef.current.scrollHeight;
  }, [liveTranscript]);

  React.useEffect(() => {
    if (desktop) screenAccessStatus().then(setScreenAccess);
  }, [desktop]);

  const begin = React.useCallback(async () => {
    await start();
    await api.post(`/api/meetings/${meetingId}/recording?action=start`).catch(() => {});
  }, [start, meetingId]);

  React.useEffect(() => {
    if (autoStart && !started.current && state === "idle") {
      started.current = true;
      begin();
    }
  }, [autoStart, state, begin]);

  const onPause = async () => {
    pause();
    await api.post(`/api/meetings/${meetingId}/recording?action=pause`).catch(() => {});
  };
  const onResume = async () => {
    resume();
    await api.post(`/api/meetings/${meetingId}/recording?action=resume`).catch(() => {});
  };

  const onFinish = async () => {
    const result = await stop();
    setUploading(true);
    try {
      const form = new FormData();
      if (result?.blob) {
        const ext = result.blob.type.includes("mp4") ? "mp4" : "webm";
        form.append("file", result.blob, `${meetingId}.${ext}`);
      }
      form.append("durationSec", String(result?.durationSec ?? seconds));
      await api.postForm(`/api/meetings/${meetingId}/recording?action=finish`, form);
      toast.success("Grabación finalizada. Transcribiendo y analizando con IA…");
      qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-[var(--brand-400)]/40 bg-[color-mix(in_oklab,var(--primary)_6%,var(--card))]">
      <CardContent className="flex flex-col gap-4 p-6">
        {desktop && screenAccess && screenAccess !== "granted" && state === "idle" && (
          <div className="flex items-start gap-2 rounded-md border border-[var(--warning)]/40 bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-3 text-xs">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
            <p className="text-[var(--muted-foreground)]">
              Para capturar el audio de los demás participantes (Meet/Teams), concede el permiso de
              <span className="font-medium text-[var(--foreground)]"> Grabación de pantalla</span> a
              MeetGenius en <span className="font-medium text-[var(--foreground)]">Ajustes del Sistema → Privacidad y seguridad → Grabación de pantalla</span>. Sin él se grabará solo tu micrófono.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex size-12 items-center justify-center rounded-full ${
              state === "recording" ? "bg-[var(--danger)] animate-recording" : "bg-[var(--muted)]"
            }`}
          >
            <Mic className={`size-5 ${state === "recording" ? "text-white" : "text-[var(--muted-foreground)]"}`} />
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums">{formatClock(seconds)}</p>
            <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              {state === "recording"
                ? "Grabando…"
                : state === "paused"
                  ? "En pausa"
                  : state === "stopped"
                    ? "Finalizada"
                    : "Listo para grabar"}
              {mode && (
                <span className="flex items-center gap-1 text-[var(--brand-400)]">
                  · <Volume2 className="size-3" />
                  {mode === "mic+system" ? "Micrófono + audio del sistema" : "Solo micrófono"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
          {state === "idle" && !uploading && (
            <button
              type="button"
              onClick={() => setLiveEnabled((v) => !v)}
              title="Mostrar la transcripción mientras grabas"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                liveEnabled
                  ? "border-[var(--brand-400)] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--brand-400)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Radio className="size-3.5" /> En vivo · {liveEnabled ? "activado" : "desactivado"}
            </button>
          )}
          {(state === "idle" || state === "stopped") && !uploading && (
            <Button onClick={begin} disabled={state === "stopped"}>
              <Mic className="size-4" /> Iniciar
            </Button>
          )}
          {state === "recording" && (
            <Button variant="secondary" onClick={onPause}>
              <Pause className="size-4" /> Pausar
            </Button>
          )}
          {state === "paused" && (
            <Button variant="secondary" onClick={onResume}>
              <Play className="size-4" /> Reanudar
            </Button>
          )}
          {(state === "recording" || state === "paused") && (
            <Button variant="danger" onClick={onFinish} disabled={uploading}>
              {uploading ? <Spinner /> : <Square className="size-4" />} Finalizar
            </Button>
          )}
        </div>
        </div>

        {active && liveEnabled && (
          <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--brand-400)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--brand-400)] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--brand-400)]" />
              </span>
              Transcripción en vivo
            </div>
            <div
              ref={liveBoxRef}
              className="max-h-40 overflow-y-auto text-sm leading-relaxed text-[var(--muted-foreground)]"
            >
              {liveTranscript || (
                <span className="italic">
                  {state === "paused" ? "En pausa…" : "Escuchando… el texto aparecerá en unos segundos."}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
