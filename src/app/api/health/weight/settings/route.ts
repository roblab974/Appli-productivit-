import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const s = (await db.prepare("SELECT goal_kg, starting_kg FROM weight_settings WHERE user_id = ?").get(userId)) as any;
  return NextResponse.json(s || { goal_kg: 80, starting_kg: null });
});

export const PATCH = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { goal_kg, starting_kg } = await req.json();
  const fields: string[] = [];
  const values: any[] = [];
  if (typeof goal_kg === "number" && goal_kg > 20 && goal_kg < 300) {
    fields.push("goal_kg=?"); values.push(goal_kg);
  }
  if (starting_kg === null || (typeof starting_kg === "number" && starting_kg > 20 && starting_kg < 300)) {
    fields.push("starting_kg=?"); values.push(starting_kg);
  }
  if (fields.length === 0) return NextResponse.json({ error: "Aucune valeur valide" }, { status: 400 });
  fields.push("updated_at=datetime('now')");
  await db.prepare(`UPDATE weight_settings SET ${fields.join(", ")} WHERE user_id = ?`).run(...values, userId);
  const s = await db.prepare("SELECT * FROM weight_settings WHERE user_id = ?").get(userId);
  return NextResponse.json(s);
});
