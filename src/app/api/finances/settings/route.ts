import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { setDisplayCurrency, getDisplayCurrency } from "@/lib/finances";
import { requireUserId, withAuth } from "@/lib/auth";

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  return NextResponse.json({ display_currency: await getDisplayCurrency(userId) });
});

export const PATCH = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const { display_currency } = await req.json();
  await setDisplayCurrency(userId, display_currency);
  return NextResponse.json({ display_currency });
});
