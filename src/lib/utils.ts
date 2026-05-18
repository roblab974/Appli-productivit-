import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: fr });
}

export function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export function getWeekDays(date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function isTodayDate(dateStr: string) {
  try { return isToday(parseISO(dateStr)); }
  catch { return false; }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
