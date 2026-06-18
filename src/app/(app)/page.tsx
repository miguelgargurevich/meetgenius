"use client";

import Link from "next/link";
import {
  Mic,
  Clock,
  Handshake,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useDashboard } from "@/hooks/use-meetings";
import { CHART_COLORS, PRIORITY, AGREEMENT_STATUS } from "@/lib/domain";

const KPIS = [
  { key: "totalMeetings", label: "Reuniones", icon: Mic },
  { key: "hoursRecorded", label: "Horas grabadas", icon: Clock, suffix: "h" },
  { key: "agreements", label: "Acuerdos", icon: Handshake },
  { key: "tasksPending", label: "Tareas pendientes", icon: ListTodo },
  { key: "tasksCompleted", label: "Tareas completadas", icon: CheckCircle2 },
  { key: "risksOpen", label: "Riesgos abiertos", icon: AlertTriangle },
] as const;

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Vista ejecutiva de tus reuniones y conocimiento generado."
        action={
          <Link href="/meetings?new=1">
            <Button>
              <Plus className="size-4" /> Nueva reunión
            </Button>
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {KPIS.map((kpi) => (
            <Card key={kpi.key}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">
                    {kpi.label}
                  </span>
                  <kpi.icon className="size-4 text-[var(--muted-foreground)]" />
                </div>
                {isLoading ? (
                  <Skeleton className="mt-3 h-8 w-16" />
                ) : (
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {data?.kpis[kpi.key] ?? 0}
                    {"suffix" in kpi ? (
                      <span className="text-base text-[var(--muted-foreground)]">{kpi.suffix}</span>
                    ) : null}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reuniones por mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartFrame loading={isLoading}>
                <AreaChart data={data?.meetingsByMonth}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="meetings" stroke="#6366f1" strokeWidth={2} fill="url(#g)" />
                </AreaChart>
              </ChartFrame>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tareas por prioridad</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartFrame loading={isLoading}>
                <BarChart data={data?.tasksByPriority?.map((t) => ({ ...t, label: PRIORITY[t.priority as keyof typeof PRIORITY]?.label ?? t.priority }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {data?.tasksByPriority?.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartFrame>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acuerdos por estado</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartFrame loading={isLoading}>
                <PieChart>
                  <Pie
                    data={data?.agreementsByStatus?.map((a) => ({
                      ...a,
                      label: AGREEMENT_STATUS[a.status as keyof typeof AGREEMENT_STATUS]?.label ?? a.status,
                    }))}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data?.agreementsByStatus?.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ChartFrame>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia de sentimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartFrame loading={isLoading}>
                <BarChart data={data?.sentimentTrend} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="positive" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="neutral" stackId="a" fill="#a1a1aa" />
                  <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartFrame>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ChartFrame({ loading, children }: { loading: boolean; children: React.ReactElement }) {
  if (loading) return <Skeleton className="h-[240px] w-full" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      {children}
    </ResponsiveContainer>
  );
}
