import { prisma } from "@/lib/db";
import { getCurrentOrg } from "@/server/context";

export interface DashboardData {
  kpis: {
    totalMeetings: number;
    hoursRecorded: number;
    agreements: number;
    tasksPending: number;
    tasksCompleted: number;
    risksOpen: number;
  };
  meetingsByMonth: { month: string; meetings: number }[];
  agreementsByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  sentimentTrend: { month: string; positive: number; neutral: number; negative: number }[];
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const dashboardService = {
  async get(): Promise<DashboardData> {
    const org = await getCurrentOrg();
    const where = { organizationId: org.id };

    const [meetings, durationAgg, agreements, tasksPending, tasksDone, risksOpen, allMeetings, allTasks, allAgreements] =
      await Promise.all([
        prisma.meeting.count({ where }),
        prisma.meeting.aggregate({ where, _sum: { durationSec: true } }),
        prisma.agreement.count({ where: { meeting: where } }),
        prisma.task.count({ where: { meeting: where, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } } }),
        prisma.task.count({ where: { meeting: where, status: "DONE" } }),
        prisma.risk.count({ where: { meeting: where, status: "OPEN" } }),
        prisma.meeting.findMany({ where, select: { createdAt: true, sentiment: true } }),
        prisma.task.groupBy({ by: ["priority"], where: { meeting: where }, _count: true }),
        prisma.agreement.groupBy({ by: ["status"], where: { meeting: where }, _count: true }),
      ]);

    // Reuniones por mes (últimos 6 meses) + tendencia de sentimiento
    const byMonth = new Map<string, number>();
    const sentByMonth = new Map<string, { positive: number; neutral: number; negative: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      byMonth.set(key, 0);
      sentByMonth.set(key, { positive: 0, neutral: 0, negative: 0 });
    }
    for (const m of allMeetings) {
      const d = m.createdAt;
      const key = `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      if (byMonth.has(key)) {
        byMonth.set(key, byMonth.get(key)! + 1);
        const s = sentByMonth.get(key)!;
        if (m.sentiment === "POSITIVE") s.positive++;
        else if (m.sentiment === "NEGATIVE") s.negative++;
        else s.neutral++;
      }
    }

    return {
      kpis: {
        totalMeetings: meetings,
        hoursRecorded: Math.round(((durationAgg._sum.durationSec ?? 0) / 3600) * 10) / 10,
        agreements,
        tasksPending,
        tasksCompleted: tasksDone,
        risksOpen,
      },
      meetingsByMonth: [...byMonth.entries()].map(([month, m]) => ({ month, meetings: m })),
      agreementsByStatus: allAgreements.map((a) => ({ status: a.status, count: a._count })),
      tasksByPriority: allTasks.map((t) => ({ priority: t.priority, count: t._count })),
      sentimentTrend: [...sentByMonth.entries()].map(([month, v]) => ({ month, ...v })),
    };
  },
};
