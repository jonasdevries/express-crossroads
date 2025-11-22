// src/__tests__/helpers/assets.ts
import request, { type Response } from "supertest";
import type { Express } from "express";

export const DEFAULT_ASSETS_BASE = "/api/assets";

const uniq = (p = "X"): string =>
    `${p}-${Math.random().toString(36).slice(2, 10)}`;

export interface AssetPayload {
    type: string;
    ticker: string;
    name: string;
    quote_ccy: string;
    mic: string;
    unique_symbol: string;
}

export interface CreatedAsset {
    id: number;
    unique_symbol: string;
    payload: AssetPayload;
    res: Response;
}

/**
 * Maakt een asset via de API.
 * @param app - jouw express app
 * @param jwt - Bearer token
 * @param overrides - veld-overrides voor payload
 * @param base - base path (default: /api/assets)
 */
export async function createAssetViaApi(
    app: Express,
    jwt: string,
    overrides: Partial<AssetPayload> = {},
    base = DEFAULT_ASSETS_BASE,
): Promise<CreatedAsset> {
    const unique_symbol =
        overrides.unique_symbol ?? `TEST-USYM-${uniq()}`;

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

    // met token → 201
    const res = await request(app)
        .post(base)
        .set("Authorization", `Bearer ${jwt}`)
        .send(payload)
        .expect(201);

    // id veilig uit body halen (string of number)
    const rawId = (res.body?.data as { id?: number | string } | undefined)?.id;

    const id =
        typeof rawId === "number"
            ? rawId
            : typeof rawId === "string"
                ? Number(rawId)
                : NaN;

    if (!Number.isFinite(id)) {
        throw new Error(
            `Ongeldig id in response van POST /assets: ${String(rawId)}`,
        );
    }

    return {
        id,
        unique_symbol,
        payload,
        res,
    };
}
