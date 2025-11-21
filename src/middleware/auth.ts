// src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "SUPABASE_URL/SUPABASE_ANON_KEY ontbreken in env (src/middleware/auth.ts)",
    );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});

type AuthenticatedRequest = Request & { user: User };

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const authHeader = req.headers.authorization;
    const token =
        typeof authHeader === "string" && authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : undefined;

    if (!token) {
        res.status(401).json({ error: "Missing Authorization header" });
        return;
    }

    const { data, error } = await supabase.auth.getUser(token);

    // 1) Fout van Supabase zelf
    if (error) {
        res.status(401).json({ error: error.message });
        return;
    }

    // Volgens de types is `data` hier niet nullish; user kan wel null zijn
    const user = data.user;

    // 3) Alles ok → user op req hangen
    (req as AuthenticatedRequest).user = user;

    next();
}
