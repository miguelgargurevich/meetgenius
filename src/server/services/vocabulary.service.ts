import { prisma } from "@/lib/db";
import { getCurrentOrg } from "@/server/context";

const MAX_TERMS = 200;
/** Tope al construir el prompt de Whisper (límite ~224 tokens). */
const PROMPT_MAX_TERMS = 50;

/** Normaliza términos: trim, sin vacíos, dedup case-insensitive, tope. */
function normalizeTerms(terms: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of terms) {
    const t = (raw ?? "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

export const vocabularyService = {
  async getVocabulary(): Promise<string[]> {
    const org = await getCurrentOrg();
    const row = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { vocabulary: true },
    });
    return (row?.vocabulary as string[] | null) ?? [];
  },

  async setVocabulary(terms: string[]): Promise<string[]> {
    const org = await getCurrentOrg();
    const clean = normalizeTerms(terms);
    await prisma.organization.update({
      where: { id: org.id },
      data: { vocabulary: clean },
    });
    return clean;
  },
};

/**
 * Sugerencia de transcripción (param `prompt` de Whisper) en español que
 * sesga el reconocimiento hacia los nombres/términos del usuario sin forzar
 * su aparición. Se trunca por el límite de tokens de Whisper.
 */
export function buildVocabularyPrompt(terms: string[]): string | undefined {
  const list = terms.slice(0, PROMPT_MAX_TERMS);
  if (!list.length) return undefined;
  return `Vocabulario y nombres propios que pueden aparecer (respeta su ortografía exacta): ${list.join(", ")}.`;
}
