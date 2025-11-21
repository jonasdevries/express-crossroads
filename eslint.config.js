// eslint.config.js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import perfectionist from "eslint-plugin-perfectionist";
import vitest from "@vitest/eslint-plugin";

export default tseslint.config(
    // 1) Globale ignores
    {
        ignores: ["**/*.js", "dist/**", "coverage/**", "node_modules/**"],
    },

    // 2) Basis JS + TypeScript strict/stylistic regels
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,

    // 3) Globale language options + plugins + globale rule overrides
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            perfectionist,
        },
        rules: {
            // template strings: sta numbers toe (voor LIMIT $1, id, enz.)
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowNumber: true,
                    allowBoolean: false,
                    allowNullish: false,
                    allowAny: false,
                },
            ],

            // als je perfectionist later wil aanzetten kan je deze terugdraaien
            "perfectionist/sort-named-imports": "off",
            "perfectionist/sort-imports": "off",
            "perfectionist/sort-objects": "off",
        },
    },

    // 4) Override voor tests + test helpers
    {
        files: ["src/__tests__/**/*.{ts,tsx}"],
        plugins: {
            vitest,
        },
        rules: {
            // Vitest recommended (expect/it/describe, etc.)
            ...vitest.configs.recommended.rules,

            // volledig uitzetten
            "vitest/expect-expect": "warn",

            // Vitest integratietests met supertest zijn lastig 100% typesafe;
            // hier maken we het wat relaxter:
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-argument": "off",

            // In tests zijn template literals met numbers ook oké
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowNumber: true,
                    allowBoolean: true,
                    allowNullish: true,
                    allowAny: true,
                },
            ],

            // Vitest + TS mix → unbound-method is vaak vals positief
            "@typescript-eslint/unbound-method": "off",
        },
    },
);
