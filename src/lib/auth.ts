/**
 * Helpers pour récupérer l'utilisateur authentifié dans les routes API.
 * Toutes les requêtes DB doivent filtrer par user_id (multi-tenant).
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import getDb from "./db";

/**
 * Récupère le user_id Clerk ou lance une erreur 401.
 * À utiliser au début de chaque route API protégée.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = auth();
  if (!userId) {
    throw new UnauthorizedError();
  }
  // Provisioning paresseux des settings par utilisateur (1er accès)
  await ensureUserDefaults(userId);
  return userId;
}

export class UnauthorizedError extends Error {
  constructor() { super("Unauthorized"); this.name = "UnauthorizedError"; }
}

/**
 * Wrapper pour les routes API : capture UnauthorizedError → 401.
 * Toute autre exception → 500.
 */
export function withAuth<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (e: any) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.error("[API error]", e);
      return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
    }
  }) as T;
}

/**
 * Crée les lignes de settings par défaut pour l'utilisateur s'il n'en a pas.
 * Idempotent.
 */
async function ensureUserDefaults(userId: string) {
  const db = getDb();
  await db.prepare("INSERT OR IGNORE INTO water_settings (user_id, goal_ml, unit_size_ml, unit_name) VALUES (?, 2500, 250, 'verre')").run(userId);
  await db.prepare("INSERT OR IGNORE INTO workout_settings (user_id, weekly_goal) VALUES (?, 3)").run(userId);
  await db.prepare("INSERT OR IGNORE INTO weight_settings (user_id, goal_kg) VALUES (?, 80)").run(userId);
  await db.prepare("INSERT OR IGNORE INTO finance_settings (user_id, display_currency) VALUES (?, 'EUR')").run(userId);
}
