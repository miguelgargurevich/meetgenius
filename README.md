# MeetGenius

> Asistente inteligente de reuniones impulsado por IA. Graba, transcribe, analiza y convierte tus reuniones en conocimiento accionable: resúmenes ejecutivos, tareas, acuerdos, riesgos y reportes.

App de escritorio (Electron + macOS) construida sobre Next.js 15, con análisis IA vía **Grok (xAI)** y transcripción vía **Whisper**.

---

## Stack

| Capa            | Tecnología                                            |
| --------------- | ----------------------------------------------------- |
| Frontend        | React 19, Next.js 15 (App Router), TailwindCSS v4     |
| UI              | Componentes propios estilo shadcn, Lucide, Framer     |
| Datos/Estado    | TanStack Query, React Hook Form, Zod                  |
| Gráficos        | Recharts                                              |
| Desktop         | Electron                                              |
| Backend         | Next API Routes + Service Layer (Clean Architecture)  |
| DB / ORM        | PostgreSQL + Prisma                                   |
| IA — análisis   | Grok (xAI) · capa abstraída (OpenAI / mock)           |
| IA — transcripción | Whisper (OpenAI) · mock                            |
| Reportes        | PDF (pdf-lib) · Excel (ExcelJS)                       |

## Arquitectura

```
src/
  app/                 # Rutas (App Router) + API Routes
    (app)/             # Shell con sidebar/topbar (dashboard, meetings, history, chat)
    api/               # Endpoints REST (meetings, recording, report, tasks, dashboard, chat)
  components/          # UI primitives + componentes de dominio
  hooks/               # React Query + grabación de audio
  lib/                 # db, env, logger, errores, IA (proveedores), dominio, utils
    ai/                # Abstracción de proveedores: Grok / OpenAI / mock + Whisper
  server/              # Capa de negocio
    services/          # meeting, analysis (pipeline), dashboard, chat, report, audit
    repositories/      # acceso a datos (vía Prisma)
prisma/                # schema + seed
electron/              # proceso principal + preload
```

Principios: Clean Architecture, separación de capas, Repository/Service pattern, DTOs (Zod), logging estructurado y manejo centralizado de errores. El modelo de datos está **preparado para RAG** (tabla `Embedding`, migrable a pgvector).

## Puesta en marcha

### 1. Requisitos
- Node.js 20+
- Docker (para PostgreSQL) — o un PostgreSQL local

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de entorno
```bash
cp .env.example .env
```
Edita `.env`:
- `XAI_API_KEY` → tu clave de xAI/Grok (para análisis real). Sin ella, la app usa un proveedor **mock** determinístico.
- `OPENAI_API_KEY` → necesaria para transcripción Whisper real. Sin ella, transcripción **mock**.

> La app **funciona sin claves**: usa proveedores mock para que puedas probar el flujo completo end-to-end.

### 4. Base de datos
```bash
docker compose up -d db      # levanta PostgreSQL
npm run db:push              # crea el esquema
npm run db:seed              # datos de demostración (opcional)
```

### 5. Ejecutar

**Web (navegador):**
```bash
npm run dev          # http://localhost:3000
```

**Desktop (Electron):**
```bash
npm run desktop      # arranca Next + abre la ventana de Electron
```

### 6. Empaquetar app de escritorio (macOS)
```bash
npm run build:desktop   # genera el .dmg en release/
```

## Flujo principal

1. **Crear reunión** → 2. **Grabar** (micrófono, pausar/reanudar) → 3. Al finalizar, el pipeline transcribe (Whisper) y **analiza con Grok** → 4. Se generan **resumen, tareas, acuerdos, riesgos, próximos pasos, sentimiento** → 5. **Exportar** PDF/Excel → 6. **Ask MeetGenius**: pregunta en lenguaje natural sobre tu historial.

## Cambiar de proveedor IA
Edita `.env`:
```
AI_PROVIDER=grok      # grok | openai | mock
```
La interfaz `LanguageProvider` (`src/lib/ai/types.ts`) desacopla el proveedor del resto de la app.

## Tests
```bash
npm test
```

## Scripts útiles
| Comando | Descripción |
| --- | --- |
| `npm run dev` | Next en desarrollo |
| `npm run desktop` | Next + Electron |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` | Chequeo de tipos |
| `npm run build` | Build de producción |
