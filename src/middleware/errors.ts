// src/middleware/errors.ts
import type { ErrorRequestHandler, Request, RequestHandler, Response } from "express";

const isDev = process.env.NODE_ENV === "dev";

// Kleine helper: veilig checken of iets een dictionary is
const isDict = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** 404-handler */
export const notFound: RequestHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ error: "not_found", ok: false });
};

/** 500-/error-handler (laatste middleware) */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req: Request, res: Response) => {
  // Basis error (garandeer een Error) + optionele PG/domeinvelden uit err zelf
  const baseErr = err instanceof Error ? err : new Error(String(err));
  const dict = isDict(err) ? err : undefined;

  const code = typeof dict?.code === "string" ? dict.code : undefined;
  const detail = typeof dict?.detail === "string" ? dict.detail : undefined;
  const hint = typeof dict?.hint === "string" ? dict.hint : undefined;

  // Altijd server-side loggen (keys alfabetisch i.v.m. perfectionist/sort-objects)

  console.error("[api:error]", {
    code,
    detail,
    hint,
    message: baseErr.message,
    stack: baseErr.stack,
  });

  // Bekende PG/conflict/domein fouten → nette status
  if (code === "23505") {
    return res.status(409).json({ error: "conflict", message: baseErr.message, ok: false });
  }
  if (code === "23503") {
    return res.status(422).json({ detail, error: "fk_violation", message: baseErr.message, ok: false });
  }
  if (code === "22P02") {
    return res.status(400).json({ error: "invalid_text_representation", message: baseErr.message, ok: false });
  }

  // In development: meer context teruggeven
  if (isDev) {
    return res.status(500).json({
      code,
      detail,
      error: "internal",
      hint,
      message: baseErr.message || "Unexpected error",
      ok: false,
    });
  }

  // In productie: sobere fout
  return res.status(500).json({ error: "internal", message: "Unexpected error", ok: false });
};
