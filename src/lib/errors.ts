/**
 * Jerarquía de errores de aplicación + manejo centralizado.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = "INTERNAL",
    public readonly status: number = 500,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(`${entity}${id ? ` (${id})` : ""} no encontrado`, "NOT_FOUND", 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly issues?: unknown) {
    super(message, "VALIDATION", 422);
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "AI_PROVIDER", 502, cause);
  }
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; issues?: unknown } };

export function toErrorResponse(err: unknown): {
  status: number;
  body: ApiResult<never>;
} {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          issues: err instanceof ValidationError ? err.issues : undefined,
        },
      },
    };
  }
  return {
    status: 500,
    body: { ok: false, error: { code: "INTERNAL", message: "Error interno" } },
  };
}
