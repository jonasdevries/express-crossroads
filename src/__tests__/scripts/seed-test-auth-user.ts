// scripts/seed-test-auth-user.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import db from "#db/db.js"; // pad/alias zoals in je project

async function main() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            "SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env(.test) voor seed-test-auth-user.ts",
        );
    }

    const email = process.env.TEST_USER_EMAIL ?? "tester@example.com";
    const password = process.env.TEST_USER_PASSWORD ?? "Passw0rd!";
    const name = "Testgebruiker";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    //
    // 1️⃣ Auth user in auth.users (Supabase Auth)
    //
    const {
        data: { users },
        error: listError,
    } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
        throw listError;
    }

    let authUser = users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (!authUser) {
        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: "test" },
        });
        if (error) throw error;
        authUser = data.user;
        console.log(`✅ Auth user aangemaakt: ${email} (id=${authUser.id})`);
    } else {
        // Optioneel: wachtwoord resetten naar TEST_USER_PASSWORD
        const { data, error } =
            await adminClient.auth.admin.updateUserById(authUser.id, {
                password,
                email_confirm: true,
            });
        if (error) throw error;
        authUser = data.user;
        console.log(
            `ℹ️ Auth user bestond al (id=${authUser.id}), wachtwoord geüpdatet`,
        );
    }


    // 2️⃣ Domein-user in public.users
    let appUserId: number;

    const existing = await db.query(
        `SELECT id FROM public.users WHERE email = $1`,
        [email],
    );

    if (existing.rows[0]) {
        // bestaat al → eventueel naam updaten
        appUserId = existing.rows[0].id;

        await db.query(
            `UPDATE public.users SET name = $2 WHERE id = $1`,
            [appUserId, name],
        );
    } else {
        // bestaat nog niet → aanmaken
        const insertResult = await db.query(
            `INSERT INTO public.users (email, name)
         VALUES ($1, $2)
         RETURNING id;`,
            [email, name],
        );
        appUserId = insertResult.rows[0].id;
    }

    console.log(
        `✅ public.users record aanwezig (id=${appUserId}, email=${email})`,
    );

    console.log(
        `🔗 Link: auth.users.id = ${authUser.id} ↔ public.users.email = ${email}`,
    );
}

main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
        console.error("❌ Fout bij seeden test user:", err);
        process.exit(1);
    });
