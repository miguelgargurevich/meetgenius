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

1. **Crear reunión** → 2. **Grabar** (pausar/reanudar) → 3. Al finalizar, el pipeline transcribe (Whisper) y **analiza con Groq** → 4. Se generan **resumen, tareas, acuerdos, riesgos, próximos pasos, sentimiento** → 5. **Exportar** PDF/Excel → 6. **Ask MeetGenius**: pregunta en lenguaje natural sobre tu historial.

### Captura de audio (micrófono + sistema)

- **En el navegador** (`npm run dev`): se graba **solo tu micrófono** (límite de la plataforma web).
- **En la app de escritorio** (`npm run desktop`): se captura **tu micrófono + el audio del sistema** (las voces de los demás en Meet/Teams), mezclados en una sola pista. En macOS usa **ScreenCaptureKit** vía Electron — la primera vez pide permiso de **Grabación de pantalla** (Ajustes del Sistema → Privacidad y seguridad → Grabación de pantalla). Sin ese permiso, degrada a solo micrófono y te avisa en la UI.

### Autodetección de llamadas (escritorio)

MeetGenius detecta automáticamente cuándo entras a una **videollamada** y te ofrece grabarla:

- **Google Meet** y **Teams web**: lee la URL de las pestañas del navegador (Chrome, Edge, Brave, Arc, Safari…) buscando el patrón de "en llamada".
- **Zoom / Teams escritorio**: inspecciona el título de la ventana de la app.
- Un *poller* en Electron consulta cada ~7s. Al detectar una llamada, muestra un aviso **"Reunión detectada en X — ¿Grabar?"**. Si activas **Auto-grabar** (botón en la barra superior), la graba sin preguntar.

**Permisos macOS** (se piden una vez): *Automatización* (leer la URL del navegador) y *Accesibilidad* (títulos de ventana de Zoom/Teams). Sin ellos, la autodetección queda inactiva pero la grabación manual sigue funcionando.

### Integración de calendario (escritorio)

MeetGenius lee tu **calendario de macOS** vía **EventKit** — esto cubre de una sola vez todas las cuentas que tengas agregadas en Calendario.app (iCloud, **Google**, **Microsoft 365 / Outlook**), sin OAuth.

- **Agenda de hoy** en el dashboard: tus reuniones del día, con detección del enlace de videollamada (Meet/Teams/Zoom/Webex) y botón **Grabar** por evento.
- Al **autodetectar** una llamada, MeetGenius cruza con el evento en curso para usar su **título e invitados reales** (en vez de un nombre genérico).
- **Permiso macOS**: *Calendarios* (Ajustes del Sistema → Privacidad y seguridad → Calendarios → MeetGenius). Sin él, la agenda queda inactiva pero todo lo demás funciona.

> Requisito: tener la cuenta (p. ej. Outlook/Microsoft 365) agregada en **Calendario.app** del Mac. Integración OAuth directa con Google/Microsoft Graph queda en el roadmap.

### Recordatorios nativos (escritorio)

MeetGenius te avisa con una **notificación nativa de macOS** ~2 min antes de cada reunión con videollamada de tu agenda. Al hacer **clic** en la notificación, la app se enfoca y **empieza a grabar** ese evento (con su título e invitados reales). Se activa/desactiva con el botón **Recordatorios** de la barra superior.

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
