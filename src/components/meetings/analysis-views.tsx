"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/misc";
import { TASK_STATUS, PRIORITY, RISK_IMPACT, AGREEMENT_STATUS } from "@/lib/domain";
import { useUpdateTask } from "@/hooks/use-meetings";
import { Inbox } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function SummaryView({ bullets }: { bullets?: string[] }) {
  if (!bullets?.length)
    return <EmptyState icon={Inbox} title="Sin resumen" description="El análisis aún no ha generado un resumen." />;
  return (
    <ol className="space-y-3">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">
            {i + 1}
          </span>
          <p className="text-sm leading-relaxed">{b}</p>
        </li>
      ))}
    </ol>
  );
}

export function TasksView({ tasks, meetingId }: { tasks: any[]; meetingId: string }) {
  const update = useUpdateTask(meetingId);
  if (!tasks?.length)
    return <EmptyState icon={Inbox} title="Sin tareas" description="No se detectaron tareas en esta reunión." />;

  const cycle: Record<string, string> = {
    TODO: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
    DONE: "TODO",
    BLOCKED: "TODO",
  };

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <Card key={t.id}>
          <CardContent className="flex items-center gap-3 p-4">
            <button
              onClick={() =>
                update.mutate(
                  { id: t.id, status: cycle[t.status] },
                  { onError: (e) => toast.error((e as Error).message) },
                )
              }
              className="shrink-0"
              title="Cambiar estado"
            >
              {t.status === "DONE" ? (
                <CheckCircle2 className="size-5 text-[var(--success)]" />
              ) : t.status === "IN_PROGRESS" ? (
                <Clock className="size-5 text-[var(--primary)]" />
              ) : (
                <Circle className="size-5 text-[var(--muted-foreground)]" />
              )}
            </button>
            <div className="flex-1">
              <p className={`text-sm ${t.status === "DONE" ? "text-[var(--muted-foreground)] line-through" : ""}`}>
                {t.title}
              </p>
              {t.assigneeRaw && (
                <p className="text-xs text-[var(--muted-foreground)]">Responsable: {t.assigneeRaw}</p>
              )}
            </div>
            <StatusBadge value={t.priority} map={PRIORITY} />
            <StatusBadge value={t.status} map={TASK_STATUS} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AgreementsView({ agreements }: { agreements: any[] }) {
  if (!agreements?.length)
    return <EmptyState icon={Inbox} title="Sin acuerdos" description="No se detectaron acuerdos." />;
  return (
    <div className="space-y-2">
      {agreements.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{a.title}</p>
              <StatusBadge value={a.status} map={AGREEMENT_STATUS} />
            </div>
            {a.description && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{a.description}</p>}
            <div className="mt-2 flex gap-4 text-xs text-[var(--muted-foreground)]">
              {a.owner && <span>👤 {a.owner}</span>}
              {a.targetDate && <span>📅 {new Date(a.targetDate).toLocaleDateString("es")}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RisksView({ risks }: { risks: any[] }) {
  if (!risks?.length)
    return <EmptyState icon={Inbox} title="Sin riesgos" description="No se detectaron riesgos." />;
  return (
    <div className="space-y-2">
      {risks.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{r.risk}</p>
              <StatusBadge value={r.impact} map={RISK_IMPACT} />
            </div>
            {r.mitigation && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                <span className="font-medium text-[var(--foreground)]">Mitigación: </span>
                {r.mitigation}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListView({
  items,
  empty,
  ordered,
}: {
  items: { id: string; text: string }[];
  empty: string;
  ordered?: boolean;
}) {
  if (!items?.length) return <EmptyState icon={Inbox} title={empty} />;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={it.id} className="flex gap-3 rounded-md border border-[var(--border)] p-3 text-sm">
          <span className="text-[var(--muted-foreground)]">{ordered ? `${i + 1}.` : "•"}</span>
          {it.text}
        </li>
      ))}
    </ul>
  );
}
