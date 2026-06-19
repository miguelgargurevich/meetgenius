"use client";

import * as React from "react";
import { captureMeetingAudio, type CaptureMode, type MeetingCapture } from "@/lib/audio-capture";
import { api } from "@/lib/api-client";

type RecorderState = "idle" | "recording" | "paused" | "stopped";

/** Duración de cada ventana de transcripción en vivo. */
const LIVE_WINDOW_MS = 12_000;

function pickMime() {
  return MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
}

/**
 * Grabación de audio vía MediaRecorder (funciona en navegador y Electron).
 * Acumula chunks y entrega un Blob al finalizar.
 *
 * Si `live` está activo, además graba el mismo stream en VENTANAS cortas
 * autocontenidas y las envía a `/api/meetings/[id]/live` para mostrar una
 * transcripción parcial en tiempo real (no afecta a la grabación principal).
 */
export function useRecorder(opts?: { meetingId?: string; live?: boolean }) {
  const [state, setState] = React.useState<RecorderState>("idle");
  const [seconds, setSeconds] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<CaptureMode | null>(null);
  const [liveTranscript, setLiveTranscript] = React.useState("");

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const captureRef = React.useRef<MeetingCapture | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Estado de la transcripción en vivo.
  const optsRef = React.useRef(opts);
  optsRef.current = opts;
  const liveActiveRef = React.useRef(false);
  const liveRecorderRef = React.useRef<MediaRecorder | null>(null);
  const liveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = React.useCallback((on: boolean) => {
    if (on && !timerRef.current) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (!on && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const postLiveWindow = React.useCallback(async (blob: Blob) => {
    const meetingId = optsRef.current?.meetingId;
    if (!meetingId || blob.size === 0) return;
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      form.append("file", blob, `live.${ext}`);
      const { text } = await api.postForm<{ text: string }>(
        `/api/meetings/${meetingId}/live`,
        form,
      );
      if (text) setLiveTranscript((prev) => (prev ? `${prev} ${text}` : text));
    } catch {
      /* en vivo es best-effort: ignoramos fallos de ventana */
    }
  }, []);

  const startLiveWindow = React.useCallback(
    (stream: MediaStream) => {
      if (!liveActiveRef.current) return;
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, { mimeType: pickMime() });
      } catch {
        return;
      }
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && parts.push(e.data);
      rec.onstop = () => {
        // Encadenamos la siguiente ventana de inmediato (sin huecos), y luego
        // transcribimos la ventana recién cerrada.
        if (liveActiveRef.current) startLiveWindow(stream);
        postLiveWindow(new Blob(parts, { type: rec.mimeType }));
      };
      liveRecorderRef.current = rec;
      rec.start();
      liveTimerRef.current = setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
      }, LIVE_WINDOW_MS);
    },
    [postLiveWindow],
  );

  const stopLive = React.useCallback(() => {
    liveActiveRef.current = false;
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    if (liveRecorderRef.current && liveRecorderRef.current.state !== "inactive") {
      try {
        liveRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
  }, []);

  const start = React.useCallback(async () => {
    try {
      setError(null);
      const capture = await captureMeetingAudio();
      captureRef.current = capture;
      setMode(capture.mode);
      const rec = new MediaRecorder(capture.stream, { mimeType: pickMime() });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.start(1000);
      recorderRef.current = rec;
      setSeconds(0);
      setState("recording");
      tick(true);

      if (optsRef.current?.live && optsRef.current?.meetingId) {
        setLiveTranscript("");
        liveActiveRef.current = true;
        startLiveWindow(capture.stream);
      }
    } catch {
      setError("No se pudo acceder al micrófono. Revisa los permisos.");
    }
  }, [tick, startLiveWindow]);

  const pause = React.useCallback(() => {
    recorderRef.current?.pause();
    tick(false);
    stopLive();
    setState("paused");
  }, [tick, stopLive]);

  const resume = React.useCallback(() => {
    recorderRef.current?.resume();
    tick(true);
    if (optsRef.current?.live && optsRef.current?.meetingId && captureRef.current) {
      liveActiveRef.current = true;
      startLiveWindow(captureRef.current.stream);
    }
    setState("recording");
  }, [tick, startLiveWindow]);

  const stop = React.useCallback((): Promise<{ blob: Blob; durationSec: number } | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      tick(false);
      stopLive();
      if (!rec) return resolve(null);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        captureRef.current?.cleanup();
        captureRef.current = null;
        setState("stopped");
        resolve({ blob, durationSec: seconds });
      };
      rec.stop();
    });
  }, [seconds, tick, stopLive]);

  React.useEffect(
    () => () => {
      tick(false);
      stopLive();
    },
    [tick, stopLive],
  );

  return { state, seconds, error, mode, liveTranscript, start, pause, resume, stop };
}
