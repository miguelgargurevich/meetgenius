/**
 * Structured logging mínimo, sin dependencias.
 * Emite JSON en producción y texto legible en desarrollo.
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const entry = { level, msg, ...meta, ts: new Date().toISOString() };
  if (process.env.NODE_ENV === "production") {
    console[level === "debug" ? "log" : level](JSON.stringify(entry));
  } else {
    const tag = { debug: "·", info: "ℹ", warn: "⚠", error: "✖" }[level];
    console[level === "debug" ? "log" : level](
      `${tag} ${msg}`,
      meta ? meta : "",
    );
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  child: (scope: string) => ({
    debug: (m: string, x?: Record<string, unknown>) => emit("debug", `[${scope}] ${m}`, x),
    info: (m: string, x?: Record<string, unknown>) => emit("info", `[${scope}] ${m}`, x),
    warn: (m: string, x?: Record<string, unknown>) => emit("warn", `[${scope}] ${m}`, x),
    error: (m: string, x?: Record<string, unknown>) => emit("error", `[${scope}] ${m}`, x),
  }),
};
