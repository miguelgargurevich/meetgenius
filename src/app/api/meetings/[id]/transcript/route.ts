import { NextRequest, NextResponse } from "next/server";
import {
  buildTranscriptExport,
  type TranscriptFormat,
} from "@/server/services/transcript-export.service";

/** Descarga la transcripción de una reunión como SRT/VTT/TXT. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = (req.nextUrl.searchParams.get("format") ?? "txt").toLowerCase();
  const format: TranscriptFormat = raw === "srt" || raw === "vtt" ? raw : "txt";

  const { body, contentType, filename } = await buildTranscriptExport(id, format);
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
