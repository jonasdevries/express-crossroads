// src/db/db.ts
import { Pool, type PoolConfig, type QueryConfig, type QueryResult, type QueryResultRow } from "pg";
import dotenv from "dotenv";
import fs from "fs";


// Hou de pool in module-scope bij (lazy init).
let pool: null | Pool = null;

type PgDatabaseError = Error & {
  code?: string;
  column?: string;
  constraint?: string;
  dataType?: string;
  detail?: string;
  hint?: string;
  schema?: string;
  table?: string;
};

/**
 * Sluit de pool netjes af (handig in tests of bij graceful shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Haal (of initialiseer) de gedeelde Pool op.
 * Zorgt voor 1 pool per proces, en logt pool-level errors.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildConfig());

    const dbUrl = process.env.DATABASE_URL ?? "undefined";
    // Alleen loggen tijdens tests
    if (process.env.NODE_ENV === "test") {
        console.log("🔌 DB config (tests):", {
            url: dbUrl,
            env: process.env.NODE_ENV,
        });
    }
    pool.on("error", (err) => {
      console.error("[pg pool error]", err);
    });
  }
  return pool;
}

/**
 * Type-veilige query helper met overloads.
 * - Gebruik generics om je row-shape te typen: query<User>('SELECT ...')
 * - `text` kan een string of QueryConfig zijn.
 */
export async function query<T extends QueryResultRow>(textOrConfig: QueryConfig | string, params?: readonly unknown[]): Promise<QueryResult<T>> {
  const p = getPool();
  const t0 = Date.now();

  try {
    const res = await (typeof textOrConfig === "string" ? p.query<T>(textOrConfig, params ? [...params] : undefined) : p.query<T>(textOrConfig));

    if (process.env.DEBUG_SQL === "1") {
      console.log("[sql]", {
        ms: Date.now() - t0,
        params: typeof textOrConfig === "string" ? params : textOrConfig.values,
        rows: res.rowCount,
        text: typeof textOrConfig === "string" ? textOrConfig : textOrConfig.text,
      });
    }

    return res;
  } catch (err: unknown) {
    const e = err as PgDatabaseError;
    console.error("[sql:error]", {
      code: e.code,
      constraint: e.constraint,
      detail: e.detail,
      hint: e.hint,
      message: e.message,
      ms: Date.now() - t0,
      params: typeof textOrConfig === "string" ? params : textOrConfig.values,
      stack: e.stack,
      table: e.table,
      text: typeof textOrConfig === "string" ? textOrConfig : textOrConfig.text,
    });
    throw err;
  }
}

/**
 * Bouwt de Pool-config op basis van env variabelen.
 * Gooit een duidelijke fout als DATABASE_URL ontbreekt.
 */
function buildConfig(): PoolConfig {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is undefined. Zet deze in je .env(.test) en zorg dat dotenv/config of tsx --env-file geladen wordt.");
  }
  const cfg: PoolConfig = { connectionString: url };
  const wantSsl = process.env.DATABASE_SSL === "1" || process.env.PGSSLMODE === "require";
  // pg verwacht boolean of tls opties; dit is de gangbare “Heroku-style” setting
  if (wantSsl) {
    cfg.ssl = { rejectUnauthorized: false };
  }
  return cfg;
}

function resolveEnvFile(): string {
    switch (process.env.NODE_ENV) {
        case "test":
            return ".env.test";
        case "development":
            return fs.existsSync(".env.local") ? ".env.local" : ".env";
        default:
            return ".env";
    }
}

dotenv.config({ path: resolveEnvFile() });

export default { closePool, query };
