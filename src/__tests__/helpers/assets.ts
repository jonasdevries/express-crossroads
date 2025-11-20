// tests/helpers/assets.ts
import request, { type Response as SupertestResponse } from "supertest";
import type { Express } from "express";

export const DEFAULT_ASSETS_BASE = "/api/assets";

const uniq = (p = "X"): string =>
    `${p}-${Math.random().toString(36).slice(2, 10)}`;

export interface AssetPayload {
    type: string;
    ticker: string;
    name: string;
    quote_ccy: string;
    mic: string | null;
    unique_symbol: string;
    // laat extra velden uit overrides toe
    [key: string]: unknown;
}

export interface CreateAssetResult {
    id: number;
    unique_symbol: string;
    payload: AssetPayload;
    res: SupertestResponse;
}

/**
 * Maakt een asset via de API.
 * @param app   jouw Express app
 * @param jwt   Bearer token
 * @param overrides veld-overrides voor payload
 * @param base  base path (default: /api/assets)
 */
export async function createAssetViaApi(
    app: Express,
    jwt: string,
    overrides: Partial<AssetPayload> = {},
    base = DEFAULT_ASSETS_BASE,
): Promise<CreateAssetResult> {
    const unique_symbol =
        (overrides.unique_symbol as string | undefined) ??
        `TEST-USYM-${uniq()}`;

    const payload: AssetPayload = {
        type: "equity",
        ticker: `T${uniq().slice(0, 3).toUpperCase()}`,
        name: `Test Asset ${unique_symbol}`,
        quote_ccy: "USD",
        mic: "XNYS",
        unique_symbol,
        ...overrides,
    };

    // zonder token → 401 (sanity check)
    await request(app).post(base).send(payload).expect(401);
    let res = await request(app)
        .post(base)
        .set("Authorization", `Bearer ${jwt}`)
        .send(payload)
        .expect(201);

    const body = res.body as { data?: { id: number } };

    // met token → 201
    res = await request(app)
        .post(base)
        .set("Authorization", `Bearer ${jwt}`)
        .send(payload)
        .expect(201);

    return {
        id: Number(res.body?.data?.id),
        unique_symbol,
        payload,
        res,
    };
}
