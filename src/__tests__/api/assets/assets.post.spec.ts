import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

import app from "../../../app.js";
import db, { closePool } from "#db/db.js";
import { getEnumLabels } from "#db/enums.js";
import { login } from "../../helpers/auth.js";
import {
    createAssetViaApi,
    DEFAULT_ASSETS_BASE as BASE,
} from "../../helpers/assets.js";
import { cleanupTestAssets } from "../../helpers/cleanup.js";

const API = () => request(app);

describe("API /assets — POST", () => {
    let jwt: string;

    beforeAll(async () => {
        jwt = await login();
    });

    afterAll(async () => {
        await cleanupTestAssets(db);
        await closePool();
    });

    it("201 — maakt asset aan en zet Location header", async () => {
        const { id, unique_symbol, res } = await createAssetViaApi(
            app,
            jwt,
            {},
            BASE,
        );

        expect(id).toBeGreaterThan(0);
        expect(res.status).toBe(201);

        const loc = res.headers.location;
        expect(typeof loc).toBe("string");
        expect(loc.endsWith(`/${id}`)).toBe(true);

        const { rows } = await db.query<{
            id: number;
            unique_symbol: string;
        }>(
            "select id, unique_symbol from public.assets where id=$1",
            [id],
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].unique_symbol).toBe(unique_symbol);
    });

    it("409 — duplicate unique_symbol (ON CONFLICT)", async () => {
        const { unique_symbol } = await createAssetViaApi(app, jwt, {}, BASE);

        const r = await API()
            .post(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
                type: "equity",
                name: "Dupe",
                quote_ccy: "USD",
                mic: "XNYS",
                unique_symbol,
            });

        expect(r.status).toBe(409);
        expect(String(r.body.error ?? "")).toMatch(/Conflict/i);
    });

    it("400 — ontbrekend type", async () => {
        const r = await API()
            .post(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
                ticker: "TST",
                name: "Zonder Type",
                quote_ccy: "USD",
                mic: "XNYS",
                unique_symbol: `TEST-NOTYPE-${Date.now()}`,
            });

        expect(r.status).toBe(400);
    });

    it("400 — type = null", async () => {
        // bewust runtime-invalid body -> geen DTO-type forceren
        const r = await API()
            .post(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
                type: null,
                ticker: "TST",
                name: "Null Type",
                quote_ccy: "USD",
                mic: "XNYS",
                unique_symbol: `TEST-NULLTYPE-${Date.now()}`,
            });

        expect(r.status).toBe(400);
    });

    it("400 — ongeldige type (pre-validatie enum)", async () => {
        const r = await API()
            .post(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
                type: "EquityX",
                ticker: "TST",
                name: "Bad Type",
                quote_ccy: "USD",
                mic: "XNYS",
                unique_symbol: `TEST-BADTYPE-${Date.now()}`,
            });

        expect(r.status).toBe(400);

        const allowedTypes = await getEnumLabels("asset_type");
        expect(r.body.allowed).toEqual(allowedTypes);
    });

    it("400 — ongeldige quote_ccy (lowercase)", async () => {
        const r = await API()
            .post(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
                type: "equity",
                ticker: "TST",
                name: "Bad CCY",
                quote_ccy: "usd",
                mic: "XNYS",
                unique_symbol: `TEST-BADCCY-${Date.now()}`,
            });

        expect(r.status).toBe(400);
    });

    it("400 — ongeldige mic en ticker patroon", async () => {
        const r = await API()
            .post(BASE)
            .set("Authorization", `Bearer ${jwt}`)
            .send({
                type: "equity",
                ticker: "TOO-LONG-TICKER-123",
                name: "Bad MIC/Ticker",
                quote_ccy: "USD",
                mic: "XNY$",
                unique_symbol: `TEST-BADMIC-${Date.now()}`,
            });

        expect(r.status).toBe(400);
    });
});
