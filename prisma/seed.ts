import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando datos de demostración…");

  const org = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Mi Organización", slug: "default", vocabulary: [] },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@meetgenius.app" },
    update: {},
    create: {
      email: "demo@meetgenius.app",
      name: "Usuario Demo",
      role: "OWNER",
      organizationId: org.id,
    },
  });

  const samples = [
    {
      title: "Sync semanal de Producto",
      sentiment: "POSITIVE" as const,
      daysAgo: 2,
      duration: 2700,
      summary: [
        "Se revisó el avance del sprint y se aprobó el roadmap del Q3.",
        "El equipo de diseño presentó los nuevos wireframes del dashboard.",
        "Se acordó priorizar la integración con el proveedor CRM.",
      ],
      tasks: [
        { title: "Preparar informe ejecutivo para el cliente", priority: "HIGH", status: "TODO" },
        { title: "Integrar API del proveedor CRM", priority: "CRITICAL", status: "IN_PROGRESS" },
        { title: "Actualizar wireframes del dashboard", priority: "MEDIUM", status: "DONE" },
      ],
      agreements: [
        { title: "Aprobar roadmap Q3", owner: "Ana", status: "CONFIRMED" },
        { title: "Priorizar integración CRM", owner: "Luis", status: "CONFIRMED" },
      ],
      risks: [{ risk: "Retraso si no llegan las credenciales del CRM", impact: "HIGH" }],
      nextSteps: ["Agendar seguimiento el lunes", "Enviar informe el viernes"],
      questions: ["¿Cuál es el presupuesto del Q3?"],
    },
    {
      title: "Reunión con proveedor CRM",
      sentiment: "NEUTRAL" as const,
      daysAgo: 9,
      duration: 1800,
      summary: [
        "El proveedor presentó su plan de integración y los plazos.",
        "Se discutieron los costos de licenciamiento por usuario.",
      ],
      tasks: [
        { title: "Solicitar credenciales de sandbox", priority: "HIGH", status: "DONE" },
        { title: "Revisar contrato de licenciamiento", priority: "MEDIUM", status: "TODO" },
      ],
      agreements: [{ title: "Plazo de integración: 3 semanas", owner: "Proveedor", status: "PROPOSED" }],
      risks: [{ risk: "Costos de licenciamiento por encima del presupuesto", impact: "MEDIUM" }],
      nextSteps: ["Revisar contrato", "Validar con finanzas"],
      questions: [],
    },
    {
      title: "Retrospectiva del Sprint 12",
      sentiment: "NEGATIVE" as const,
      daysAgo: 16,
      duration: 3600,
      summary: [
        "Se identificaron problemas de comunicación entre equipos.",
        "Varias tareas quedaron bloqueadas por dependencias externas.",
      ],
      tasks: [{ title: "Definir canal de comunicación entre equipos", priority: "HIGH", status: "IN_PROGRESS" }],
      agreements: [{ title: "Reuniones de sincronización diarias", owner: "Equipo", status: "CONFIRMED" }],
      risks: [
        { risk: "Dependencias externas no gestionadas", impact: "HIGH" },
        { risk: "Sobrecarga del equipo", impact: "MEDIUM" },
      ],
      nextSteps: ["Implementar dailies", "Mapear dependencias"],
      questions: ["¿Quién gestiona las dependencias externas?"],
    },
  ];

  for (const s of samples) {
    const createdAt = new Date(Date.now() - s.daysAgo * 86400000);
    const meeting = await prisma.meeting.create({
      data: {
        title: s.title,
        status: "COMPLETED",
        sentiment: s.sentiment,
        durationSec: s.duration,
        participants: ["Ana", "Luis", "María"],
        organizationId: org.id,
        ownerId: user.id,
        createdAt,
        startedAt: createdAt,
        endedAt: new Date(createdAt.getTime() + s.duration * 1000),
        transcription: {
          create: {
            text: `Transcripción de demostración de "${s.title}". ${s.summary.join(" ")}`,
            status: "SUCCEEDED",
            provider: "seed",
          },
        },
        summary: { create: { bullets: s.summary } },
        tasks: { create: s.tasks.map((t) => ({ title: t.title, priority: t.priority as never, status: t.status as never })) },
        agreements: { create: s.agreements.map((a) => ({ title: a.title, owner: a.owner, status: a.status as never })) },
        risks: { create: s.risks.map((r) => ({ risk: r.risk, impact: r.impact as never })) },
        nextSteps: { create: s.nextSteps.map((step, i) => ({ step, order: i })) },
        openQuestions: { create: s.questions.map((question) => ({ question })) },
      },
    });
    console.log(`  ✓ ${meeting.title}`);
  }

  console.log("✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
