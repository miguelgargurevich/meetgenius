/** Etiquetas y estilos de dominio reutilizables en la UI. */

export const MEETING_STATUS = {
  DRAFT: { label: "Borrador", variant: "secondary" as const },
  RECORDING: { label: "Grabando", variant: "danger" as const },
  PAUSED: { label: "Pausada", variant: "warning" as const },
  PROCESSING: { label: "Procesando", variant: "brand" as const },
  COMPLETED: { label: "Completada", variant: "success" as const },
  FAILED: { label: "Error", variant: "danger" as const },
};

export const TASK_STATUS = {
  TODO: { label: "Por hacer", variant: "secondary" as const },
  IN_PROGRESS: { label: "En progreso", variant: "brand" as const },
  DONE: { label: "Completada", variant: "success" as const },
  BLOCKED: { label: "Bloqueada", variant: "danger" as const },
};

export const PRIORITY = {
  LOW: { label: "Baja", variant: "secondary" as const },
  MEDIUM: { label: "Media", variant: "outline" as const },
  HIGH: { label: "Alta", variant: "warning" as const },
  CRITICAL: { label: "Crítica", variant: "danger" as const },
};

export const RISK_IMPACT = {
  LOW: { label: "Bajo", variant: "secondary" as const },
  MEDIUM: { label: "Medio", variant: "warning" as const },
  HIGH: { label: "Alto", variant: "danger" as const },
};

export const AGREEMENT_STATUS = {
  PROPOSED: { label: "Propuesto", variant: "secondary" as const },
  CONFIRMED: { label: "Confirmado", variant: "brand" as const },
  AT_RISK: { label: "En riesgo", variant: "warning" as const },
  DONE: { label: "Cumplido", variant: "success" as const },
};

export const SENTIMENT = {
  POSITIVE: { label: "Positivo", variant: "success" as const, emoji: "😊" },
  NEUTRAL: { label: "Neutral", variant: "secondary" as const, emoji: "😐" },
  NEGATIVE: { label: "Negativo", variant: "danger" as const, emoji: "😟" },
};

export const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];
