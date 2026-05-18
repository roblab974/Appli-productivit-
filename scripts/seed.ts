import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { format, subDays } from "date-fns";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "dashboard.db");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// --- Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, type TEXT NOT NULL, duration_min INTEGER NOT NULL, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS workout_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, name TEXT NOT NULL, sets INTEGER, reps INTEGER, weight_kg REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS sleep_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, bedtime TEXT, wake_time TEXT, duration_h REAL NOT NULL, quality INTEGER NOT NULL, energy_score INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS weight_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, weight_kg REAL NOT NULL, waist_cm REAL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS water_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, glasses INTEGER NOT NULL DEFAULT 0, goal INTEGER NOT NULL DEFAULT 8, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS business_goals (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, target_date TEXT, status TEXT NOT NULL DEFAULT 'active', progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS revenue_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, month INTEGER NOT NULL, amount REAL NOT NULL DEFAULT 0, notes TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(year, month));
  CREATE TABLE IF NOT EXISTS kpis (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, value REAL NOT NULL DEFAULT 0, unit TEXT, target REAL, date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS business_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, tags TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'medium', completed INTEGER NOT NULL DEFAULT 0, date TEXT NOT NULL, recurring TEXT, recurring_day INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT);
  CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, author TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS pomodoro_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, duration_min INTEGER NOT NULL DEFAULT 25, completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
