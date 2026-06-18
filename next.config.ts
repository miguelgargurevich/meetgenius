import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor "standalone": Electron lo arranca internamente en producción
  // (la app necesita las API Routes + Prisma, por lo que NO usamos export estático).
  output: "standalone",
  images: { unoptimized: true },
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
  // Garantiza que el motor de Prisma y el schema entren en el bundle standalone.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/.prisma/client/**",
      "./node_modules/@prisma/client/**",
      "./prisma/**",
    ],
  },
};

export default nextConfig;
