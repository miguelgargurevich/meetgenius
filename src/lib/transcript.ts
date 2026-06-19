import { CHART_COLORS } from "@/lib/domain";

/** Segmento de transcripción con tiempos y hablante opcional (diarización). */
export interface Segment {
  start: number;
  end: number;
  text: string;
  speaker?: string | null;
}

/** Mapa de renombrado de hablantes: etiqueta original → nombre real. */
export type SpeakerNames = Record<string, string>;

/**
 * Aplica el renombrado de hablantes a los segmentos (punto ÚNICO de aplicación,
 * usado por el transcript, talk-time y export). No muta la entrada.
 * Las etiquetas sin mapeo conservan su valor original.
 */
export function applySpeakerNames(
  segments: Segment[],
  names?: SpeakerNames | null,
): Segment[] {
  if (!names || !Object.keys(names).length) return segments;
  return segments.map((s) => {
    const sp = (s.speaker ?? "").trim();
    const mapped = sp && names[sp] ? names[sp] : s.speaker;
    return mapped === s.speaker ? s : { ...s, speaker: mapped };
  });
}

/** Lista ordenada y única de hablantes presentes en los segmentos. */
export function speakersOf(segments: Segment[]): string[] {
  const seen: string[] = [];
  for (const s of segments) {
    const sp = (s.speaker ?? "").trim();
    if (sp && !seen.includes(sp)) seen.push(sp);
  }
  return seen;
}

/** Color estable por hablante, reutilizando la paleta de gráficos. */
export function speakerColor(speaker: string, speakers: string[]): string {
  const i = speakers.indexOf(speaker);
  return CHART_COLORS[(i < 0 ? 0 : i) % CHART_COLORS.length];
}

export interface TalkTime {
  speaker: string;
  seconds: number;
  pct: number;
  color: string;
}

/** Tiempo hablado por participante (suma de duraciones de sus segmentos). */
export function computeTalkTime(segments: Segment[]): TalkTime[] {
  const speakers = speakersOf(segments);
  if (!speakers.length) return [];
  const totals = new Map<string, number>();
  for (const s of segments) {
    const sp = (s.speaker ?? "").trim();
    if (!sp) continue;
    const dur = Math.max(0, (s.end ?? 0) - (s.start ?? 0));
    totals.set(sp, (totals.get(sp) ?? 0) + dur);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return speakers
    .map((speaker) => {
      const seconds = totals.get(speaker) ?? 0;
      return {
        speaker,
        seconds,
        pct: Math.round((seconds / grand) * 100),
        color: speakerColor(speaker, speakers),
      };
    })
    .sort((a, b) => b.seconds - a.seconds);
}
