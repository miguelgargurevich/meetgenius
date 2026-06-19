import { meetingService } from "@/server/services/meeting.service";
import { MermaidDiagrams, type Diagram } from "@/components/report/report-diagrams";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BRAND = "#4f46e5";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7" style={{ breakInside: "avoid" }}>
      <h2 className="mb-3 text-base font-semibold" style={{ color: BRAND }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Vista imprimible del informe ejecutivo (HTML → PDF). */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await meetingService.getById(id);

  const participants = (m.participants as string[] | null) ?? [];
  const bullets = (m.summary?.bullets as string[] | null) ?? [];
  const chapters = (m.insight?.chapters as any[] | null) ?? [];
  const diagrams = (m.insight?.diagrams as Diagram[] | null) ?? [];
  const meta = `${m.createdAt.toLocaleDateString("es")} · ${Math.round(m.durationSec / 60)} min · ${participants.length} participantes`;

  return (
    <div className="mx-auto max-w-[800px] px-10 py-8 text-[13px] leading-relaxed">
      <style>{`@page { size: A4; margin: 14mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      {/* Encabezado */}
      <div className="rounded-xl px-5 py-4 text-white" style={{ background: BRAND }}>
        <p className="text-xs font-medium opacity-80">MeetGenius — Informe Ejecutivo</p>
        <h1 className="mt-0.5 text-2xl font-bold">{m.title}</h1>
        <p className="mt-1 text-xs opacity-90">{meta}</p>
        {m.sentiment && <p className="text-xs opacity-90">Sentimiento general: {m.sentiment}</p>}
      </div>

      <Section title="Resumen Ejecutivo">
        {bullets.length ? (
          <ol className="space-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold" style={{ color: BRAND }}>
                  {i + 1}.
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-zinc-500">(sin resumen)</p>
        )}
      </Section>

      {diagrams.length > 0 && (
        <Section title="Diagramas">
          <MermaidDiagrams diagrams={diagrams} signalReady />
        </Section>
      )}
      {/* Si no hay diagramas, igual señalizamos readiness para el printToPDF. */}
      {diagrams.length === 0 && <MermaidDiagrams diagrams={[]} signalReady />}

      <Section title="Acuerdos">
        {m.agreements.length ? (
          <ul className="space-y-2">
            {m.agreements.map((a) => (
              <li key={a.id} style={{ breakInside: "avoid" }}>
                <p className="font-medium">{a.title}</p>
                {a.description && <p className="text-zinc-600">{a.description}</p>}
                {a.owner && <p className="text-xs text-zinc-500">Responsable: {a.owner}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500">(ninguno)</p>
        )}
      </Section>

      <Section title="Tareas">
        {m.tasks.length ? (
          <ul className="space-y-1">
            {m.tasks.map((t) => (
              <li key={t.id}>
                <span className="font-medium">[{t.priority}]</span> {t.title} — {t.status}
                {t.assigneeRaw ? ` (${t.assigneeRaw})` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500">(ninguna)</p>
        )}
      </Section>

      <Section title="Riesgos">
        {m.risks.length ? (
          <ul className="space-y-2">
            {m.risks.map((r) => (
              <li key={r.id} style={{ breakInside: "avoid" }}>
                <p className="font-medium">[{r.impact}] {r.risk}</p>
                {r.mitigation && <p className="text-zinc-600">Mitigación: {r.mitigation}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500">(ninguno)</p>
        )}
      </Section>

      <Section title="Próximos Pasos">
        {m.nextSteps.length ? (
          <ol className="space-y-1">
            {m.nextSteps.map((s, i) => (
              <li key={s.id}>
                {i + 1}. {s.step}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-zinc-500">(ninguno)</p>
        )}
      </Section>

      {chapters.length > 0 && (
        <Section title="Capítulos">
          <ul className="space-y-1.5">
            {chapters.map((c, i) => (
              <li key={i} style={{ breakInside: "avoid" }}>
                <span className="font-medium">{c.title}</span>
                {c.summary ? <span className="text-zinc-600"> — {c.summary}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
