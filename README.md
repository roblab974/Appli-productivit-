# PersonalDash

Dashboard personnel PWA construit avec Next.js 14, TypeScript, Tailwind CSS et SQLite.

## Stack

- **Framework** : Next.js 14 (App Router)
- **Language** : TypeScript
- **Styles** : Tailwind CSS (dark theme, glassmorphism)
- **Base de données** : SQLite via better-sqlite3
- **Charts** : Recharts
- **PWA** : next-pwa

## Installation

```bash
npm install
```

## Lancement

```bash
# Générer les icônes PWA
node scripts/generate-icons.js

# Charger les données de démo
npm run db:seed

# Démarrer en développement
npm run dev
```

L'app est disponible sur **http://localhost:3000**

## Build production

```bash
npm run build
npm start
```

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/` | Vue d'ensemble, score du jour, citations |
| Workouts | `/workouts` | Log séances, calendrier, streak, volume |
| Santé | `/health` | Sommeil, poids, tour de taille, eau |
| Business | `/business` | Objectifs, revenus, KPIs, notes |
| Productivité | `/todos` | Todo list, récurrence, Pomodoro |

## API Routes

```
GET/POST  /api/workouts
GET       /api/workouts/stats
GET/POST  /api/sleep
GET/POST  /api/health/weight
GET/POST  /api/health/water
GET/POST  /api/business/goals
PATCH/DEL /api/business/goals/[id]
GET/POST  /api/business/revenue
GET/POST  /api/business/kpis
GET/POST  /api/business/notes
PATCH/DEL /api/business/notes/[id]
GET/POST  /api/todos
PATCH/DEL /api/todos/[id]
GET/POST  /api/pomodoro
GET       /api/dashboard
```

## Structure

```
src/
├── app/                    # Pages (App Router)
│   ├── api/               # API Routes
│   ├── workouts/
│   ├── health/
│   ├── business/
│   └── todos/
├── components/
│   ├── ui/               # Composants génériques
│   ├── dashboard/
│   ├── workouts/
│   ├── health/
│   ├── business/
│   └── todos/
└── lib/
    ├── db.ts             # SQLite + schema
    ├── types.ts
    └── utils.ts
data/
└── dashboard.db          # Fichier SQLite (créé auto)
```

## Déploiement Vercel

> **Note** : SQLite avec fichier local ne fonctionne pas sur Vercel (filesystem éphémère). Pour déployer :
> - Remplacer better-sqlite3 par [Turso](https://turso.tech) (SQLite serverless gratuit)
> - Ou utiliser [Neon](https://neon.tech) (PostgreSQL serverless gratuit)
> - Ou utiliser [Vercel KV](https://vercel.com/storage/kv)

Pour usage local (self-hosted) ou VPS, le setup actuel est parfait.

## PWA

Pour installer sur téléphone :
1. Ouvrir dans Chrome/Safari
2. "Ajouter à l'écran d'accueil"
3. L'app se lance en mode standalone (sans barre de navigation du navigateur)

## Score du jour

Le score est calculé sur 4 critères (25 pts chacun) :
- ✓ Workout fait aujourd'hui
- ✓ Sommeil ≥ 7h
- ✓ Tâches complétées (proportionnel)
- ✓ Objectif eau atteint

Un streak global se cumule les jours où le score ≥ 75%.
