"use client";

import * as React from "react";
import Link from "next/link";
import { Search, History as HistoryIcon, FileDown, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { useMeetings } from "@/hooks/use-meetings";
import { MEETING_STATUS } from "@/lib/domain";
import { formatDuration } from "@/lib/utils";

const STATUS_FILTERS = ["", "COMPLETED", "PROCESSING", "DRAFT", "FAILED"];

export default function HistoryPage() {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const debounced = useDebounce(q, 300);

  const { data, isLoading } = useMeetings({
    q: debounced || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to ? `${to}T23:59:59` : undefined,
  });

  return (
    <div>
      <PageHeader title="Historial" description="Busca y filtra todas tus reuniones." />

      <div className="space-y-5 p-8">
        {/* Filtros */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por título o contenido…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <Button
                  key={s || "all"}
                  size="sm"
                  variant={status === s ? "default" : "outline"}
                  onClick={() => setStatus(s)}
                >
                  {s ? MEETING_STATUS[s as keyof typeof MEETING_STATUS].label : "Todas"}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              <span className="text-[var(--muted-foreground)]">→</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
          </div>
        </Card>

        {/* Tabla */}
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : data && data.length > 0 ? (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Reunión</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Duración</th>
                  <th className="px-4 py-3 font-medium">Tareas</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]/50">
                    <td className="px-4 py-3">
                      <Link href={`/meetings/${m.id}`} className="font-medium hover:underline">
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={m.status} map={MEETING_STATUS} />
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {format(new Date(m.createdAt), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {formatDuration(m.durationSec)}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{m._count.tasks}</td>
                    <td className="px-4 py-3">
                      {m.status === "COMPLETED" && (
                        <div className="flex gap-1">
                          <a href={`/api/meetings/${m.id}/report?format=pdf`} title="PDF">
                            <Button variant="ghost" size="icon"><FileDown className="size-4" /></Button>
                          </a>
                          <a href={`/api/meetings/${m.id}/report?format=excel`} title="Excel">
                            <Button variant="ghost" size="icon"><FileSpreadsheet className="size-4" /></Button>
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <EmptyState icon={HistoryIcon} title="Sin resultados" description="Ajusta los filtros o crea una reunión." />
        )}
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
