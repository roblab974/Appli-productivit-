import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  const body = await req.json();
  const fields = Object.keys(body).map(k => `${k}=?`).join(", ");
  await db.prepare(`UPDATE business_goals SET ${fields} WHERE id=?`).run(...(Object.values(body) as any[]), params.id);
  return NextResponse.json(await db.prepare("SELECT * FROM business_goals WHERE id = ?").get(params.id));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();
  const db = getDb();
  await db.prepare("DELETE FROM business_goals WHERE id = ?").run(params.id);
  return NextResponse.json({ success: true });
}
