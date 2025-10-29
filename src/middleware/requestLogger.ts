import type { Request, RequestHandler, Response } from 'express';
import morgan from "morgan";

// Max lengte voor body/query in logs (voorkomt spam)
const MAX_LEN = Number.parseInt(process.env.DEBUG_HTTP_MAXLEN ?? '600', 10);

const isRecord = (v: unknown): v is Record<string, unknown> =>
typeof v === 'object' && v !== null && !Array.isArray(v);

function limit(str: null | string | undefined): string {
    if (!str) return '';
    return str.length > MAX_LEN ? `${str.slice(0, MAX_LEN)}…` : str;
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
function redact<T>(obj: T): T {
    if (!isRecord(obj)) return obj;
    const SENSITIVE = ['password', 'pass', 'token', 'authorization', 'apikey', 'apiKey', 'secret'];
    const clone: Record<string, unknown> = JSON.parse(JSON.stringify(obj));
    for (const k of Object.keys(clone)) {
        if (SENSITIVE.includes(k.toLowerCase())) clone[k] = '[REDACTED]';
    }
    return clone as unknown as T;
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

function safeJson(obj: unknown): string {
    try {
        return JSON.stringify(obj);
    } catch {
        return '{}';
    }
}

// Tokens getypeerd met Express' Request/Response via de generics van morgan.token
morgan.token<Request, Response>('qid', (req) => String(req.headers['x-request-id'] ?? '-'));
morgan.token<Request, Response>('query', (req) => {
    const q = isRecord(req.query) ? req.query : {};
    return limit(safeJson(redact(q)));
});
morgan.token<Request, Response>('body', (req) => {
    // eslint-disable-next-line
    const b = isRecord((req as Request).body) ? (req as Request).body : (req as Request).body ?? {};
    return limit(safeJson(redact(b)));
});

export const requestLogger: RequestHandler =
    process.env.DEBUG_HTTP === '1'
        ? morgan(':method :url :status :response-time ms id=:qid query=:query body=:body')
        : morgan('tiny');
