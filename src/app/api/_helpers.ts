import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { toErrorResponse, ValidationError } from "@/lib/errors";

/** Envuelve un handler con manejo centralizado de errores → ApiResult. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof ZodError) {
      const ve = new ValidationError("Datos inválidos", err.flatten());
      const { status, body } = toErrorResponse(ve);
      return NextResponse.json(body, { status });
    }
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
