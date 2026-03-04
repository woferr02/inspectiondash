"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecentInspections } from "@/components/dashboard/recent-inspections";
import { ActionSummary } from "@/components/dashboard/action-summary";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSites } from "@/hooks/use-sites";
import { useActions } from "@/hooks/use-actions";
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
  MapPin,
} from "lucide-react";
import { subDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const kpiIcons = [ClipboardCheck, Target, AlertTriangle, Clock];
const kpiHrefs = ["/inspections", "/analytics", "/actions", "/actions"];

interface SiteRisk {
  id: string;
  name: string;
  latestScore: number | null;
  openActions: number;
  overdueActions: number;
  riskScore: number; // composite: lower is worse
}

export default function DashboardPage() {
  const { kpis, actionSummary, inspections, loading: analyticsLoading, error } =
    useAnalytics();
  const { sites, loading: sitesLoading } = useSites();
  const { actions, loading: actionsLoading } = useActions();

  const loading = analyticsLoading || sitesLoading || actionsLoading;

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

  /** Sites ranked by composite risk: low score + open/overdue actions = higher risk. */
  const siteRiskRanking = useMemo(() => {
    if (sites.length === 0) return [];

    const now = new Date().toISOString();
    const ranking: SiteRisk[] = sites.map((site) => {
      // Latest inspection score for this site
      const siteInspections = inspections.filter(
        (i) => (i.siteId && i.siteId === site.id) || (!i.siteId && i.siteName === site.name)
      );
      const latest = siteInspections[0]; // already sorted desc by date
      const latestScore = latest?.score ?? null;

      // Open/overdue actions for this site
      const siteActions = actions.filter((a) => {
        const insp = inspections.find((i) => i.id === a.inspectionId);
        return insp && ((insp.siteId && insp.siteId === site.id) || (!insp.siteId && insp.siteName === site.name));
      });
      const openActions = siteActions.filter(
        (a) => a.status === "open" || a.status === "inProgress"
      ).length;
      const overdueActions = siteActions.filter(
        (a) =>
          (a.status === "open" || a.status === "inProgress") &&
          a.dueDate &&
          a.dueDate < now
      ).length;

      // Composite risk score: 0 = highest risk, 100 = lowest risk
      const scoreComponent = latestScore !== null ? latestScore : 50;
      const actionPenalty = Math.min(openActions * 5 + overdueActions * 15, 50);
      const riskScore = Math.max(0, scoreComponent - actionPenalty);

      return { id: site.id, name: site.name, latestScore, openActions, overdueActions, riskScore };
    });

    return ranking.sort((a, b) => a.riskScore - b.riskScore).slice(0, 10);
  }, [sites, inspections, actions]);

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

      {/* Needs Attention + Actions row */}
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

      {/* Site Risk Ranking */}
      {!loading && siteRiskRanking.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Sites by Risk Level</CardTitle>
              </div>
              <Link href="/sites" className="text-xs text-primary hover:underline">
                View all sites
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {siteRiskRanking.map((site) => (
                <Link
                  key={site.id}
                  href={`/sites/${site.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium truncate">{site.name}</span>
                    {site.overdueActions > 0 && (
                      <Badge variant="secondary" className="bg-red-50 text-red-700 text-xs dark:bg-red-950/30 dark:text-red-400">
                        {site.overdueActions} overdue
                      </Badge>
                    )}
                    {site.openActions > 0 && site.overdueActions === 0 && (
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs dark:bg-amber-950/30 dark:text-amber-400">
                        {site.openActions} open
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ScoreBadge score={site.latestScore} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent inspections */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <RecentInspections inspections={inspections} />
      )}
    </div>
  );
}
