import { NextRequest, NextResponse } from "next/server";
import getDb, { ensureSchema } from "@/lib/db";
import { postTransaction } from "@/lib/finances";
import { bulkDelete } from "@/lib/bulk";
import { requireUserId, withAuth } from "@/lib/auth";

export const DELETE = bulkDelete("revenue_logs", {
  cascade: async (db, userId, ids) => {
    const ph = ids.map(() => "?").join(",");
    const rows = await db.prepare(`SELECT id, account_id, amount, year, month, date FROM revenue_logs WHERE user_id = ? AND id IN (${ph})`).all(userId, ...ids);
    for (const r of rows as any[]) {
      if (r.account_id) {
        await postTransaction(userId, {
          accountId: r.account_id,
          amount: -r.amount,
          type: "income",
          description: `Suppression revenu ${r.month}/${r.year}`,
          sourceId: r.id,
          sourceType: "revenue",
        });
      }
    }
  },
});

export const GET = withAuth(async () => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  return NextResponse.json(await db.prepare("SELECT * FROM revenue_logs WHERE user_id = ? ORDER BY year DESC, month DESC LIMIT 24").all(userId));
});

export const POST = withAuth(async (req: NextRequest) => {
  await ensureSchema();
  const userId = await requireUserId();
  const db = getDb();
  const body = await req.json();
  let { year, month, date, amount, notes, account_id } = body;

  let txDate: string;
  if (date && typeof date === "string") {
    const parts = date.split("-");
    if (parts.length === 3) {
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
    }
    txDate = date;
  } else {
    txDate = `${year}-${String(month).padStart(2, "0")}-01`;
  }

  const existing = (await db.prepare("SELECT * FROM revenue_logs WHERE user_id = ? AND year=? AND month=?").get(userId, year, month)) as any;

  if (existing) {
    if (existing.account_id) {
      await postTransaction(userId, {
        accountId: existing.account_id,
        amount: -existing.amount,
        type: "income",
        description: `Annulation revenu ${month}/${year}`,
        sourceId: existing.id,
        sourceType: "revenue",
        date: existing.date || txDate,
      });
    }
    await db.prepare("UPDATE revenue_logs SET amount=?, notes=?, account_id=?, date=? WHERE user_id = ? AND year=? AND month=?")
      .run(amount, notes || null, account_id || null, txDate, userId, year, month);
    if (account_id) {
      await postTransaction(userId, {
        accountId: account_id,
        amount,
        type: "income",
        description: `Revenu ${month}/${year}${notes ? ` — ${notes}` : ""}`,
        sourceId: existing.id,
        sourceType: "revenue",
        date: txDate,
      });
    }
    return NextResponse.json(await db.prepare("SELECT * FROM revenue_logs WHERE user_id = ? AND year=? AND month=?").get(userId, year, month));
  }

  const result = await db.prepare(
    "INSERT INTO revenue_logs (user_id, year, month, date, amount, notes, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, year, month, txDate, amount, notes || null, account_id || null);

  if (account_id) {
    await postTransaction(userId, {
      accountId: account_id,
      amount,
      type: "income",
      description: `Revenu ${month}/${year}${notes ? ` — ${notes}` : ""}`,
      sourceId: result.lastInsertRowid,
      sourceType: "revenue",
      date: txDate,
    });
  }
  return NextResponse.json(await db.prepare("SELECT * FROM revenue_logs WHERE id = ?").get(result.lastInsertRowid), { status: 201 });
});
