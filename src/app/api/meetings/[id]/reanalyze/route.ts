import { NextRequest } from "next/server";
import { handle } from "../../../_helpers";
import { prisma } from "@/lib/db";
import { runAnalysisPipeline } from "@/server/services/analysis.service";

/** Reejecuta el pipeline de transcripción + análisis para una reunión. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    await prisma.meeting.update({ where: { id }, data: { status: "PROCESSING" } });
    runAnalysisPipeline(id).catch(() => {});
    return { ok: true };
  });
}
