// src/middleware/auth.ts

import { createClient } from "@supabase/supabase-js";
import type, { Request, Response, NextFunction } from "express";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "SUPABASE_URL/SUPABASE_ANON_KEY ontbreken in env (src/middleware/auth.ts)",
    );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
});

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

    if (!token) {
        res.status(401).json({ error: "Missing Authorization header" });
        return;
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }

    // zie stap 2 voor type-safe versie
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = data.user;

    next();
}
