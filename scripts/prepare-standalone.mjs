// Prepara el bundle `.next/standalone` para empaquetarlo con Electron.
// Copia los assets y dependencias que el tracing de Next puede no incluir:
//  - .next/static  → standalone/.next/static
//  - public        → standalone/public
//  - prisma/       → standalone/prisma (schema)
//  - node_modules/.prisma y @prisma/client → standalone/node_modules (motor)
//  - .env (si existe) → standalone/.env (config runtime: claves, DATABASE_URL)

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error("✖ No existe .next/standalone. Ejecuta `next build` primero.");
  process.exit(1);
}

function copy(from, to, label) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.warn(`  · omitido (no existe): ${from}`);
    return;
  }
  const dest = join(standalone, to);
  mkdirSync(join(dest, ".."), { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: true });
  console.log(`  ✓ ${label}`);
}

console.log("📦 Preparando bundle standalone…");
copy(".next/static", ".next/static", "assets estáticos");
copy("public", "public", "public/");
copy("prisma", "prisma", "prisma schema");
copy("node_modules/.prisma", "node_modules/.prisma", "motor Prisma (.prisma)");
copy("node_modules/@prisma/client", "node_modules/@prisma/client", "@prisma/client");
copy(".env", ".env", ".env (config runtime)");
console.log("✅ Standalone listo para empaquetar.");
