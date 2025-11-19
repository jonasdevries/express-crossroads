// tests/helpers/auth.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY ontbreken in env (tests/helpers/auth.ts)");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});

let cachedToken: string | null = null;

/** Haal een access token op via Supabase; cache voor snelheid. */
export async function login(): Promise<string> {
    if (cachedToken) return cachedToken;

    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
        throw new Error(
            "TEST_USER_EMAIL/TEST_USER_PASSWORD ontbreken in .env.test",
        );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error || !data?.session) {
        throw new Error(error?.message ?? "Login mislukt (geen session)");
    }

    cachedToken = data.session.access_token;
    return cachedToken;
}
