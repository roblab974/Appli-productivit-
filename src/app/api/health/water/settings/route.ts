import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const s = (await db.prepare("SELECT goal_ml, unit_size_ml, unit_name FROM water_settings WHERE user_id = ?").get(userId)) as any;
  return NextResponse.json(s || { goal_ml: 2500, unit_size_ml: 250, unit_name: "verre" });
});

export const PATCH = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const { goal_ml, unit_size_ml, unit_name } = await req.json();
  const fields: string[] = [];
  const values: any[] = [];
  if (typeof goal_ml === "number") { fields.push("goal_ml=?"); values.push(goal_ml); }
  if (typeof unit_size_ml === "number") { fields.push("unit_size_ml=?"); values.push(unit_size_ml); }
  if (typeof unit_name === "string") { fields.push("unit_name=?"); values.push(unit_name); }
  if (fields.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  fields.push("updated_at=datetime('now')");
  await db.prepare(`UPDATE water_settings SET ${fields.join(", ")} WHERE user_id = ?`).run(...values, userId);
  const s = await db.prepare("SELECT * FROM water_settings WHERE user_id = ?").get(userId);
  return NextResponse.json(s);
});
