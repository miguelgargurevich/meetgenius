/**
 * Captura de audio de reunión.
 *
 * - En el navegador: solo micrófono (limitación de la plataforma).
 * - En Electron (escritorio): micrófono + audio del sistema (loopback vía
 *   ScreenCaptureKit en macOS), mezclados con Web Audio API en una sola pista.
 *   Así se graban tanto tu voz como la de los demás participantes de Meet/Teams.
 */

export type CaptureMode = "mic-only" | "mic+system";

export interface MeetingCapture {
  /** Pista de audio mezclada lista para MediaRecorder. */
  stream: MediaStream;
  mode: CaptureMode;
  /** Libera micrófono, captura de sistema y AudioContext. */
  cleanup: () => void;
}

interface MeetGeniusBridge {
  isDesktop?: boolean;
  getScreenAccess?: () => Promise<string>;
}

function bridge(): MeetGeniusBridge | undefined {
  return (globalThis as unknown as { meetgenius?: MeetGeniusBridge }).meetgenius;
}

export function isDesktop(): boolean {
  return Boolean(bridge()?.isDesktop);
}

export async function screenAccessStatus(): Promise<string> {
  try {
    return (await bridge()?.getScreenAccess?.()) ?? "granted";
  } catch {
    return "unknown";
  }
}

export async function captureMeetingAudio(): Promise<MeetingCapture> {
  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  // En navegador no intentamos loopback (abriría un selector de pantalla).
  if (!isDesktop()) {
    return { stream: micStream, mode: "mic-only", cleanup: () => stopAll([micStream]) };
  }

  // Escritorio: intentamos capturar también el audio del sistema.
  let systemStream: MediaStream | null = null;
  try {
    systemStream = await navigator.mediaDevices.getDisplayMedia({
      video: true, // requerido por la API; no se graba
      audio: true, // el handler de Electron entrega loopback del sistema
    });
  } catch {
    systemStream = null; // sin permiso de pantalla → degradamos a solo micrófono
  }

  if (!systemStream || systemStream.getAudioTracks().length === 0) {
    if (systemStream) stopAll([systemStream]);
    return { stream: micStream, mode: "mic-only", cleanup: () => stopAll([micStream]) };
  }

  // No necesitamos el vídeo: detenemos sus pistas (mantenemos solo audio).
  systemStream.getVideoTracks().forEach((t) => t.stop());

  // Mezcla micrófono + sistema en una única pista con Web Audio API.
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const dest = ctx.createMediaStreamDestination();
  for (const s of [micStream, systemStream]) {
    if (s.getAudioTracks().length) ctx.createMediaStreamSource(s).connect(dest);
  }

  return {
    stream: dest.stream,
    mode: "mic+system",
    cleanup: () => {
      stopAll([micStream, systemStream!]);
      ctx.close().catch(() => {});
    },
  };
}

function stopAll(streams: MediaStream[]) {
  for (const s of streams) s.getTracks().forEach((t) => t.stop());
}
