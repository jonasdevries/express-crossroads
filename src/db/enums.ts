import {query} from "#db/db.js";

export interface EnumLabelRow {
    enumlabel: string;
}

const cache = new Map<string, { t0: number; values: string[] }>();
const TTL_MS = 5 * 60 * 1000; // 5 min

export async function getEnumLabels(enumType: string): Promise<string[]> {
    const hit = cache.get(enumType);
    const now = Date.now();
    if (hit && now - hit.t0 < TTL_MS) return hit.values;

    const { rows } = await query<EnumLabelRow>(
        `
            select e.enumlabel
            from pg_type t
                     join pg_enum e on e.enumtypid = t.oid
            where t.typname = $1
            order by e.enumsortorder
        `,
        [enumType]
    );

    const values = rows.map((r) => r.enumlabel); // bv. ['equity','etf',...]
    cache.set(enumType, { t0: now, values });
    return values;
}