import { NextRequest, NextResponse } from "next/server";
import { buildMeetingExcel, buildMeetingPdf } from "@/server/services/report.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";

  if (format === "excel" || format === "xlsx") {
    const buf = await buildMeetingExcel(id);
    return new NextResponse(buf as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="meetgenius-${id}.xlsx"`,
      },
    });
  }

  const pdf = await buildMeetingPdf(id);
  return new NextResponse(Buffer.from(pdf) as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="meetgenius-${id}.pdf"`,
    },
  });
}
