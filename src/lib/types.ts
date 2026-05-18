export interface Workout {
  id: number;
  date: string;
  type: "musculation" | "cardio" | "autre";
  duration_min: number;
  notes?: string;
  created_at: string;
  exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: number;
  workout_id: number;
  name: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
}

export interface SleepLog {
  id: number;
  date: string;
  bedtime?: string;
  wake_time?: string;
  duration_h: number;
  quality: number;
  energy_score?: number;
  created_at: string;
}

export interface WeightLog {
  id: number;
  date: string;
  weight_kg: number;
  waist_cm?: number;
  created_at: string;
}

export interface WaterLog {
  id: number;
  date: string;
  glasses: number;
  goal: number;
  created_at: string;
}

export interface BusinessGoal {
  id: number;
  title: string;
  description?: string;
  target_date?: string;
  status: "active" | "completed" | "paused";
  progress: number;
  created_at: string;
}

export interface RevenueLog {
  id: number;
  year: number;
  month: number;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface KPI {
  id: number;
  name: string;
  value: number;
  unit?: string;
  target?: number;
  date: string;
  created_at: string;
}

export interface BusinessNote {
  id: number;
  content: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  date: string;
  recurring?: "daily" | "weekly";
  recurring_day?: number;
  created_at: string;
  completed_at?: string;
}

export interface Quote {
  id: number;
  text: string;
  author: string;
}

export interface PomodoroSession {
  id: number;
  date: string;
  duration_min: number;
  completed: boolean;
  created_at: string;
}

export interface DayScore {
  workout: boolean;
  sleep: boolean;
  tasks: number;
  water: boolean;
  total: number;
}
