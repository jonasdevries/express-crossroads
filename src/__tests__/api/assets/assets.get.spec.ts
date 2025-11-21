import { describe, it, expect, beforeAll, afterAll } from "vitest";

import app from "../../../app.js";
import db, { closePool } from "../../../db/db.js"
import { createAssetViaApi } from "../../helpers/assets.js";
import { login } from "../../helpers/auth.js";
import {cleanupTestAssets} from "#__tests__/helpers/cleanup.js";
import supertest from "supertest";


const BASE = "/api/assets";
const API = () => supertest(app);

interface TestAsset {
    id: number;
    unique_symbol: string;
    // voeg hier gerust extra velden toe indien nuttig (type, name, ...)
}

interface AssetListItem {
    id: number;
    unique_symbol: string;
}

interface AssetListResponse {
    data?: AssetListItem[];
    message?: string;
}

describe("API /assets — GET", () => {
    let equity: TestAsset;
    let etf: TestAsset;
    let jwt: string;

    beforeAll(async () => {
        jwt = await login();

        equity = (await createAssetViaApi(
            app,
            jwt,
            { type: "equity", name: `Alpha-${Date.now()}` },
            BASE,
        )) as TestAsset;

        etf = (await createAssetViaApi(
            app,
            jwt,
            { type: "ETF", name: `Beta-${Date.now()}` },
            BASE,
        )) as TestAsset;
    });

    afterAll(async () => {
        await cleanupTestAssets(db);
        await closePool();
    });

    it("GET /assets/:id — 200 detail", async () => {
        const r = await API()
            .get(`${BASE}/${equity.id}`)
            .set("Authorization", `Bearer ${jwt}`)
            .expect(200);

        expect(Number(r.body?.data?.id)).toBe(equity.id);

        if (r.body?.data && Object.prototype.hasOwnProperty.call(r.body.data, "listings")) {
            expect(Array.isArray(r.body.data.listings)).toBe(true);
        }
    });

    it("GET /assets/:id — 400 ongeldige id", async () => {
        const res = await API()
            .get(`${BASE}/abc`)
            .set("Authorization", `Bearer ${jwt}`)

        expect(res.status).toBe(400);
    });

    it("GET /assets/:id — 404 wanneer niet bestaat", async () => {
        const res = await API()
            .get(`${BASE}/99999999`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res.status).toBe(400);
    });

    it("GET /assets — filter type=EQuItY + search op unique_symbol(equity)", async () => {
        const r = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ type: "EQuItY", search: equity.unique_symbol, limit: 100, offset: 0 })
            .expect(200);

        const ids = (r.body?.data ?? []).map((x: any) => Number(x.id));
        expect(ids).toContain(equity.id);
        expect(ids).not.toContain(etf.id);
    });

    it("GET /assets — filter type=etf + search op unique_symbol(etf)", async () => {
        const res = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ type: "etf", search: etf.unique_symbol, limit: 100, offset: 0 })

            expect(res).toBe(200);

        interface AssetListItem { id: number; unique_symbol: string }

        const data = (res.body?.data ?? []) as AssetListItem[];
        const ids = data.map((x) => x.id);

        expect(ids).toContain(etf.id);
        expect(ids).not.toContain(equity.id);
    });

    it("GET /assets — 400 bij ongeldige type filter", async () => {
        const  res = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ type: "NOT-A-TYPE" });

        expect(res).toBe(400);

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

        const allBody: AssetListResponse = allRes.body;
        const allData: AssetListItem[] = allBody.data ?? [];
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

        const page1Body: AssetListResponse = page1Res.body;
        const page2Body: AssetListResponse = page2Res.body;

        const page1Data: AssetListItem[] = page1Body.data ?? [];
        const page2Data: AssetListItem[] = page2Body.data ?? [];

        const len1 = page1Data.length;
        const len2 = page2Data.length;

        expect(len1).toBeLessThanOrEqual(2);
        expect(len2).toBeLessThanOrEqual(2);
        expect(len1 + len2).toBeLessThanOrEqual(total);

        const seen = [...page1Data, ...page2Data].map(
            (item) => item.unique_symbol,
        );
        const created = [c1.unique_symbol, c2.unique_symbol, c3.unique_symbol];

        expect(seen.some((s) => created.includes(s))).toBe(true);
    });
});