import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Sirve el archivo de grabación de una reunión con soporte de `Range`,
 * para que el reproductor del transcript pueda hacer seek (click-to-seek)
 * sin descargar todo el audio. Funciona en dev, web y app empaquetada.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const recording = await prisma.recording.findUnique({ where: { meetingId: id } });
  if (!recording) return new Response("Sin grabación", { status: 404 });

  let size: number;
  try {
    size = (await stat(recording.filePath)).size;
  } catch {
    return new Response("Archivo de audio no encontrado", { status: 404 });
  }

  const mime = recording.mimeType || "audio/webm";
  const range = req.headers.get("range");

  // Petición de rango → respondemos 206 con la porción solicitada.
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : size - 1;
    if (start >= size || end >= size || start > end) {
      return new Response("Rango no satisfacible", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const stream = createReadStream(recording.filePath, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  // Sin rango → archivo completo (igualmente anunciamos Accept-Ranges).
  const stream = createReadStream(recording.filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
