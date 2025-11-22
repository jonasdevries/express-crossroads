// src/routes/assetsRoutes.ts
import { Router, type Request, type Response } from "express";
import { query } from "#db/db.js";
import { getEnumLabels } from "#db/enums.js";
import { requireAuth } from "#middleware/auth.js";
import {
    AssetRow,
    AssetDetailDto,
    AssetPostBodyDto,
} from "#models/asset.js";

const router = Router();

/**
 * 📘 GET /assets?search=&ticker=&type=&limit=20&offset=0
 */
router.get(
    "/",
    async (req: Request, res: Response): Promise<Response> => {
        const search =
            typeof req.query.search === "string" ? req.query.search.trim() : "";
        const ticker =
            typeof req.query.ticker === "string"
                ? req.query.ticker.trim().toUpperCase()
                : "";
        const typeQ =
            typeof req.query.type === "string" ? req.query.type.trim() : "";

        // Limit/offset robuust parsen en clampen
        const rawLimit = req.query.limit;
        const rawOffset = req.query.offset;

        let limit = 20;
        let offset = 0;

        if (typeof rawLimit === "string") {
            const n = Number(rawLimit);
            if (Number.isFinite(n)) {
                limit = n;
            }
        }

        if (typeof rawOffset === "string") {
            const n = Number(rawOffset);
            if (Number.isFinite(n)) {
                offset = n;
            }
        }

        limit = Math.min(100, Math.max(1, limit));
        offset = Math.max(0, offset);

        const where: string[] = [];
        const params: unknown[] = [];
        const $ = (i: number) => `$${String(i)}`;

        // Vrije zoekterm over meerdere kolommen
        if (search) {
            const i = params.push(`%${search}%`);
            where.push(
                `(a.ticker ILIKE ${$(i)} OR a.name ILIKE ${$(i)} OR a.unique_symbol ILIKE ${$(i)})`,
            );
        }

        // Exacte ticker
        if (ticker) {
            const i = params.push(ticker);
            where.push(`a.ticker = ${$(i)}`);
        }

        // Enum type (valideren tegen Postgres enum)
        if (typeQ) {
            try {
                const allowed = await getEnumLabels("asset_type"); // string[]
                const match = allowed.find(
                    (v) => v.toLowerCase() === typeQ.toLowerCase(),
                );

                if (!match) {
                    return res.status(400).json({
                        error: "Validatiefout: ongeldige asset type",
                        allowed,
                        received: typeQ,
                    });
                }

                const i = params.push(match);
                where.push(`a.type = ${$(i)}::public.asset_type`);
            } catch (err) {
                if (process.env.DEBUG_HTTP === "1") {
                    console.error("[assets:get:type:error]", err);
                }
                return res.status(500).json({
                    error: "Interne fout bij ophalen van toegestane asset types",
                });
            }
        }

        const limitIndex = params.push(limit);
        const offsetIndex = params.push(offset);

        const sql = `
            SELECT a.id, a.type, a.ticker, a.name, a.quote_ccy, a.mic, a.unique_symbol
            FROM public.assets a
                ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
            ORDER BY a.name ASC
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `;

        try {
            const { rows } = await query<AssetRow>(sql, params);
            return res.json({
                message: "Assets succesvol opgehaald",
                data: rows,
            });
        } catch (err) {
            if (process.env.DEBUG_HTTP === "1") {
                console.error("[assets:get:error]", err);
            }
            return res.status(500).json({
                error: "Interne fout in GET /assets",
            });
        }
    },
);

/**
 * 📗 GET /assets/:id  (+listings)
 */
router.get(
    "/:id",
    async (
        req: Request<{ id: string }>,
        res: Response,
    ): Promise<Response> => {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res
                .status(400)
                .json({ error: `Validatiefout: ongeldige asset id ${id}` });
        }

        const sql = `
            SELECT a.*,
                   COALESCE(
                           (SELECT json_agg(li ORDER BY li.mic)
                            FROM public.listings li
                            WHERE li.asset_id = a.id),
                           '[]'::json
                   ) AS listings
            FROM public.assets a
            WHERE a.id = $1
        `;

        try {
            const { rows } = await query<AssetDetailDto>(sql, [id]);

            if (rows.length === 0) {
                return res
                    .status(404)
                    .json({ error: `Niet gevonden: asset met id=${id}` });
            }

            return res.json({
                message: "Asset succesvol opgehaald",
                data: rows[0],
            });
        } catch (err) {
            if (process.env.DEBUG_HTTP === "1") {
                console.error("[assets:getById:error]", err);
            }
            return res.status(500).json({
                error: "Interne fout in GET /assets/:id",
            });
        }
    },
);

/**
 * 📙 POST /assets
 */
