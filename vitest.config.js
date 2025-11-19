import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), ""); // '' = geen prefix filter

    return {
        test: {
            env, // zet alles uit .env/.env.test/... in process.env voor tests
            include: ["src/__tests__/**/*.spec.ts"], // jouw structuur
        },
    };
});
