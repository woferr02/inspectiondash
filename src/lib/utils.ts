import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { ActionSeverity, ActionStatus, InspectionStatus } from "./types";

// ─── Class name merging (shadcn standard) ───
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Score color helpers ───
export function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-score-high";
  if (score >= 50) return "text-score-mid";
  return "text-score-low";
}

export function scoreBgColor(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 80) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
  if (score >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
  return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";
}

// ─── Status badge helpers ───
export function inspectionStatusColor(status: InspectionStatus): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    case "inProgress":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
    case "completed":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
    case "submitted":
      return "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400";
    case "archived":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }
}

export function inspectionStatusLabel(status: InspectionStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "inProgress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "submitted":
      return "Submitted";
    case "archived":
      return "Archived";
  }
}

export function severityColor(severity: ActionSeverity): string {
  switch (severity) {
    case "low":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
    case "medium":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
    case "high":
      return "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400";
    case "critical":
      return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";
  }
}

export function severityLabel(severity: ActionSeverity): string {
  switch (severity) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "critical":
      return "Critical";
  }
}

export function actionStatusColor(status: ActionStatus): string {
  switch (status) {
    case "open":
      return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";
    case "inProgress":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
    case "resolved":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
    case "closed":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  }
}

export function actionStatusLabel(status: ActionStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "inProgress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
  }
}

// ─── Date formatting ───
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "—";
  }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

// ─── Number formatting ───
export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value)}%`;
}

export function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}