router.post(
    "/",
    requireAuth,
    async (
        req: Request<unknown, unknown, AssetPostBodyDto>,
        res: Response,
    ): Promise<Response> => {
        const { type, ticker, name, quote_ccy, mic, unique_symbol } = req.body;

        // normaliseer NIET vooraf; eerst raw valideren
        const rawName = typeof name === "string" ? name.trim() : "";
        const rawTicker = typeof ticker === "string" ? ticker.trim() : "";
        const rawMic = typeof mic === "string" ? mic.trim() : "";
        const rawCcy = typeof quote_ccy === "string" ? quote_ccy.trim() : "";
        const rawUsym =
            typeof unique_symbol === "string" ? unique_symbol.trim() : "";
        const rawType = typeof type === "string" ? type.trim() : "";

        // basis checks
        if (!rawName || !rawCcy || !rawType) {
            return res.status(400).json({
                error: "Validatiefout: naam, type en quote_ccy zijn verplicht",
            });
        }

        // Strikte uppercase-validatie ZONDER vooraf uppercase te doen
        if (!/^[A-Z]{3}$/.test(rawCcy)) {
            return res.status(400).json({
                error:
                    "Validatiefout: quote_ccy moet 3 hoofdletters zijn (bv. EUR, USD)",
            });
        }

        // overige checks
        if (rawMic && !/^[A-Z0-9]{4}$/.test(rawMic)) {
            return res.status(400).json({
                error: "Validatiefout: mic moet 4 tekens (A-Z/0-9), bv. XNYS",
            });
        }

        if (rawTicker && !/^[A-Z0-9.-]{1,10}$/.test(rawTicker)) {
            return res.status(400).json({
                error:
                    "Validatiefout: ongeldige ticker (max 10, A-Z/0-9/./-)",
            });
        }

        // Pas NA validatie normaliseren voor opslag
        let dbType: string;
        try {
            const allowed = await getEnumLabels("asset_type");
            const match = allowed.find(
                (v) => v.toLowerCase() === rawType.toLowerCase(),
            );

            if (!match) {
                return res.status(400).json({
                    error: "Validatiefout: ongeldige asset type",
                    allowed,
                    received: rawType,
                });
            }

            dbType = match; // exact enum label uit DB
        } catch (err) {
            if (process.env.DEBUG_HTTP === "1") {
                console.error("[assets:post:type:error]", err);
            }
            return res.status(500).json({
                error: "Interne fout bij ophalen van toegestane asset types",
            });
        }

        const dbName = rawName;
        const dbTicker = rawTicker ? rawTicker.toUpperCase() : null;
        const dbMic = rawMic ? rawMic.toUpperCase() : null;
        const dbCcy = rawCcy; // al uppercase vanwege regex
        const dbUsym = rawUsym || null;

        try {
            const sql = dbUsym
                ? `
                        INSERT INTO public.assets (type, ticker, name, quote_ccy, mic, unique_symbol)
                        VALUES ($1::public.asset_type, $2, $3, $4, $5, $6)
                        ON CONFLICT (unique_symbol) DO NOTHING
                        RETURNING id, type, ticker, name, quote_ccy, mic, unique_symbol
                `
                : `
                        INSERT INTO public.assets (type, ticker, name, quote_ccy, mic, unique_symbol)
                        VALUES ($1::public.asset_type, $2, $3, $4, $5, $6)
                        RETURNING id, type, ticker, name, quote_ccy, mic, unique_symbol
                `;

            const params: unknown[] = [
                dbType,
                dbTicker,
                dbName,
                dbCcy,
                dbMic,
                dbUsym,
            ];

            const { rows } = await query<AssetRow>(sql, params);

            if (dbUsym && rows.length === 0) {
                return res.status(409).json({
                    error: "Conflict: asset met dit unique_symbol bestaat al",
                });
            }

            const row = rows[0];
            return res
                .status(201)
                .set("Location", `/assets/${row.id}`)
                .json({
                    message: "Asset succesvol aangemaakt",
                    data: row,
                });
        } catch (error) {
            const err = error as {
                code?: string;
                detail?: string;
                message?: string;
            };

            if (process.env.DEBUG_HTTP === "1") {
                console.error("[assets:post:error]", {
                    code: err.code,
                    detail: err.detail,
                    message: err.message,
                });
            }

            if (err.code === "22P02" && /asset_type/i.test(err.message ?? "")) {
                const allowedTypes = await getEnumLabels("asset_type");
                return res.status(400).json({
                    error: "Validatiefout: ongeldige asset type",
                    allowed: allowedTypes,
                    detail: err.message,
                });
            }

            if (err.code === "23505") {
                return res.status(409).json({
                    error: "Conflict: asset bestaat al",
                    detail: err.detail,
                });
            }

            if (err.code === "23503") {
                // FK violation (bv. onbekende valuta)
                return res.status(422).json({
                    error: "FK violation",
                    detail: err.detail,
                });
            }

            return res.status(500).json({
                error: "Interne fout in POST /assets",
            });
        }
    },
);

/**
 * 📕 DELETE /assets/:id
 */
router.delete(
    "/:id",
    requireAuth,
    async (
        req: Request<{ id: string }>,
        res: Response,
    ): Promise<Response> => {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res
                .status(400)
                .json({ error: `Validatiefout: ongeldige asset id ${id}` });
        }

        try {
            const del = await query<AssetRow>(
                "DELETE FROM public.assets WHERE id = $1 RETURNING id, type, ticker, name, quote_ccy, mic, unique_symbol",
                [id],
            );

            if (del.rowCount === 0) {
                return res
                    .status(404)
                    .json({ error: `Niet gevonden: asset met id=${id}` });
            }

            return res.json({
                message: `Asset met id=${id} is verwijderd`,
                data: del.rows[0],
            });
        } catch (err) {
            if (process.env.DEBUG_HTTP === "1") {
                console.error("[assets:delete:error]", err);
            }
            return res.status(500).json({
                error: "Interne fout in DELETE /assets/:id",
            });
        }
    },
);

export default router;
