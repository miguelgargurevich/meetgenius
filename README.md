# MeetGenius

> Asistente inteligente de reuniones impulsado por IA. Graba, transcribe, analiza y convierte tus reuniones en conocimiento accionable: resúmenes ejecutivos, tareas, acuerdos, riesgos y reportes.

App de escritorio (Electron + macOS) construida sobre Next.js 15, con análisis IA vía **Groq** y transcripción vía **Whisper** (Groq). Base de datos **SQLite embebida** (sin Docker).

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
| DB / ORM        | SQLite embebido + Prisma                              |
| IA — análisis   | Groq (Llama) · capa abstraída (Gemini / Grok / OpenAI / mock) |
| IA — transcripción | Whisper vía Groq (o OpenAI) · mock                 |
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
- Node.js 20+ (no necesitas Docker ni base de datos externa: SQLite embebido)

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de entorno
```bash
cp .env.example .env
```
Edita `.env`:
- `GROQ_API_KEY` → tu clave de Groq (análisis con Llama + transcripción Whisper). Sin ella, la app usa proveedores **mock**.
- `GEMINI_API_KEY` → opcional, proveedor alternativo.

> La app **funciona sin claves**: usa proveedores mock para que puedas probar el flujo completo end-to-end.

### 4. Base de datos (SQLite embebido — sin Docker)
```bash
npm run db:push              # crea el archivo SQLite (prisma/dev.db) con el esquema
npm run db:seed              # datos de demostración (opcional)
```
La base de datos es un **único archivo SQLite** — no necesitas Docker ni servidor. En la app empaquetada, la DB vive en el directorio de datos del usuario y se inicializa sola en el primer arranque.

### 5. Ejecutar

**Web (navegador):**
```bash
npm run dev          # http://localhost:3000
```

**Desktop (Electron):**
```bash
npm run desktop      # arranca Next + abre la ventana de Electron
```

### 6. Empaquetar e instalar la app de escritorio (macOS)

```bash
npm run build:desktop   # genera los .dmg en release/ (arm64 + Intel x64)
```

El build: compila Next en modo **standalone**, copia los estáticos + **schema y motor de Prisma** + tu `.env` al bundle (`scripts/prepare-standalone.mjs`), y empaqueta con electron-builder. El servidor Next se incrusta como `extraResources` y Electron lo arranca al abrir la app.

**Instalar y abrir:**
1. Abre el `.dmg` de tu arquitectura (`-arm64` para Apple Silicon, `-x64` para Intel) y arrastra **MeetGenius** a Aplicaciones.
2. La app **no está firmada con cuenta de desarrollador** (build local), así que Gatekeeper la bloqueará la primera vez: **clic derecho sobre la app → Abrir → Abrir**. (O Ajustes del Sistema → Privacidad y seguridad → "Abrir igualmente".)
3. **No necesita nada externo**: la base de datos SQLite viaja dentro de la app y se crea sola en el primer arranque (en el directorio de datos del usuario). El `.env` empaquetado incluye tus claves de IA.

**Permisos que pedirá macOS la primera vez** (acéptalos todos para el flujo completo):
- 🎙 **Micrófono** — grabar tu voz
- 🖥 **Grabación de pantalla** — capturar el audio del sistema (voces de los demás)
- 📅 **Calendarios** — agenda del día
- ⚙️ **Automatización** (Chrome/Safari…) — autodetectar llamadas Meet/Teams
- 🔔 **Notificaciones** — recordatorios antes de reuniones

> Tras conceder **Grabación de pantalla** y **Accesibilidad**, reinicia la app (requisito de macOS para esos dos permisos).
>
> ⚠️ El `.dmg` local incrusta tu `.env` con las claves de IA: es para tu uso personal, **no lo distribuyas**. Para distribución real: firmar + notarizar con cuenta de Apple Developer y externalizar las claves.

## Flujo principal

1. **Crear reunión** → 2. **Grabar** (pausar/reanudar, con **transcripción en vivo**) → 3. Al finalizar, el pipeline transcribe (Whisper), **diariza** y **analiza con Groq** → 4. Se generan **resumen, tareas, acuerdos, riesgos, próximos pasos, sentimiento, capítulos, momentos clave y borrador de email de seguimiento** → 5. **Exportar** PDF/Excel → 6. **Ask MeetGenius**: pregunta en lenguaje natural sobre tu historial.

### Transcripción interactiva, diarización e insights

Inspirado en lo mejor de asistentes como Read AI, pero **local-first**:

