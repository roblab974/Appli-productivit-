import { NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

// Route de diagnostic — vérifie que la DB tourne
// GET /api/health → {"status":"ok","db":"connected","node":"v22.x.x"}
export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    await db.prepare("SELECT 1 as ok").get();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      node: process.version,
      env: process.env.NODE_ENV,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err.message, node: process.version },
      { status: 500 }
    );
  }
}
