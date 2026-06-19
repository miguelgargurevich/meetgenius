import { prisma } from "@/lib/db";

/**
 * Contexto de tenant. El MVP usa una organización + usuario por defecto
 * (single-tenant). La firma ya admite multiempresa para el futuro SaaS.
 */
const DEFAULT_ORG_SLUG = "default";

let cachedOrgId: string | null = null;

export async function getCurrentOrg(): Promise<{ id: string; userId: string }> {
  if (cachedOrgId) {
    const user = await prisma.user.findFirst({
      where: { organizationId: cachedOrgId },
      select: { id: true },
    });
    if (user) return { id: cachedOrgId, userId: user.id };
  }

  let org = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
    include: { users: { take: 1 } },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Mi Organización",
        slug: DEFAULT_ORG_SLUG,
        vocabulary: [],
        users: {
          create: {
            email: "demo@meetgenius.app",
            name: "Usuario Demo",
            role: "OWNER",
          },
        },
      },
      include: { users: { take: 1 } },
    });
  } else {
    // Sanitizar vocabulary por si quedó NULL/vacío de migraciones previas
    if (org.vocabulary === null || org.vocabulary === undefined || org.vocabulary === "") {
      await prisma.organization.update({
        where: { id: org.id },
        data: { vocabulary: [] },
      });
    }
  }

  cachedOrgId = org.id;
  return { id: org.id, userId: org.users[0]!.id };
}
