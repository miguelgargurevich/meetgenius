"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Users, ListTodo, Handshake, AlertTriangle, Trash2, Folder } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { MEETING_STATUS, SENTIMENT } from "@/lib/domain";
import { formatDuration } from "@/lib/utils";
import { useDeleteMeeting, type MeetingListItem } from "@/hooks/use-meetings";

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  const del = useDeleteMeeting();

  return (
    <Card className="group relative transition-colors hover:border-[var(--brand-400)]">
      <Link href={`/meetings/${meeting.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-tight">{meeting.title}</h3>
          <StatusBadge value={meeting.status} map={MEETING_STATUS} pulse />
        </div>
        {meeting.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
            {meeting.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {formatDuration(meeting.durationSec)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {meeting.participants.length}
          </span>
          <span className="flex items-center gap-1">
            <Handshake className="size-3.5" /> {meeting._count.agreements}
          </span>
          <span className="flex items-center gap-1">
            <ListTodo className="size-3.5" /> {meeting._count.tasks}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="size-3.5" /> {meeting._count.risks}
          </span>
        </div>
        {(meeting.folders?.length > 0 || meeting.tags?.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {meeting.folders?.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: `color-mix(in oklab, ${f.color ?? "var(--primary)"} 18%, transparent)`,
                  color: f.color ?? "var(--brand-400)",
                }}
              >
                <Folder className="size-2.5" /> {f.name}
              </span>
            ))}
            {meeting.tags?.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px]"
              >
                <span className="size-2 rounded-full" style={{ background: t.color ?? "var(--primary)" }} />
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>
            {formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true, locale: es })}
          </span>
          {meeting.sentiment && <span>{SENTIMENT[meeting.sentiment].emoji}</span>}
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          if (confirm(`¿Eliminar "${meeting.title}"? Esta acción no se puede deshacer.`)) {
            del.mutate(
              { id: meeting.id, externalEventId: meeting.externalEventId },
              {
                onSuccess: () => toast.success("Reunión eliminada"),
                onError: (err) => toast.error((err as Error).message),
              },
            );
          }
        }}
      >
        <Trash2 className="size-4 text-[var(--danger)]" />
      </Button>
    </Card>
  );
}
