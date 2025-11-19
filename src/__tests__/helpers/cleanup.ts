// tests/helpers/cleanup.ts

// Type van je db-client importeren (default export uit src/db/db.js)
import type dbModule from "../../db/db.js";

export type DbClient = typeof dbModule;

export interface CleanupOptions {
    patterns?: string[];
    schema?: string;
    tryDeleteListings?: boolean;
}

/**
 * Verwijder test-assets (en optioneel listings) op basis van unieke symbol-patterns.
 *
 * @param db    jouw db pool/adapter met .query(sql, params)
 * @param opts  opties voor patterns, schema en listings-cleanup
 */
export async function cleanupTestAssets(
    db: DbClient,
    options: CleanupOptions = {},
): Promise<void> {
    const {
        patterns = ["TEST-%", "TEST-USYM-%"],
        schema = "public",
        tryDeleteListings = true,
    } = options;

    if (!Array.isArray(patterns) || patterns.length === 0) return;

    // WHERE unique_symbol LIKE $1 OR ... opbouwen
    const where = patterns
        .map((_, i) => `unique_symbol LIKE $${i + 1}`)
        .join(" OR ");

    // Als je een listings-tabel hebt met FK naar assets, eerst die records verwijderen
    if (tryDeleteListings) {
        try {
            await db.query(
                `
        DELETE FROM ${schema}.listings
        WHERE asset_id IN (
          SELECT id FROM ${schema}.assets WHERE ${where}
        )
      `,
                patterns,
            );
        } catch {
            // negeer als listings-tabel niet bestaat of geen FK—cleanup moet niet falen
        }
    }

    // Verwijder de assets zelf
    await db.query(
        `DELETE FROM ${schema}.assets WHERE ${where}`,
        patterns,
    );
}
