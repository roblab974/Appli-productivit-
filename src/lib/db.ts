/**
 * Unified DB interface:
 * - Local dev (no TURSO_DATABASE_URL): uses node:sqlite (built-in, sync wrapped as async)
 * - Production / Vercel (TURSO_DATABASE_URL set): uses @libsql/client over HTTP
 *
 * MULTI-TENANT : toutes les tables data ont une colonne user_id (Clerk id).
 * Les routes API doivent TOUJOURS filtrer par user_id (cf. lib/auth.ts).
 */

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export interface Statement {
  run(...args: any[]): Promise<RunResult>;
  get(...args: any[]): Promise<Record<string, any> | undefined>;
  all(...args: any[]): Promise<Record<string, any>[]>;
}

export interface DB {
  exec(sql: string): void | Promise<void>;
  prepare(sql: string): Statement;
}

// ─── Local: node:sqlite wrapper ───────────────────────────────────────────────

function createLocalDb(): DB {
  const { DatabaseSync } = require("node:sqlite");
  const path = require("path");
  const fs = require("fs");

  const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
  const DB_PATH = path.join(DB_DIR, "dashboard.db");
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const sqlite = new DatabaseSync(DB_PATH);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  function toPlain(row: any): Record<string, any> | undefined {
    if (!row) return undefined;
    return Object.assign({}, row);
  }

  return {
    exec(sql: string) { sqlite.exec(sql); },
    prepare(sql: string): Statement {
      return {
        async run(...args: any[]) {
          const r = sqlite.prepare(sql).run(...args);
          return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
        },
        async get(...args: any[]) {
          return toPlain(sqlite.prepare(sql).get(...args));
        },
        async all(...args: any[]) {
          const rows = sqlite.prepare(sql).all(...args) as any[];
          return rows.map(toPlain) as Record<string, any>[];
        },
      };
    },
  };
}

// ─── Production: @libsql/client wrapper ───────────────────────────────────────

function createTursoDb(): DB {
  const { createClient } = require("@libsql/client");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  function toArgs(args: any[]): any[] {
    return args.map(a => (a === undefined ? null : a));
  }
  function rowToPlain(row: any): Record<string, any> {
    return Object.assign({}, row);
  }

  return {
    async exec(sql: string) {
      await client.executeMultiple(sql);
    },
    prepare(sql: string): Statement {
      return {
        async run(...args: any[]) {
          const r = await client.execute({ sql, args: toArgs(args) });
          return {
            lastInsertRowid: r.lastInsertRowid ? Number(r.lastInsertRowid) : 0,
            changes: r.rowsAffected,
          };
        },
        async get(...args: any[]) {
          const r = await client.execute({ sql, args: toArgs(args) });
          return r.rows[0] ? rowToPlain(r.rows[0]) : undefined;
        },
        async all(...args: any[]) {
          const r = await client.execute({ sql, args: toArgs(args) });
          return r.rows.map(rowToPlain);
        },
      };
    },
  };
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _db: DB | null = null;

export default function getDb(): DB {
  if (!_db) {
    if (process.env.TURSO_DATABASE_URL) {
      _db = createTursoDb();
    } else {
      _db = createLocalDb();
    }
  }
  return _db;
}

// ─── Schema init ──────────────────────────────────────────────────────────────

export async function initSchema() {
  const db = getDb();
  await db.exec(`
    -- ─── DATA TABLES (toutes scoped par user_id) ────────────────────────────────
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      duration_min INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC);

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight_kg REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      bedtime TEXT,
      wake_time TEXT,
      duration_h REAL NOT NULL,
      quality INTEGER NOT NULL,
      energy_score INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      waist_cm REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      glasses INTEGER NOT NULL DEFAULT 0,
      goal INTEGER NOT NULL DEFAULT 8,
      volume_ml INTEGER NOT NULL DEFAULT 0,
      unit_size_ml INTEGER NOT NULL DEFAULT 250,
      goal_ml INTEGER NOT NULL DEFAULT 2500,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS business_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS revenue_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      date TEXT,
      amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      account_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      unit TEXT,
      target REAL,
      date TEXT NOT NULL,
      goal_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      completed INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      deadline TEXT,
      recurring TEXT,
      recurring_day INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      author TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 25,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_completions (
      todo_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (todo_id, date)
    );

    -- ─── SETTINGS (1 ligne par user) ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS water_settings (
      user_id TEXT PRIMARY KEY,
      goal_ml INTEGER NOT NULL DEFAULT 2500,
      unit_size_ml INTEGER NOT NULL DEFAULT 250,
      unit_name TEXT NOT NULL DEFAULT 'verre',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workout_settings (
      user_id TEXT PRIMARY KEY,
      weekly_goal INTEGER NOT NULL DEFAULT 3,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS weight_settings (
      user_id TEXT PRIMARY KEY,
      goal_kg REAL NOT NULL DEFAULT 80,
      starting_kg REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS finance_settings (
      user_id TEXT PRIMARY KEY,
      display_currency TEXT NOT NULL DEFAULT 'EUR',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ─── FINANCES (toutes scoped) ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      type TEXT DEFAULT 'checking',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ticker TEXT NOT NULL,
      name TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      avg_price REAL,
      current_price REAL,
      currency TEXT DEFAULT 'USD',
      last_updated TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS cryptos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      coin_id TEXT,
      name TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      avg_price REAL,
      current_price REAL,
      currency TEXT DEFAULT 'USD',
      last_updated TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS other_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      category TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      frequency TEXT NOT NULL DEFAULT 'monthly',
      account_id INTEGER,
      due_date TEXT NOT NULL,
      auto_deduct INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      last_deducted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      account_id INTEGER,
      purchase_date TEXT NOT NULL,
      deducted INTEGER NOT NULL DEFAULT 0,
      deducted_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      notes TEXT,
      priority INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      account_id INTEGER,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      source_id INTEGER,
      source_type TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS patrimoine_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_eur REAL NOT NULL,
      accounts_total REAL,
      stocks_total REAL,
      cryptos_total REAL,
      assets_total REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS rates_cache (
      currency TEXT PRIMARY KEY,
      rate_to_eur REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Index pour les perfs (à créer après les tables)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_logs(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_logs(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_logs(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_goals_user ON business_goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_revenue_user ON revenue_logs(user_id, year DESC, month DESC);
    CREATE INDEX IF NOT EXISTS idx_kpis_user ON kpis(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user ON business_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_pomo_user ON pomodoro_sessions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON bank_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_stocks_user ON stocks(user_id);
    CREATE INDEX IF NOT EXISTS idx_cryptos_user ON cryptos(user_id);
    CREATE INDEX IF NOT EXISTS idx_assets_user ON other_assets(user_id);
    CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date DESC);
  `);
}

let schemaInitialized = false;
export async function ensureSchema() {
  if (!schemaInitialized) {
    await initSchema();
    schemaInitialized = true;
  }
}
