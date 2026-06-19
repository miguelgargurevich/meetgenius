"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Mic } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/misc";
import { MeetingCard } from "@/components/meetings/meeting-card";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { useMeetings } from "@/hooks/use-meetings";
import { useFolders, useTags } from "@/hooks/use-taxonomy";

export default function MeetingsPage() {
  return (
    <React.Suspense>
      <MeetingsPageInner />
    </React.Suspense>
  );
}

function MeetingsPageInner() {
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [folderId, setFolderId] = React.useState("");
  const [tagId, setTagId] = React.useState("");
  const folders = useFolders();
  const tags = useTags();
  const { data, isLoading } = useMeetings({
    folderId: folderId || undefined,
    tagId: tagId || undefined,
  });

  React.useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
    const f = params.get("folderId");
    const t = params.get("tagId");
    if (f) setFolderId(f);
    if (t) setTagId(t);
  }, [params]);

  return (
    <div>
      <PageHeader
        title="Reuniones"
        description="Crea, graba y analiza tus reuniones."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nueva reunión
          </Button>
        }
      />

      <div className="p-8">
        {(folders.data?.length || tags.data?.length) ? (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-400)]"
            >
              <option value="">Todas las carpetas</option>
              {folders.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-400)]"
            >
              <option value="">Todas las etiquetas</option>
              {tags.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {(folderId || tagId) && (
              <button
                onClick={() => {
                  setFolderId("");
                  setTagId("");
                }}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : null}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Mic}
            title="Aún no hay reuniones"
            description="Crea tu primera reunión para empezar a grabar, transcribir y analizar con IA."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Nueva reunión
              </Button>
            }
          />
        )}
      </div>

      <CreateMeetingDialog open={open} onClose={() => setOpen(false)} startRecording />
    </div>
  );
}
