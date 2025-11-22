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

const API = () => request(app);

describe("API /assets — DELETE", () => {
    let jwt: string;

    beforeAll(async () => {
        jwt = await login();
    });

    afterAll(async () => {
        await cleanupTestAssets(db); // ruim TEST-* weg
        await closePool();
    });

    it("DELETE /assets/:id — 200 en daarna 404", async () => {
        const { id } = await createAssetViaApi(app, jwt, {}, BASE);

        const res1 = await API()
            .delete(`${BASE}/${id}`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res1.status).toBe(200);

        const res2 = await API()
            .delete(`${BASE}/${id}`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res2.status).toBe(404);
    });

    it("DELETE /assets/:id — 400 bij ongeldige id", async () => {
        const res = await API()
            .delete(`${BASE}/abc`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res.status).toBe(400);
    });

    it("DELETE /assets/:id — 404 wanneer asset niet bestaat", async () => {
        const res = await API()
            .delete(`${BASE}/99999999`)
            .set("Authorization", `Bearer ${jwt}`);

        expect(res.status).toBe(404);
    });
});
