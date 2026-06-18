import { prisma } from "@/lib/db";

export async function audit(input: {
  organizationId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({ data: { ...input, metadata: input.metadata as object } });
  } catch {
    /* la auditoría nunca debe romper el flujo principal */
  }
}
