/**
 * Unified DB interface:
 * - Local dev (no TURSO_DATABASE_URL): uses node:sqlite (built-in, sync wrapped as async)
 * - Production / Vercel (TURSO_DATABASE_URL set): uses @libsql/client over HTTP
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

  const DB_DIR = path.join(process.cwd(), "data");
  const DB_PATH = path.join(DB_DIR, "dashboard.db");
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const sqlite = new DatabaseSync(DB_PATH);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  // Convert null-prototype rows to plain objects
  function toPlain(row: any): Record<string, any> | undefined {
    if (!row) return undefined;
    return Object.assign({}, row);
  }

  return {
    exec(sql: string) {
      sqlite.exec(sql);
    },
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
      // executeMultiple handles multiple statements separated by ;
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

// ─── Schema init (called once at server startup via /api/init or first request) ─

export async function initSchema() {
  const db = getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      duration_min INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
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
      date TEXT NOT NULL UNIQUE,
      bedtime TEXT,
      wake_time TEXT,
      duration_h REAL NOT NULL,
      quality INTEGER NOT NULL,
      energy_score INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      weight_kg REAL NOT NULL,
      waist_cm REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      glasses INTEGER NOT NULL DEFAULT 0,
      goal INTEGER NOT NULL DEFAULT 8,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS business_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS revenue_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(year, month)
    );
    CREATE TABLE IF NOT EXISTS kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      unit TEXT,
      target REAL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS business_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      completed INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
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
      date TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 25,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

let schemaInitialized = false;
export async function ensureSchema() {
  if (!schemaInitialized) {
    await initSchema();
    schemaInitialized = true;
  }
}