`);

const d = (daysAgo: number) => format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
const today = d(0);

console.log("🌱 Seeding database...");

// --- QUOTES ---
db.exec("DELETE FROM quotes");
const quotes: [string, string][] = [
  ["Discipline equals freedom.", "Jocko Willink"],
  ["Don't count the days, make the days count.", "Muhammad Ali"],
  ["The secret to getting ahead is getting started.", "Mark Twain"],
  ["Success is not final, failure is not fatal — it's the courage to continue that counts.", "Winston Churchill"],
  ["You don't have to be extreme, just consistent.", "Anonyme"],
  ["Every day is a new opportunity to get stronger.", "Anonyme"],
  ["The harder you work for something, the greater you'll feel when you achieve it.", "Anonyme"],
  ["Push yourself because no one else is going to do it for you.", "Anonyme"],
  ["Great things never come from comfort zones.", "Anonyme"],
  ["Wake up with determination. Go to bed with satisfaction.", "Anonyme"],
  ["It always seems impossible until it's done.", "Nelson Mandela"],
  ["The body achieves what the mind believes.", "Anonyme"],
  ["Small daily improvements over time lead to stunning results.", "Robin Sharma"],
  ["Don't wish for it. Work for it.", "Anonyme"],
  ["Your only limit is your mind.", "Anonyme"],
  ["Fall seven times, stand up eight.", "Proverbe japonais"],
  ["Success usually comes to those who are too busy to be looking for it.", "Henry David Thoreau"],
  ["Champions are made when nobody is watching.", "Anonyme"],
  ["La discipline est le pont entre les objectifs et les accomplissements.", "Jim Rohn"],
  ["Chaque expert a été un débutant.", "Anonyme"],
];
const insertQuote = db.prepare("INSERT INTO quotes (text, author) VALUES (?, ?)");
for (const [text, author] of quotes) insertQuote.run(text, author);
console.log(`  ✓ ${quotes.length} quotes`);

// --- WORKOUTS ---
db.exec("DELETE FROM workout_exercises");
db.exec("DELETE FROM workouts");

const insertWorkout = db.prepare("INSERT INTO workouts (date, type, duration_min) VALUES (?, ?, ?)");
const insertExercise = db.prepare("INSERT INTO workout_exercises (workout_id, name, sets, reps, weight_kg) VALUES (?, ?, ?, ?, ?)");

const workoutData: [number, string, number, [string, number, number, number][]][] = [
  [0, "musculation", 60, [["Développé couché", 4, 8, 80], ["Tractions", 4, 6, 0], ["Rowing barre", 3, 10, 60]]],
  [2, "musculation", 55, [["Squat", 4, 8, 100], ["Leg press", 3, 12, 140], ["Fentes", 3, 10, 30]]],
  [4, "cardio", 35, [["Course à pied", 1, 1, 0]]],
  [5, "musculation", 65, [["Développé épaules", 4, 10, 40], ["Curl biceps", 3, 12, 20], ["Triceps poulie", 3, 12, 25]]],
  [7, "musculation", 60, [["Développé couché", 4, 8, 82.5], ["Dips", 3, 8, 0], ["Soulevé de terre", 3, 5, 100]]],
  [9, "cardio", 45, [["Vélo elliptique", 1, 1, 0]]],
  [11, "musculation", 55, [["Squat", 4, 8, 100], ["Hip thrust", 3, 12, 80]]],
  [14, "musculation", 60, [["Développé couché", 4, 8, 80], ["Tractions", 4, 5, 0]]],
  [16, "autre", 30, []],
  [18, "musculation", 65, [["Développé couché", 4, 8, 77.5], ["Squat", 3, 8, 95]]],
];
for (const [daysAgo, type, duration, exercises] of workoutData) {
  const result = insertWorkout.run(d(daysAgo), type, duration);
  for (const [name, sets, reps, weight] of exercises) {
    insertExercise.run(result.lastInsertRowid, name, sets, reps, weight);
  }
}
console.log(`  ✓ ${workoutData.length} workouts`);

// --- SLEEP ---
db.exec("DELETE FROM sleep_logs");
const insertSleep = db.prepare("INSERT OR REPLACE INTO sleep_logs (date, bedtime, wake_time, duration_h, quality, energy_score) VALUES (?, ?, ?, ?, ?, ?)");
const sleepData: [number, string, string, number, number, number][] = [
  [0, "23:00", "06:45", 7.75, 4, 8], [1, "23:30", "07:00", 7.5, 3, 7],
  [2, "22:45", "06:30", 7.75, 5, 9], [3, "00:00", "07:30", 7.5, 3, 6],
  [4, "23:00", "06:45", 7.75, 4, 8], [5, "01:00", "08:00", 7, 2, 5],
  [6, "22:30", "06:30", 8, 5, 10], [7, "23:00", "07:00", 8, 4, 8],
  [8, "23:30", "07:30", 8, 4, 7], [9, "22:45", "06:45", 8, 5, 9],
  [10, "00:15", "07:15", 7, 3, 6], [11, "23:00", "06:30", 7.5, 4, 8],
  [12, "22:30", "06:30", 8, 5, 9], [13, "23:45", "07:45", 8, 3, 7],
  [14, "23:00", "07:00", 8, 4, 8],
];
for (const args of sleepData) insertSleep.run(d(args[0]), ...args.slice(1) as any);
console.log(`  ✓ ${sleepData.length} sleep logs`);

// --- WEIGHT ---
db.exec("DELETE FROM weight_logs");
const insertWeight = db.prepare("INSERT OR REPLACE INTO weight_logs (date, weight_kg, waist_cm) VALUES (?, ?, ?)");
const startWeight = 101.5;
for (let i = 60; i >= 0; i -= 3) {
  const w = parseFloat((startWeight - (60 - i) * 0.08 + (Math.random() - 0.5) * 0.4).toFixed(1));
  const wc = parseFloat((96 - (60 - i) * 0.05 + (Math.random() - 0.5) * 0.3).toFixed(1));
  insertWeight.run(d(i), w, wc);
}
console.log(`  ✓ weight logs`);

// --- WATER ---
db.exec("DELETE FROM water_logs");
const insertWater = db.prepare("INSERT OR REPLACE INTO water_logs (date, glasses, goal) VALUES (?, ?, 8)");
for (let i = 0; i <= 14; i++) {
  insertWater.run(d(i), i === 0 ? 5 : Math.floor(Math.random() * 5) + 5);
}
console.log(`  ✓ water logs`);

// --- BUSINESS ---
db.exec("DELETE FROM business_goals");
const insertGoal = db.prepare("INSERT INTO business_goals (title, description, target_date, status, progress) VALUES (?, ?, ?, ?, ?)");
insertGoal.run("Atteindre 5 000€/mois de revenus", "Développer mon activité principale pour atteindre un MRR de 5k€", format(new Date(new Date().getFullYear(), 11, 31), "yyyy-MM-dd"), "active", 35);
insertGoal.run("Lancer la V1 du produit", "Développer et livrer la première version publique", format(subDays(new Date(), -60), "yyyy-MM-dd"), "active", 70);
insertGoal.run("Construire une audience de 1000 abonnés", "Newsletter + réseau social", null, "active", 15);

db.exec("DELETE FROM revenue_logs");
const insertRevenue = db.prepare("INSERT OR REPLACE INTO revenue_logs (year, month, amount) VALUES (?, ?, ?)");
[[2025,1,800],[2025,2,950],[2025,3,1100],[2025,4,1050],[2025,5,1300],[2025,6,1200],[2025,7,1500],[2025,8,1400],[2025,9,1800],[2025,10,1750],[2025,11,2100],[2025,12,2300],[2026,1,2500],[2026,2,2400],[2026,3,2800],[2026,4,3100]].forEach(([y,m,a]) => insertRevenue.run(y, m, a));

db.exec("DELETE FROM kpis");
const insertKpi = db.prepare("INSERT INTO kpis (name, value, unit, target, date) VALUES (?, ?, ?, ?, ?)");
[["Clients actifs", 12, "clients", 50], ["MRR", 3100, "€", 5000], ["Newsletter", 247, "abonnés", 1000], ["Taux de conversion", 3.2, "%", 5]].forEach(([n, v, u, t]) => insertKpi.run(n, v, u, t, today));

db.exec("DELETE FROM business_notes");
const insertNote = db.prepare("INSERT INTO business_notes (content, tags) VALUES (?, ?)");
insertNote.run("Idée : créer un template de dashboard Notion pour les entrepreneurs solo. Peut être un produit d'appel pas cher (9-19€).", "idée,produit");
insertNote.run("Action prioritaire cette semaine : finaliser la landing page et lancer une campagne email aux 247 abonnés.", "marketing,priorité");
insertNote.run("Feedback client : beaucoup demandent une intégration Zapier. À investiguer pour la V2.", "feedback,v2");

console.log(`  ✓ business data`);

// --- TODOS ---
db.exec("DELETE FROM todos");
const insertTodo = db.prepare("INSERT INTO todos (title, priority, date, completed, recurring, recurring_day) VALUES (?, ?, ?, ?, ?, ?)");
const todayTodos: [string, string, number][] = [
  ["Publier le post LinkedIn", "high", 0],
  ["Répondre aux emails clients", "high", 1],
  ["Session de deep work - développement", "medium", 1],
  ["Faire la comptabilité du mois", "medium", 0],
  ["Lire 20 pages", "low", 0],
  ["Faire les courses", "low", 1],
];
for (const [title, priority, completed] of todayTodos) {
  insertTodo.run(title, priority, today, completed, null, null);
}
insertTodo.run("Méditation 10 min", "high", today, 0, "daily", null);
insertTodo.run("Stretch / mobilité", "medium", today, 0, "daily", null);
insertTodo.run("Revue hebdo", "high", today, 0, "weekly", 1);
console.log(`  ✓ todos`);

db.close();
console.log("\n✅ Seed complete! Run: npm run dev");
