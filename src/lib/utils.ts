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
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 50) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

// ─── Status badge helpers ───
export function inspectionStatusColor(status: InspectionStatus): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-600";
    case "inProgress":
      return "bg-blue-50 text-blue-700";
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "submitted":
      return "bg-teal-50 text-teal-700";
    case "archived":
      return "bg-slate-100 text-slate-500";
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
      return "bg-emerald-50 text-emerald-700";
    case "medium":
      return "bg-amber-50 text-amber-700";
    case "high":
      return "bg-orange-50 text-orange-700";
    case "critical":
      return "bg-red-50 text-red-700";
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
      return "bg-red-50 text-red-700";
    case "inProgress":
      return "bg-amber-50 text-amber-700";
    case "resolved":
      return "bg-emerald-50 text-emerald-700";
    case "closed":
      return "bg-slate-100 text-slate-500";
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
