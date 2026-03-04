"use client";

import { useMemo } from "react";
import { useInspections } from "./use-inspections";
import { useActions } from "./use-actions";
import type { ComplianceTrendPoint, KpiData } from "@/lib/types";
import { subDays, parseISO, format, startOfWeek } from "date-fns";

export function useAnalytics() {
  const { inspections, loading: inspLoading, error: inspError } = useInspections();
  const { actions, loading: actLoading, error: actError } = useActions();

  const loading = inspLoading || actLoading;
  const error = inspError || actError;

  const kpis = useMemo((): KpiData[] => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    const recent = inspections.filter(
      (i) => parseISO(i.date) >= thirtyDaysAgo
    );
    const previous = inspections.filter(
      (i) => parseISO(i.date) >= sixtyDaysAgo && parseISO(i.date) < thirtyDaysAgo
    );

    // Total inspections (30d)
    const totalRecent = recent.length;
    const totalPrevious = previous.length;
    const totalChange =
      totalPrevious > 0
        ? ((totalRecent - totalPrevious) / totalPrevious) * 100
        : 0;

    // Average score (30d)
    const scoredRecent = recent.filter((i) => i.score !== null);
    const scoredPrevious = previous.filter((i) => i.score !== null);
    const avgRecent =
      scoredRecent.length > 0
        ? scoredRecent.reduce((sum, i) => sum + (i.score ?? 0), 0) /
          scoredRecent.length
        : 0;
    const avgPrevious =
      scoredPrevious.length > 0
        ? scoredPrevious.reduce((sum, i) => sum + (i.score ?? 0), 0) /
          scoredPrevious.length
        : 0;
    const scoreChange = avgPrevious > 0 ? avgRecent - avgPrevious : 0;

    // Open actions
    const openActions = actions.filter(
      (a) => a.status === "open" || a.status === "inProgress"
    ).length;

    // Track action creation rate for trend
    const actionsCreatedRecent = actions.filter((a) => {
      try { return parseISO(a.createdAt) >= thirtyDaysAgo; } catch { return false; }
    }).length;
    const actionsCreatedPrevious = actions.filter((a) => {
      try {
        const d = parseISO(a.createdAt);
        return d >= sixtyDaysAgo && d < thirtyDaysAgo;
      } catch { return false; }
    }).length;
    const actionsRateChange = actionsCreatedPrevious > 0
      ? Math.round(((actionsCreatedRecent - actionsCreatedPrevious) / actionsCreatedPrevious) * 100)
      : 0;

    // Overdue actions
    const overdueActions = actions.filter(
      (a) =>
        (a.status === "open" || a.status === "inProgress") &&
        a.dueDate &&
        parseISO(a.dueDate) < now
    ).length;

    return [
      {
        label: "Inspections (30d)",
        value: totalRecent,
        change: Math.round(totalChange),
        trend: totalChange >= 0 ? "up" : "down",
      },
      {
        label: "Avg. Score",
        value: `${Math.round(avgRecent)}%`,
        change: Math.round(scoreChange),
        trend: scoreChange >= 0 ? "up" : "down",
      },
      {
        label: "Open Actions",
        value: openActions,
        change: Math.abs(actionsRateChange),
        trend: actionsRateChange <= 0 ? "up" : "down",
      },
      {
        label: "Overdue",
        value: overdueActions,
        change: 0,
        trend: overdueActions > 0 ? "down" : "up",
      },
    ];
  }, [inspections, actions]);

  const complianceTrend = useMemo((): ComplianceTrendPoint[] => {
    // Group inspections by week for the last 12 weeks
    const weeks: Record<string, { scores: number[]; count: number }> = {};
    const twelveWeeksAgo = subDays(new Date(), 84);

    inspections
      .filter((i) => parseISO(i.date) >= twelveWeeksAgo && i.score !== null)
      .forEach((i) => {
        const weekStart = format(
          startOfWeek(parseISO(i.date), { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        );
        if (!weeks[weekStart]) weeks[weekStart] = { scores: [], count: 0 };
        weeks[weekStart].scores.push(i.score ?? 0);
        weeks[weekStart].count++;
      });

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { scores, count }]) => ({
        date,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        inspectionCount: count,
      }));
  }, [inspections]);

  const actionSummary = useMemo(() => {
    const open = actions.filter((a) => a.status === "open").length;
    const inProgress = actions.filter((a) => a.status === "inProgress").length;
    const resolved = actions.filter((a) => a.status === "resolved").length;
    const closed = actions.filter((a) => a.status === "closed").length;
    const overdue = actions.filter(
      (a) =>
        (a.status === "open" || a.status === "inProgress") &&
        a.dueDate &&
        parseISO(a.dueDate) < new Date()
    ).length;

    return { open, inProgress, resolved, closed, overdue, total: actions.length };
  }, [actions]);

  return { kpis, complianceTrend, actionSummary, inspections, actions, loading, error };
}
