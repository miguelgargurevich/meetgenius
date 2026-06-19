import { meetingService } from "./meeting.service";
import {
  applySpeakerNames,
  type Segment,
  type SpeakerNames,
} from "@/lib/transcript";

export type TranscriptFormat = "srt" | "vtt" | "txt";

/** Normaliza y ordena los segmentos; rellena `end` ausente con start+2s. */
function normalize(segments: Segment[]): Segment[] {
  return [...segments]
    .filter((s) => s && typeof s.start === "number" && (s.text ?? "").trim())
    .sort((a, b) => a.start - b.start)
    .map((s) => ({
      ...s,
      end: typeof s.end === "number" && s.end > s.start ? s.end : s.start + 2,
      text: s.text.trim(),
    }));
}

/** Timestamp para subtítulos: HH:MM:SS + separador + milisegundos. */
function stamp(sec: number, msSep: "," | "."): string {
  const total = Math.max(0, sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)}${msSep}${p(ms, 3)}`;
}

/** Limpia el texto de un cue (sin saltos internos ni líneas que rompan VTT). */
function cueText(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").replace(/-->/g, "→").trim();
}

export function toSrt(segments: Segment[]): string {
  const segs = normalize(segments);
  return (
    segs
      .map((s, i) => {
        const who = s.speaker ? `${s.speaker}: ` : "";
        return `${i + 1}\n${stamp(s.start, ",")} --> ${stamp(s.end, ",")}\n${who}${cueText(s.text)}`;
      })
      .join("\n\n") + "\n"
  );
}

export function toVtt(segments: Segment[]): string {
  const segs = normalize(segments);
  const body = segs
    .map((s) => {
      const who = s.speaker ? `<v ${s.speaker.replace(/[<>]/g, "")}>` : "";
      return `${stamp(s.start, ".")} --> ${stamp(s.end, ".")}\n${who}${cueText(s.text)}`;
    })
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

/** TXT legible: [MM:SS] Hablante: texto (o texto plano si no hay segmentos). */
export function toTxt(segments: Segment[], fallbackText?: string | null): string {
  const segs = normalize(segments);
  if (!segs.length) return (fallbackText ?? "").trim() + "\n";
  const mmss = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  return (
    segs
      .map((s) => `[${mmss(s.start)}] ${s.speaker ? `${s.speaker}: ` : ""}${cueText(s.text)}`)
      .join("\n") + "\n"
  );
}

const MIME: Record<TranscriptFormat, string> = {
  srt: "application/x-subrip; charset=utf-8",
  vtt: "text/vtt; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

/** Construye el archivo de transcripción descargable para una reunión. */
export async function buildTranscriptExport(
  meetingId: string,
  format: TranscriptFormat,
): Promise<{ body: string; contentType: string; filename: string }> {
  const m = await meetingService.getById(meetingId);
  const raw = (m.transcription?.segments as Segment[] | null) ?? [];
  const names = (m.transcription?.speakerNames as SpeakerNames | null) ?? null;
  const segments = applySpeakerNames(raw, names);

  const body =
    format === "srt"
      ? toSrt(segments)
      : format === "vtt"
        ? toVtt(segments)
        : toTxt(segments, m.transcription?.text);

  return { body, contentType: MIME[format], filename: `meetgenius-${meetingId}.${format}` };
}
