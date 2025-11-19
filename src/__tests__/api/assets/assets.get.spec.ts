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
        await API()
            .get(`${BASE}/abc`)
            .set("Authorization", `Bearer ${jwt}`)
            .expect(400);
    });

    it("GET /assets/:id — 404 wanneer niet bestaat", async () => {
        await API()
            .get(`${BASE}/99999999`)
            .set("Authorization", `Bearer ${jwt}`)
            .expect(404);
    });

    it("GET /assets — filter type=EQuItY + search op unique_symbol(equity)", async () => {
        const r = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ type: "EQuItY", search: equity.unique_symbol, limit: 100, offset: 0 })
            .expect(200);

        const ids = (r.body?.data || []).map((x: any) => Number(x.id));
        expect(ids).toContain(equity.id);
        expect(ids).not.toContain(etf.id);
    });

    it("GET /assets — filter type=etf + search op unique_symbol(etf)", async () => {
        const r = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ type: "etf", search: etf.unique_symbol, limit: 100, offset: 0 })
            .expect(200);

        const ids = (r.body?.data || []).map((x: any) => Number(x.id));
        expect(ids).toContain(etf.id);
        expect(ids).not.toContain(equity.id);
    });

    it("GET /assets — 400 bij ongeldige type filter", async () => {
        await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ type: "NOT-A-TYPE" })
            .expect(400);
    });

    it("GET /assets — paginatie (limit/offset)", async () => {
        const c1 = (await createAssetViaApi(app, jwt, {}, BASE)) as TestAsset;
        const c2 = (await createAssetViaApi(app, jwt, {}, BASE)) as TestAsset;
        const c3 = (await createAssetViaApi(app, jwt, {}, BASE)) as TestAsset;

        const all = await API()
            .get(BASE)
            .query({ search: "TEST-USYM-" })
            .set("Authorization", `Bearer ${jwt}`)
            .expect(200);

        const total = (all.body?.data || []).length;

        const page1 = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ search: "TEST-USYM-", limit: 2, offset: 0 })
            .expect(200);

        const page2 = await API()
            .get(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .query({ search: "TEST-USYM-", limit: 2, offset: 2 })
            .expect(200);

        expect(page1.body?.data?.length).toBeLessThanOrEqual(2);
        expect(page2.body?.data?.length).toBeLessThanOrEqual(2);
        expect(page1.body.data.length + page2.body.data.length).toBeLessThanOrEqual(total);

        const seen = [...page1.body.data, ...page2.body.data].map(
            (r: any) => r.unique_symbol,
        );
        const created = [c1.unique_symbol, c2.unique_symbol, c3.unique_symbol];

        expect(seen.some((s) => created.includes(s))).toBe(true);
    });
});
