"use client";

import * as React from "react";

type RecorderState = "idle" | "recording" | "paused" | "stopped";

/**
 * Grabación de audio vía MediaRecorder (funciona en navegador y Electron).
 * Acumula chunks y entrega un Blob al finalizar.
 */
export function useRecorder() {
  const [state, setState] = React.useState<RecorderState>("idle");
  const [seconds, setSeconds] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = React.useCallback((on: boolean) => {
    if (on && !timerRef.current) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (!on && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = React.useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.start(1000);
      recorderRef.current = rec;
      setSeconds(0);
      setState("recording");
      tick(true);
    } catch {
      setError("No se pudo acceder al micrófono. Revisa los permisos.");
    }
  }, [tick]);

  const pause = React.useCallback(() => {
    recorderRef.current?.pause();
    tick(false);
    setState("paused");
  }, [tick]);

  const resume = React.useCallback(() => {
    recorderRef.current?.resume();
    tick(true);
    setState("recording");
  }, [tick]);

  const stop = React.useCallback((): Promise<{ blob: Blob; durationSec: number } | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      tick(false);
      if (!rec) return resolve(null);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setState("stopped");
        resolve({ blob, durationSec: seconds });
      };
      rec.stop();
    });
  }, [seconds, tick]);

  React.useEffect(() => () => tick(false), [tick]);

  return { state, seconds, error, start, pause, resume, stop };
}
