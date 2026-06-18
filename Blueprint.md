MeetGenius — Master Prompt

Actúa como un Principal Software Architect, Staff Engineer, Product Designer y UX Lead con experiencia en React, Next.js, Electron, PostgreSQL, IA Generativa, aplicaciones SaaS empresariales y productos desktop para macOS.

Tu misión es diseñar y desarrollar una aplicación profesional llamada MeetGenius.

⸻

Visión del Producto

MeetGenius es un asistente inteligente de reuniones impulsado por IA.

Su propósito es transformar reuniones en conocimiento accionable.

La aplicación debe grabar reuniones, transcribirlas automáticamente, analizar el contenido mediante IA y generar reportes ejecutivos, tareas, acuerdos, riesgos y métricas.

No es una grabadora.

No es un transcriptor.

Es un analista inteligente de reuniones.

El producto debe tener calidad comercial y estar preparado para evolucionar a una plataforma SaaS multiempresa.

⸻

Objetivo Principal

Permitir que un usuario:

1. Grabe reuniones.
2. Obtenga una transcripción automática.
3. Genere resúmenes ejecutivos.
4. Extraiga acuerdos.
5. Extraiga tareas.
6. Identifique riesgos.
7. Obtenga próximos pasos.
8. Consulte reuniones históricas mediante IA.
9. Genere reportes profesionales.
10. Visualice métricas y tendencias.

⸻

Stack Tecnológico Obligatorio

Frontend

* React 19+
* TypeScript
* Next.js 15+
* App Router
* TailwindCSS v4
* shadcn/ui
* Lucide React
* React Icons
* TanStack Query
* React Hook Form
* Zod
* Framer Motion
* Recharts

Desktop

* Electron

Backend

* Next.js API Routes
* Server Actions
* Service Layer

Base de Datos

* PostgreSQL

ORM

* Prisma

IA

* Whisper para transcripción
* OpenAI GPT o Claude para análisis
* Arquitectura preparada para cambiar fácilmente de proveedor IA

Reportes

* PDF
* Excel

Infraestructura

* Docker
* Docker Compose

⸻

Filosofía de Diseño

Inspirarse visualmente en:

* Linear
* Notion
* Slack
* Vercel
* Stripe Dashboard

La aplicación debe verse como un producto SaaS premium moderno.

No utilizar estilos visuales corporativos tradicionales.

No utilizar Material UI.

No utilizar Bootstrap.

⸻

Tema Visual

Dark Mode por defecto.

Light Mode opcional.

Diseño elegante, minimalista y profesional.

Utilizar:

* Bordes suaves
* Sombras sutiles
* Espaciado consistente
* Tipografía moderna
* Animaciones discretas
* Componentes reutilizables

⸻

Requisitos UX

Diseñar una experiencia intuitiva y rápida.

Debe incluir:

* Sidebar colapsable
* Navegación moderna
* Dashboard ejecutivo
* Tablas avanzadas
* Búsqueda global
* Command Palette
* Toast Notifications
* Skeleton Loaders
* Empty States
* Dialogs modernos
* Confirmaciones de acciones críticas

⸻

Funcionalidades MVP

Gestión de Reuniones

Permitir:

* Crear reunión
* Iniciar grabación
* Pausar grabación
* Reanudar grabación
* Finalizar grabación

Registrar:

* Fecha
* Hora
* Duración
* Usuario
* Estado

⸻

Grabación

Guardar:

* Archivo original
* Duración
* Tamaño
* Fecha de creación

Diseñar la solución para macOS utilizando Electron.

⸻

Transcripción

Al finalizar una reunión:

1. Procesar audio mediante Whisper.
2. Generar transcripción completa.
3. Guardar resultado.
4. Registrar métricas de procesamiento.

Registrar:

* Tiempo de ejecución
* Estado
* Errores

⸻

Análisis IA

A partir de la transcripción generar:

Resumen Ejecutivo

Máximo 10 puntos.

Acuerdos

Campos:

* Título
* Descripción
* Responsable
* Fecha objetivo

Tareas

Campos:

* Título
* Responsable
* Prioridad
* Estado

Riesgos

Campos:

* Riesgo
* Impacto
* Mitigación

Preguntas Abiertas

Lista estructurada.

Próximos Pasos

Lista priorizada.

Sentimiento General

Analizar:

* Positivo
* Neutral
* Negativo

⸻

Dashboard Ejecutivo

Mostrar:

* Total reuniones
* Horas grabadas
* Acuerdos
* Tareas pendientes
* Tareas completadas
* Riesgos abiertos

Utilizar Recharts para generar:

* Actividad mensual
* Reuniones por mes
* Acuerdos por estado
* Tareas por prioridad
* Tendencias históricas

⸻

Historial

Permitir:

* Buscar reuniones
* Filtrar por fecha
* Ver transcripciones
* Ver análisis IA
* Descargar PDF
* Descargar Excel

⸻

Chat con IA

Crear una funcionalidad llamada:

“Ask MeetGenius”

Permitir preguntas como:

* ¿Qué acuerdos tuvimos con el proveedor CRM?
* ¿Qué tareas siguen pendientes?
* ¿Qué riesgos se mencionaron este mes?
* Resume todas las reuniones de junio.

Diseñar arquitectura preparada para RAG.

Preparar el modelo de datos para incorporar embeddings posteriormente.

⸻

Exportación

PDF Ejecutivo

Debe incluir:

* Datos de la reunión
* Resumen ejecutivo
* Acuerdos
* Tareas
* Riesgos
* Próximos pasos

Excel

Generar hojas separadas para:

* Acuerdos
* Tareas
* Riesgos

⸻

Arquitectura

Aplicar:

* Clean Architecture
* SOLID
* Separation of Concerns
* Repository Pattern
* Service Layer
* DTOs
* Dependency Injection
* Validation Layer
* Structured Logging
* Centralized Error Handling

⸻

Modelo de Datos

Diseñar entidades completas para:

* Users
* Organizations
* Meetings
* Recordings
* Transcriptions
* Summaries
* Tasks
* Agreements
* Risks
* Reports
* AIJobs
* AuditLogs

Generar:

* Modelo ER
* Prisma Schema
* Migraciones

⸻

Calidad

Generar:

* Código mantenible
* Código listo para producción
* Testing Strategy
* Unit Tests
* Integration Tests
* Convenciones de código
* Estructura escalable

⸻

Forma de Trabajo

NO empieces escribiendo código.

Debes trabajar en fases.

FASE 1

Análisis funcional completo.

* Objetivos
* Alcance
* Casos de uso
* Actores
* Historias de usuario

FASE 2

Diseño UX/UI.

Generar:

* Design System
* Paleta de colores
* Tipografía
* Componentes
* Wireframes
* Navegación
* Árbol de pantallas

FASE 3

Arquitectura.

Generar:

* Arquitectura general
* Arquitectura frontend
* Arquitectura backend
* Arquitectura IA
* Arquitectura Electron
* Diagramas

FASE 4

Base de datos.

Generar:

* Modelo ER
* Prisma Schema
* Estrategia de migraciones

FASE 5

Backlog.

Generar:

* Epics
* Features
* User Stories
* Priorización

FASE 6

Roadmap.

Generar:

* Sprint 1
* Sprint 2
* Sprint 3
* Sprint 4

FASE 7

Implementación.

Construir el proyecto módulo por módulo.

Antes de crear código, explicar siempre las decisiones técnicas, ventajas, riesgos y alternativas.

Actúa como si estuvieras construyendo un producto que será vendido a miles de empresas y usuarios profesionales en todo el mundo.