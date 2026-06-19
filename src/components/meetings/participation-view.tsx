"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatDuration } from "@/lib/utils";
import { type Segment, computeTalkTime } from "@/lib/transcript";

/**
 * Participación por hablante (talk-time): cuánto habló cada participante,
 * derivado de la diarización de los segmentos. Inspirado en las métricas de
 * engagement de Read AI, pero 100% local.
 */
export function ParticipationView({ segments }: { segments?: Segment[] | null }) {
  const data = React.useMemo(
    () => computeTalkTime(Array.isArray(segments) ? segments : []),
    [segments],
  );

  if (!data.length) {
    return (
      <EmptyState
        icon={Users}
        title="Sin datos de participación"
        description="La diarización no identificó hablantes. Requiere una transcripción con segmentos (Whisper)."
      />
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--brand-400)]">
          <Users className="size-4" /> Tiempo de intervención por participante
        </div>
        <div className="space-y-4">
          {data.map((t) => (
            <div key={t.speaker} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                  {t.speaker}
                </span>
                <span className="text-[var(--muted-foreground)] tabular-nums">
                  {t.pct}% · {formatDuration(t.seconds)}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(2, t.pct)}%`, background: t.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
