"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecentInspections } from "@/components/dashboard/recent-inspections";
import { ActionSummary } from "@/components/dashboard/action-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  KpiCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import {
  ClipboardCheck,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { subDays, parseISO } from "date-fns";

const kpiIcons = [ClipboardCheck, Target, AlertTriangle, Clock];
const kpiHrefs = ["/inspections", "/analytics", "/actions", "/actions"];

export default function DashboardPage() {
  const { kpis, actionSummary, inspections, loading, error } =
    useAnalytics();

  const attentionItems = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    const recentFailed = inspections.filter((i) => {
      try {
        return parseISO(i.date) >= cutoff && i.score !== null && i.score < 50;
      } catch {
        return false;
      }
    });
    return { recentFailed };
  }, [inspections]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your organization's compliance status"
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
          Failed to load data: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} icon={kpiIcons[i]} href={kpiHrefs[i]} />
            ))}
      </div>

      {/* Needs Attention + Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Needs Attention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionSummary.overdue > 0 && (
                  <Link
                    href="/actions"
                    className="flex items-center justify-between rounded-lg bg-red-50 p-3 transition-colors hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        Overdue Actions
                      </span>
                    </div>
                    <span className="text-sm font-bold text-red-700 dark:text-red-400">
                      {actionSummary.overdue}
                    </span>
                  </Link>
                )}
                {actionSummary.open > 0 && (
                  <Link
                    href="/actions"
                    className="flex items-center justify-between rounded-lg bg-amber-50 p-3 transition-colors hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        Open Actions
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {actionSummary.open}
                    </span>
                  </Link>
                )}
                {attentionItems.recentFailed.length > 0 && (
                  <Link
                    href="/inspections"
                    className="flex items-center justify-between rounded-lg bg-orange-50 p-3 transition-colors hover:bg-orange-100 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                        Low Scores (7d)
                      </span>
                    </div>
                    <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                      {attentionItems.recentFailed.length}
                    </span>
                  </Link>
                )}
                {actionSummary.overdue === 0 &&
                  actionSummary.open === 0 &&
                  attentionItems.recentFailed.length === 0 && (
                    <div className="flex flex-col items-center py-8 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                      <p className="text-sm font-medium text-foreground">
                        All Clear
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        No immediate issues require your attention.
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
        <div>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ActionSummary data={actionSummary} />
          )}
        </div>
      </div>

      {/* Recent inspections */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <RecentInspections inspections={inspections} />
      )}
    </div>
  );
}
