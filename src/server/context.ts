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
  }

  cachedOrgId = org.id;
  return { id: org.id, userId: org.users[0]!.id };
}
