"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  FileDown,
  FileSpreadsheet,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Loader2,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton as SkeletonBox } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { RecorderPanel } from "@/components/meetings/recorder-panel";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import {
  SummaryView,
  TasksView,
  AgreementsView,
  RisksView,
  ListView,
} from "@/components/meetings/analysis-views";
import { TranscriptView } from "@/components/meetings/transcript-view";
import { ParticipationView } from "@/components/meetings/participation-view";
import {
  ChaptersView,
  HighlightsView,
  FollowUpEmailView,
} from "@/components/meetings/insights-views";
import { useMeeting } from "@/hooks/use-meetings";
import { MEETING_STATUS, SENTIMENT } from "@/lib/domain";
import { api } from "@/lib/api-client";
import { formatDuration } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MeetingDetailPage() {
  return (
    <React.Suspense>
      <MeetingDetailInner />
    </React.Suspense>
  );
}

function MeetingDetailInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { data: m, isLoading } = useMeeting(id);
  const [reanalyzing, setReanalyzing] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [tab, setTab] = React.useState("summary");
  const [seek, setSeek] = React.useState<{ sec: number; nonce: number } | null>(null);
  const goTo = React.useCallback((sec: number) => {
    setSeek((prev) => ({ sec, nonce: (prev?.nonce ?? 0) + 1 }));
    setTab("transcript");
  }, []);

  const reanalyze = async () => {
    setReanalyzing(true);
    try {
      await api.post(`/api/meetings/${id}/reanalyze`);
      toast.success("Reanálisis iniciado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReanalyzing(false);
    }
  };

  if (isLoading || !m) {
    return (
      <div>
        <PageHeader title="Cargando…" />
        <div className="space-y-4 p-8">
          <SkeletonBox className="h-24 w-full" />
          <SkeletonBox className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const showRecorder = m.status === "DRAFT" || m.status === "RECORDING" || m.status === "PAUSED";
  const processing = m.status === "PROCESSING";
  const segments = m.transcription?.segments;
  const hasSpeakers =
    Array.isArray(segments) && segments.some((s: any) => (s?.speaker ?? "").trim());
  const chapters = m.insight?.chapters as any[] | undefined;
  const highlights = m.insight?.highlights as any[] | undefined;
  const hasEmail = Boolean(m.insight?.followUpSubject || m.insight?.followUpBody);

  return (
    <div>
      <PageHeader
        title={m.title}
        description={m.description ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Editar
            </Button>
            {m.status === "COMPLETED" && (
              <>
                <a href={`/api/meetings/${id}/report?format=pdf`}>
                  <Button variant="outline" size="sm">
                    <FileDown className="size-4" /> PDF
                  </Button>
                </a>
                <a href={`/api/meetings/${id}/report?format=excel`}>
                  <Button variant="outline" size="sm">
                    <FileSpreadsheet className="size-4" /> Excel
                  </Button>
                </a>
                <Button variant="ghost" size="sm" onClick={reanalyze} disabled={reanalyzing}>
                  <RefreshCw className={`size-4 ${reanalyzing ? "animate-spin" : ""}`} /> Reanalizar
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="space-y-6 p-8">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-4" /> Reuniones
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted-foreground)]">
          <StatusBadge value={m.status} map={MEETING_STATUS} pulse />
          <span>{new Date(m.createdAt).toLocaleString("es")}</span>
          <span>· {formatDuration(m.durationSec)}</span>
          <span>· {m.participants.length} participantes</span>
          {m.sentiment && (
            <span>
              · {SENTIMENT[m.sentiment as keyof typeof SENTIMENT].emoji}{" "}
              {SENTIMENT[m.sentiment as keyof typeof SENTIMENT].label}
            </span>
          )}
        </div>

        {showRecorder && <RecorderPanel meetingId={id} autoStart={params.get("record") === "1"} />}

        {processing && (
          <Card>
            <CardContent className="flex items-center gap-4 p-8">
              <Loader2 className="size-6 animate-spin text-[var(--primary)]" />
              <div>
                <p className="font-medium">Procesando con IA…</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Transcribiendo el audio y analizando el contenido. Esto se actualiza automáticamente.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {m.status === "FAILED" && (
          <Card className="border-[var(--danger)]/40">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <p className="text-sm">El procesamiento falló. Puedes reintentar el análisis.</p>
              <Button variant="outline" size="sm" onClick={reanalyze} disabled={reanalyzing}>
                <RefreshCw className="size-4" /> Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {m.status === "COMPLETED" && (
          <Tabs defaultValue="summary" value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="tasks">Tareas ({m.tasks.length})</TabsTrigger>
              <TabsTrigger value="agreements">Acuerdos ({m.agreements.length})</TabsTrigger>
              <TabsTrigger value="risks">Riesgos ({m.risks.length})</TabsTrigger>
              <TabsTrigger value="next">Próximos pasos</TabsTrigger>
              {chapters?.length ? <TabsTrigger value="chapters">Capítulos</TabsTrigger> : null}
              {highlights?.length ? <TabsTrigger value="highlights">Momentos</TabsTrigger> : null}
              {hasSpeakers && <TabsTrigger value="participation">Participación</TabsTrigger>}
              <TabsTrigger value="transcript">Transcripción</TabsTrigger>
              {hasEmail && <TabsTrigger value="email">Email</TabsTrigger>}
            </TabsList>

            <TabsContent value="summary">
              <div className="flex items-center gap-2 pb-4 text-sm font-medium text-[var(--brand-400)]">
                <Sparkles className="size-4" /> Resumen ejecutivo generado por IA
              </div>
              <SummaryView bullets={m.summary?.bullets} />
            </TabsContent>
            <TabsContent value="tasks">
              <TasksView tasks={m.tasks} meetingId={id} />
            </TabsContent>
            <TabsContent value="agreements">
              <AgreementsView agreements={m.agreements} />
            </TabsContent>
            <TabsContent value="risks">
              <RisksView risks={m.risks} />
            </TabsContent>
            <TabsContent value="next">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Próximos pasos</h3>
                  <ListView
                    ordered
                    empty="Sin próximos pasos"
                    items={m.nextSteps.map((s: any) => ({ id: s.id, text: s.step }))}
                  />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Preguntas abiertas</h3>
                  <ListView
                    empty="Sin preguntas abiertas"
                    items={m.openQuestions.map((q: any) => ({ id: q.id, text: q.question }))}
                  />
                </div>
              </div>
            </TabsContent>
            {chapters?.length ? (
              <TabsContent value="chapters">
                <ChaptersView chapters={chapters} onSeek={goTo} />
              </TabsContent>
            ) : null}
            {highlights?.length ? (
              <TabsContent value="highlights">
                <HighlightsView highlights={highlights} onSeek={goTo} />
              </TabsContent>
            ) : null}
            {hasSpeakers && (
              <TabsContent value="participation">
                <ParticipationView segments={segments} />
              </TabsContent>
            )}
            <TabsContent value="transcript">
              <TranscriptView
                meetingId={id}
                segments={m.transcription?.segments}
                text={m.transcription?.text}
                hasRecording={Boolean(m.recording)}
                seek={seek}
              />
            </TabsContent>
            {hasEmail && (
              <TabsContent value="email">
                <FollowUpEmailView
                  subject={m.insight?.followUpSubject}
                  body={m.insight?.followUpBody}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      <CreateMeetingDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        meeting={{
          id: m.id,
          title: m.title,
          description: m.description,
          scheduledAt: m.scheduledAt,
          scheduledMinutes: m.scheduledMinutes,
          meetingUrl: m.meetingUrl,
          externalEventId: m.externalEventId,
          participants: m.participants,
        }}
      />
    </div>
  );
}
