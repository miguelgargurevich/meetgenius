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
  const { data, isLoading } = useMeetings();

  React.useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
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