- **Transcript interactivo** — la pestaña *Transcripción* sincroniza el audio con los segmentos de Whisper: **reproductor con click-to-seek** (clic en una línea salta a ese punto), resaltado del segmento en reproducción y **búsqueda** dentro del transcript. La ruta `GET /api/meetings/[id]/audio` sirve la grabación con soporte de `Range`.
- **Diarización «¿quién dijo qué?»** — tras transcribir, el modelo asigna un **hablante a cada segmento** (usando los participantes si se conocen); el transcript pinta cada hablante con su color y la pestaña *Participación* muestra el **talk-time** por persona. Es *best-effort*: si falla, el transcript sigue funcionando.
- **Transcripción en vivo** — con el toggle **En vivo**, mientras grabas se envían ventanas cortas (~12 s) a `POST /api/meetings/[id]/live` y verás el texto parcial en tiempo real. No afecta a la grabación final (que la procesa el pipeline completo).
- **Capítulos, momentos clave y email de seguimiento** — el análisis genera además una división por **temas** (con marca de tiempo clicable), **frases destacadas** y un **borrador de email** de seguimiento (copiar / abrir en tu cliente). Se guardan en el modelo `Insight`.

> Tras cambiar el esquema (modelo `Insight`), recuerda `npm run db:push` en dev y `npm run db:template` para refrescar la DB que viaja en la app empaquetada.

### Captura de audio (micrófono + sistema)

- **En el navegador** (`npm run dev`): se graba **solo tu micrófono** (límite de la plataforma web).
- **En la app de escritorio** (`npm run desktop`): se captura **tu micrófono + el audio del sistema** (las voces de los demás en Meet/Teams), mezclados en una sola pista. En macOS usa **ScreenCaptureKit** vía Electron — la primera vez pide permiso de **Grabación de pantalla** (Ajustes del Sistema → Privacidad y seguridad → Grabación de pantalla). Sin ese permiso, degrada a solo micrófono y te avisa en la UI.

### Autodetección de llamadas (escritorio)

MeetGenius detecta automáticamente cuándo entras a una **videollamada** y te ofrece grabarla:

- **Google Meet** y **Teams web**: lee la URL de las pestañas del navegador (Chrome, Edge, Brave, Arc, Safari…) buscando el patrón de "en llamada".
- **Zoom / Teams escritorio**: inspecciona el título de la ventana de la app.
- Un *poller* en Electron consulta cada ~7s. Al detectar una llamada, muestra un aviso **"Reunión detectada en X — ¿Grabar?"**. Si activas **Auto-grabar** (botón en la barra superior), la graba sin preguntar.

**Permisos macOS** (se piden una vez): *Automatización* (leer la URL del navegador) y *Accesibilidad* (títulos de ventana de Zoom/Teams). Sin ellos, la autodetección queda inactiva pero la grabación manual sigue funcionando.

### Integración de calendario (suscripción ICS)

MeetGenius se suscribe a tu calendario por su **URL `.ics`** y lo lee **en el servidor** (no por el sistema operativo), así que funciona igual en **dev, app empaquetada y web**, sin permisos de macOS.

- **Conectar**: en la sección *Calendario* → botón **Calendarios**. El modal tiene dos pestañas:
  - **Suscripción URL**: pega la URL `.ics` (se mantiene sincronizada). Soporta varias fuentes.
    - **Outlook / Microsoft 365**: Outlook Web → Configuración → Calendario → Calendarios compartidos → *Publicar calendario* → copia el enlace **ICS**.
    - **Google Calendar**: Configuración del calendario → Integrar calendario → *Dirección secreta en formato iCal*.
  - **Archivo .ics**: sube un `.ics` exportado de cualquier calendario. Sus eventos se **guardan** (el contenido del archivo se almacena como fuente) y aparecen en el calendario, con recurrencias y eventos de todo el día. No se re-sincroniza (es una instantánea del archivo). Además, los eventos **con videollamada** (Meet/Teams/Zoom/Webex) de los próximos 90 días se crean automáticamente como **reuniones** programadas (listas para grabar/analizar); el resto quedan solo como eventos del calendario. La importación deduplica por evento, así que reimportar el mismo `.ics` no crea reuniones repetidas.
- **Vista de Calendario**: mes y semana que unen en una sola vista tus **reuniones de la app** + los **eventos del calendario suscrito** (colores distintos, eventos recurrentes y de todo el día incluidos). Click en un día → crear; click en evento de la app → abrir; click en evento con videollamada → grabar.
- **Agenda de hoy** en el dashboard + **recordatorios nativos** antes de cada reunión, alimentados por la misma suscripción.
- **Sincronización**: automática (cada 5 min) + botón **Sincronizar** manual; caché de ~60s del feed.

> **Solo lectura**: ICS no permite escribir en el calendario externo, por lo que crear/editar una reunión en MeetGenius **no** se propaga al calendario de origen. Para escritura bidireccional en tiempo real, el roadmap contempla OAuth con Microsoft Graph / Google Calendar.

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
