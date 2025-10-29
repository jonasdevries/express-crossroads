// src/routes/assetsRoutes.ts
import { Router, type Request, type Response } from 'express';
import { query } from '#db/db.js';
import { getEnumLabels } from '#db/enums.js';

const router = Router();

interface AssetRow {
    id: number;
    type: string;
    ticker: string | null;
    name: string;
    quote_ccy: string;
    mic: string | null;
    unique_symbol: string;
}

router.get('/', async (req: Request, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const ticker = typeof req.query.ticker === 'string' ? req.query.ticker.toUpperCase() : '';
    const typeQ  = typeof req.query.type === 'string' ? req.query.type : '';

    const where: string[] = [];
    const params: unknown[] = [];
    const $ = (i: number) => `$${String(i)}`; // placeholder helper (vermijdt restrict-template-expressions)

    // Vrije zoekterm over meerdere kolommen
    if (search) {
        const i = params.push(`%${search}%`); // wildcards in param i.p.v. SQL concat
        where.push(`(a.ticker ILIKE ${$(i)} OR a.name ILIKE ${$(i)} OR a.unique_symbol ILIKE ${$(i)})`);
    }

    // Exacte ticker
    if (ticker) {
        const i = params.push(ticker);
        where.push(`a.ticker = ${$(i)}`);
    }

    // Enum type (valideren tegen Postgres enum)
    if (typeQ) {
        const allowed = await getEnumLabels('asset_type'); // string[]
        const match = allowed.find((v) => v.toLowerCase() === typeQ.toLowerCase());
        if (!match) {
            return res
                .status(400)
                .json({ error: 'Validatiefout: ongeldige asset type', allowed, received: typeQ });
        }
        const i = params.push(match);
        where.push(`a.type = ${$(i)}::public.asset_type`);
    }

    const sql = `
    SELECT a.id, a.type, a.ticker, a.name, a.quote_ccy, a.mic, a.unique_symbol
      FROM public.assets a
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY a.name ASC
  `;

    try {
        const { rows } = await query<AssetRow>(sql, params);
        res.json({ message: 'Assets succesvol opgehaald', data: rows });
    } catch (err) {
        console.error('[assets:get:error]', err);
        res.status(500).json({ ok: false, error: 'internal' });
    }
});

export default router;
