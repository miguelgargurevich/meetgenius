import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite empaquetar la app dentro de Electron sin servidor Node externo.
  // En desarrollo usamos `next dev`; en producción desktop se sirve estático/standalone.
  output: process.env.ELECTRON_BUILD === "1" ? "export" : "standalone",
  images: { unoptimized: true },
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
  // Necesario para que Electron cargue assets con rutas relativas en build export.
  assetPrefix: process.env.ELECTRON_BUILD === "1" ? "." : undefined,
};

export default nextConfig;
