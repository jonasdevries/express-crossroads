import { describe, it, expect, beforeAll, afterAll } from "vitest";

import request from "supertest";
import app from "../../../app.js";
import db, { closePool } from "#db/db.js";
import { login } from "../../helpers/auth.js";
import {
    createAssetViaApi,
    DEFAULT_ASSETS_BASE as BASE,
} from "../../helpers/assets.js";
import { cleanupTestAssets } from "../../helpers/cleanup.js";

// ✔️ In plaats van lokale interfaces → importeer ze uit models
import {
    AssetListItemDto,
    AssetListResponseDto,
    AssetDetailResponseDto,
} from "#models/asset.js";


type CreatedAsset = Awaited<ReturnType<typeof createAssetViaApi>>;

const API = () => request(app);

describe("API /assets — GET", () => {
    let equity: CreatedAsset;
    let etf: CreatedAsset;
    let jwt: string;

    beforeAll(async () => {
        jwt = await login();

        equity = await createAssetViaApi(
            app,
            jwt,
            { type: "equity", name: `Alpha-${Date.now()}` },
            BASE,
        );

        etf = await createAssetViaApi(
            app,
            jwt,
            { type: "ETF", name: `Beta-${Date.now()}` },
            BASE,
        );
    });

    afterAll(async () => {
        await cleanupTestAssets(db);
        await closePool();
    });

    it("GET /assets/:id — 200 detail", async () => {
        const res = await API()
            .get(`${BASE}/${String(equity.id)}`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res.status).toBe(200);

        const body = res.body as AssetDetailResponseDto;

        expect(Number(body.data?.id)).toBe(equity.id);

        // listings bestaat altijd maar defensief blijven we checken
        if (body.data) {
            expect(Array.isArray(body.data.listings)).toBe(true);
        }
    });

    it("GET /assets/:id — 400 ongeldige id", async () => {
        const res = await API()
            .get(`${BASE}/abc`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res.status).toBe(400);
    });

    it("GET /assets/:id — 404 wanneer niet bestaat", async () => {
        const res = await API()
            .get(`${BASE}/99999999`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res.status).toBe(404);
    });

    it("GET /assets — filter type=EQuItY + search op unique_symbol(equity)", async () => {
        const res = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({
                type: "EQuItY",
                search: equity.unique_symbol,
                limit: 100,
                offset: 0,
            });

        expect(res.status).toBe(200);

        const body = res.body as AssetListResponseDto;
        const data: AssetListItemDto[] = body.data ?? [];
        const ids = data.map((item) => Number(item.id));

        expect(ids).toContain(equity.id);
        expect(ids).not.toContain(etf.id);
    });

    it("GET /assets — filter type=etf + search op unique_symbol(etf)", async () => {
        const res = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({
                type: "etf",
                search: etf.unique_symbol,
                limit: 100,
                offset: 0,
            });

        expect(res.status).toBe(200);

        const body = res.body as AssetListResponseDto;
        const data: AssetListItemDto[] = body.data ?? [];

        const ids = data.map((item) => Number(item.id));

        expect(ids).toContain(etf.id);
        expect(ids).not.toContain(equity.id);
    });

    it("GET /assets — 400 bij ongeldige type filter", async () => {
        const res = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ type: "NOT-A-TYPE" });

        expect(res.status).toBe(400);
    });

    it("GET /assets — paginatie (limit/offset)", async () => {
        const c1 = await createAssetViaApi(app, jwt, {}, BASE);
        const c2 = await createAssetViaApi(app, jwt, {}, BASE);
        const c3 = await createAssetViaApi(app, jwt, {}, BASE);

        const allRes = await API()
            .get(BASE)
            .query({ search: "TEST-USYM-" })
            .set("Authorization", `Bearer ${jwt}`);

        expect(allRes.status).toBe(200);

        const allBody = allRes.body as AssetListResponseDto;
        const allData = allBody.data ?? [];
        const total = allData.length;

        const page1Res = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ search: "TEST-USYM-", limit: 2, offset: 0 });

        const page2Res = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ search: "TEST-USYM-", limit: 2, offset: 2 });

        expect(page1Res.status).toBe(200);
        expect(page2Res.status).toBe(200);

        const page1Data = (page1Res.body as AssetListResponseDto).data ?? [];
        const page2Data = (page2Res.body as AssetListResponseDto).data ?? [];

        expect(page1Data.length).toBeLessThanOrEqual(2);
        expect(page2Data.length).toBeLessThanOrEqual(2);
        expect(page1Data.length + page2Data.length).toBeLessThanOrEqual(total);

        const seenSymbols = [...page1Data, ...page2Data].map((item) => item.unique_symbol);
        const created = [c1.unique_symbol, c2.unique_symbol, c3.unique_symbol];

        expect(seenSymbols.some((sym) => created.includes(sym))).toBe(true);
    });
});
