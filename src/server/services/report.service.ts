import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ExcelJS from "exceljs";
import { meetingService } from "./meeting.service";

type FullMeeting = Awaited<ReturnType<typeof meetingService.getById>>;

const BRAND = rgb(0.31, 0.27, 0.9);
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);

/** Genera el PDF ejecutivo de una reunión. */
export async function buildMeetingPdf(meetingId: string): Promise<Uint8Array> {
  const m = await meetingService.getById(meetingId);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595, 842]); // A4
  const margin = 56;
  let y = 786;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([595, 842]);
      y = 786;
    }
  };

  const wrap = (text: string, size: number, maxWidth: number, f = font) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };

  const text = (s: string, size: number, opts: { color?: typeof INK; f?: typeof font; indent?: number } = {}) => {
    const maxWidth = 595 - margin * 2 - (opts.indent ?? 0);
    for (const ln of wrap(s, size, maxWidth, opts.f ?? font)) {
      ensureSpace(size + 6);
      page.drawText(ln, {
        x: margin + (opts.indent ?? 0),
        y,
        size,
        font: opts.f ?? font,
        color: opts.color ?? INK,
      });
      y -= size + 6;
    }
  };

  const heading = (s: string) => {
    y -= 10;
    ensureSpace(24);
    page.drawText(s, { x: margin, y, size: 14, font: bold, color: BRAND });
    y -= 22;
  };

  // Encabezado
  page.drawRectangle({ x: 0, y: 802, width: 595, height: 40, color: BRAND });
  page.drawText("MeetGenius — Informe Ejecutivo", {
    x: margin, y: 814, size: 16, font: bold, color: rgb(1, 1, 1),
  });

  const participants = (m.participants as string[] | null) ?? [];
  const summaryBullets = (m.summary?.bullets as string[] | null) ?? [];

  text(m.title, 20, { f: bold });
  const meta = `${m.createdAt.toLocaleDateString("es")} · Duración ${Math.round(m.durationSec / 60)} min · ${participants.length} participantes`;
  text(meta, 10, { color: MUTED });
  if (m.sentiment) text(`Sentimiento general: ${m.sentiment}`, 10, { color: MUTED });

  heading("Resumen Ejecutivo");
  (summaryBullets.length ? summaryBullets : ["(sin resumen)"]).forEach((b) =>
    text(`•  ${b}`, 11, { indent: 6 }),
  );

  heading("Acuerdos");
  if (!m.agreements.length) text("(ninguno)", 11, { color: MUTED });
  m.agreements.forEach((a) => {
    text(`•  ${a.title}`, 11, { f: bold, indent: 6 });
    if (a.description) text(a.description, 10, { color: MUTED, indent: 18 });
    if (a.owner) text(`Responsable: ${a.owner}`, 9, { color: MUTED, indent: 18 });
  });

  heading("Tareas");
  if (!m.tasks.length) text("(ninguna)", 11, { color: MUTED });
  m.tasks.forEach((t) =>
    text(`•  [${t.priority}] ${t.title} — ${t.status}${t.assigneeRaw ? ` (${t.assigneeRaw})` : ""}`, 11, { indent: 6 }),
  );

  heading("Riesgos");
  if (!m.risks.length) text("(ninguno)", 11, { color: MUTED });
  m.risks.forEach((r) => {
    text(`•  [${r.impact}] ${r.risk}`, 11, { f: bold, indent: 6 });
    if (r.mitigation) text(`Mitigación: ${r.mitigation}`, 10, { color: MUTED, indent: 18 });
  });

  heading("Próximos Pasos");
  if (!m.nextSteps.length) text("(ninguno)", 11, { color: MUTED });
  m.nextSteps.forEach((s, i) => text(`${i + 1}.  ${s.step}`, 11, { indent: 6 }));

  return pdf.save();
}

/** Genera el Excel con hojas de Acuerdos, Tareas y Riesgos. */
export async function buildMeetingExcel(meetingId: string): Promise<Buffer> {
  const m: FullMeeting = await meetingService.getById(meetingId);
  const wb = new ExcelJS.Workbook();
  wb.creator = "MeetGenius";

  const style = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  };

  const agreements = wb.addWorksheet("Acuerdos");
  agreements.columns = [
    { header: "Título", key: "title", width: 40 },
    { header: "Descripción", key: "description", width: 50 },
    { header: "Responsable", key: "owner", width: 24 },
    { header: "Fecha objetivo", key: "targetDate", width: 18 },
    { header: "Estado", key: "status", width: 16 },
  ];
  m.agreements.forEach((a) =>
    agreements.addRow({
      title: a.title,
      description: a.description ?? "",
      owner: a.owner ?? "",
      targetDate: a.targetDate?.toLocaleDateString("es") ?? "",
      status: a.status,
    }),
  );
  style(agreements);

  const tasks = wb.addWorksheet("Tareas");
  tasks.columns = [
    { header: "Título", key: "title", width: 50 },
    { header: "Responsable", key: "assignee", width: 24 },
    { header: "Prioridad", key: "priority", width: 14 },
    { header: "Estado", key: "status", width: 16 },
  ];
  m.tasks.forEach((t) =>
    tasks.addRow({
      title: t.title,
      assignee: t.assigneeRaw ?? "",
      priority: t.priority,
      status: t.status,
    }),
  );
  style(tasks);

  const risks = wb.addWorksheet("Riesgos");
  risks.columns = [
    { header: "Riesgo", key: "risk", width: 50 },
    { header: "Impacto", key: "impact", width: 14 },
    { header: "Mitigación", key: "mitigation", width: 50 },
    { header: "Estado", key: "status", width: 16 },
  ];
  m.risks.forEach((r) =>
    risks.addRow({
      risk: r.risk,
      impact: r.impact,
      mitigation: r.mitigation ?? "",
      status: r.status,
    }),
  );
  style(risks);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
