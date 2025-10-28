import type { RequestHandler } from "express";

import db from "#db/db.js";

interface DbNowRow {
  now: string;
} // adjust to `Date` if you use pg type parsers
interface ErrorResponse {
  details: string;
  status: "error";
}
interface OkResponse {
  status: "ok";
  time: string;
}

export const health: RequestHandler<
  Record<string, never>, // Params
  ErrorResponse | OkResponse // ResBody
> = async (_req, res) => {
  try {
    const result = await db.query<DbNowRow>("SELECT NOW()");
    const time = result.rows[0]?.now ?? "";
    res.json({ status: "ok", time: time });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Database connection error:", err);
    res.status(500).json({ details: message, status: "error" });
  }
};
