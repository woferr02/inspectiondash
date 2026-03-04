"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SeverityBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  KpiCardSkeleton,
  TableSkeleton,
} from "@/components/shared/loading-skeleton";
import { useActions } from "@/hooks/use-actions";
import { useInspections } from "@/hooks/use-inspections";
import { exportToCsv } from "@/lib/csv-export";
import { cn, formatDate, severityLabel, actionStatusLabel } from "@/lib/utils";
import type { CorrectiveAction, Inspection } from "@/lib/types";
import {
  Search,
  AlertTriangle,
  RefreshCw,
  Clock,
  TrendingUp,
  Download,
  ExternalLink,
  Repeat2,
} from "lucide-react";
import { toast } from "sonner";

/* ── Derived analytics types ── */

interface CategoryGroup {
  category: string;
  total: number;
  open: number;
  critical: number;
  high: number;
}

interface RecurringFinding {
  siteId: string;
  siteName: string;
  category: string;
  occurrences: number;
  inspectionIds: string[];
  latestDate: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface ResolutionMetrics {
  avgDaysToResolve: number;
  resolvedCount: number;
  openCount: number;
  overdueCount: number;
  avgOverdueDays: number;
}

/* ── Computation helpers ── */

function computeCategoryGroups(actions: CorrectiveAction[], inspections: Inspection[]): CategoryGroup[] {
  // Map sectionId -> section name from inspections
  const sectionNames = new Map<string, string>();
  for (const insp of inspections) {
    for (const sec of insp.sections) {
      sectionNames.set(sec.id, sec.name);
    }
  }

  const groups = new Map<string, CategoryGroup>();
  for (const a of actions) {
    const category = sectionNames.get(a.sectionId) || a.sectionId || "Uncategorised";
    const existing = groups.get(category) || {
      category,
      total: 0,
      open: 0,
      critical: 0,
      high: 0,
    };
    existing.total += 1;
    if (a.status === "open" || a.status === "inProgress") existing.open += 1;
    if (a.severity === "critical") existing.critical += 1;
    if (a.severity === "high") existing.high += 1;
    groups.set(category, existing);
  }

  return Array.from(groups.values()).sort((a, b) => b.open - a.open);
}

function detectRecurring(actions: CorrectiveAction[], inspections: Inspection[]): RecurringFinding[] {
  // Build sectionId -> name map
  const sectionNames = new Map<string, string>();
  for (const insp of inspections) {
    for (const sec of insp.sections) {
      sectionNames.set(sec.id, sec.name);
    }
  }

  // Build inspectionId -> inspection map
  const inspMap = new Map(inspections.map((i) => [i.id, i]));

  // Group actions by site+category
  const key = (siteId: string, sectionId: string) => `${siteId}::${sectionId}`;
  const grouped = new Map<
    string,
    { siteId: string; siteName: string; category: string; actions: CorrectiveAction[] }
  >();

  for (const a of actions) {
    const insp = inspMap.get(a.inspectionId);
    const siteId = insp?.siteId || insp?.siteName || "unknown";
    const siteName = insp?.siteName || "Unknown Site";
    const category = sectionNames.get(a.sectionId) || a.sectionId || "Uncategorised";
    const k = key(siteId, a.sectionId);

    const existing = grouped.get(k) || { siteId, siteName, category, actions: [] };
    existing.actions.push(a);
    grouped.set(k, existing);
  }

  // Only flag as recurring if the same category appears in 2+ different inspections at the same site
  const results: RecurringFinding[] = [];
  for (const [, group] of grouped) {
    const uniqueInspections = new Set(group.actions.map((a) => a.inspectionId));
    if (uniqueInspections.size >= 2) {
      const sorted = group.actions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      results.push({
        siteId: group.siteId,
        siteName: group.siteName,
        category: group.category,
        occurrences: uniqueInspections.size,
        inspectionIds: Array.from(uniqueInspections),
        latestDate: sorted[0].createdAt,
        severity: sorted[0].severity,
      });
    }
  }

  return results.sort((a, b) => b.occurrences - a.occurrences);
}

function computeResolutionMetrics(actions: CorrectiveAction[]): ResolutionMetrics {
  const now = new Date();
  const resolved = actions.filter((a) => a.status === "resolved" || a.status === "closed");
  const open = actions.filter((a) => a.status === "open" || a.status === "inProgress");
  const overdue = open.filter((a) => a.dueDate && new Date(a.dueDate) < now);

  let totalDays = 0;
  let resolvedWithDates = 0;
  for (const a of resolved) {
    if (a.resolvedAt && a.createdAt) {
      const days = (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / 86400000;
      if (days >= 0) {
        totalDays += days;
        resolvedWithDates += 1;
      }
    }
  }

  let totalOverdueDays = 0;
  for (const a of overdue) {
    if (a.dueDate) {
      totalOverdueDays += (now.getTime() - new Date(a.dueDate).getTime()) / 86400000;
    }
  }

  return {
    avgDaysToResolve: resolvedWithDates > 0 ? Math.round(totalDays / resolvedWithDates) : 0,
    resolvedCount: resolved.length,
    openCount: open.length,
    overdueCount: overdue.length,
    avgOverdueDays: overdue.length > 0 ? Math.round(totalOverdueDays / overdue.length) : 0,
  };
}

/* ── Recurring findings table columns ── */

const recurringColumns: Column<RecurringFinding>[] = [
  {
    key: "siteName",
    label: "Site",
    sortable: true,
    className: "text-sm font-medium",
    render: (r) => r.siteName,
    sortValue: (r) => r.siteName.toLowerCase(),
  },
  {
    key: "category",
    label: "Category",
    sortable: true,
    className: "text-sm",
    render: (r) => r.category,
    sortValue: (r) => r.category.toLowerCase(),
  },
  {
    key: "occurrences",
    label: "Occurrences",
    sortable: true,
    className: "text-sm text-center",
    render: (r) => (
      <Badge
        variant="secondary"
        className={cn(
          "text-xs font-bold",
          r.occurrences >= 4
            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            : r.occurrences >= 3
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
        )}
      >
        {r.occurrences}× across inspections
      </Badge>
    ),
    sortValue: (r) => r.occurrences,
  },
  {
    key: "severity",
    label: "Latest Severity",
    sortable: true,
    render: (r) => <SeverityBadge severity={r.severity} />,
    sortValue: (r) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[r.severity];
    },
  },
  {
    key: "latestDate",
    label: "Last Seen",
    sortable: true,
    className: "text-sm text-muted-foreground whitespace-nowrap",
    render: (r) => formatDate(r.latestDate),
    sortValue: (r) => r.latestDate,
  },
];

/* ── High-severity unresolved table ── */

const unresolvedColumns: Column<CorrectiveAction>[] = [
  {
    key: "title",
    label: "Finding",
    sortable: true,
    className: "text-sm font-medium max-w-[280px] truncate",
    render: (a) => a.title,
    sortValue: (a) => a.title.toLowerCase(),
  },
  {
    key: "severity",
    label: "Severity",
    sortable: true,
    render: (a) => <SeverityBadge severity={a.severity} />,
    sortValue: (a) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity];
    },
  },
  {
    key: "assignee",
    label: "Assignee",
    className: "text-sm text-muted-foreground",
    render: (a) => a.assignee || "Unassigned",
  },
  {
    key: "dueDate",
    label: "Due",
    sortable: true,
    className: "text-sm whitespace-nowrap",
    render: (a) => {
      const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
      return (
        <span className={isOverdue ? "text-red-600 font-medium dark:text-red-400" : "text-muted-foreground"}>
          {formatDate(a.dueDate)}
        </span>
      );
    },
    sortValue: (a) => a.dueDate || "9999",
  },
  {
    key: "inspection",
    label: "",
    className: "text-sm",
    render: (a) => (
      <Link
        href={`/inspections/${a.inspectionId}`}
        className="inline-flex items-center gap-1 text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        View <ExternalLink className="h-3 w-3" />
      </Link>
    ),
  },
];

/* ── Page ── */

export default function FindingsPage() {
  const { actions, loading: actionsLoading } = useActions();
  const { inspections, loading: inspLoading } = useInspections();

  const loading = actionsLoading || inspLoading;

  const categoryGroups = useMemo(
    () => computeCategoryGroups(actions, inspections),
    [actions, inspections]
  );

  const recurring = useMemo(
    () => detectRecurring(actions, inspections),
    [actions, inspections]
  );

  const metrics = useMemo(() => computeResolutionMetrics(actions), [actions]);

  const highSeverityUnresolved = useMemo(
    () =>
      actions
        .filter(
          (a) =>
            (a.severity === "critical" || a.severity === "high") &&
            (a.status === "open" || a.status === "inProgress")
        )
        .sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return order[a.severity] - order[b.severity] || a.createdAt.localeCompare(b.createdAt);
        }),
    [actions]
  );

  const handleExportRecurring = () => {
    exportToCsv("recurring-findings", recurring, [
      { header: "Site", value: (r) => r.siteName },
      { header: "Category", value: (r) => r.category },
      { header: "Occurrences", value: (r) => r.occurrences },
      { header: "Latest Severity", value: (r) => severityLabel(r.severity) },
      { header: "Last Seen", value: (r) => r.latestDate },
    ]);
    toast.success("Recurring findings exported");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Findings Intelligence" subtitle="Analysing patterns..." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const kpis = [
    {
      label: "Open Findings",
      value: metrics.openCount,
      change: metrics.overdueCount,
      trend: metrics.overdueCount > 0 ? ("down" as const) : ("up" as const),
    },
    {
      label: "Avg. Resolution Time",
      value: metrics.avgDaysToResolve > 0 ? `${metrics.avgDaysToResolve}d` : "—",
      change: 0,
      trend: "neutral" as const,
    },
    {
      label: "Recurring Issues",
      value: recurring.length,
      change: recurring.filter((r) => r.occurrences >= 3).length,
      trend: recurring.length > 0 ? ("down" as const) : ("up" as const),
    },
    {
      label: "Overdue",
      value: metrics.overdueCount,
      change: metrics.avgOverdueDays,
      trend: metrics.overdueCount > 0 ? ("down" as const) : ("up" as const),
    },
  ];

  const kpiIcons = [AlertTriangle, Clock, Repeat2, TrendingUp] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Findings Intelligence"
        subtitle="Pattern detection, recurring issues, and resolution tracking"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportRecurring}
            disabled={recurring.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Recurring
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} icon={kpiIcons[i]} />
        ))}
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open Findings by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No findings data available yet.
            </p>
          ) : (
            <div className="space-y-2">
              {categoryGroups.slice(0, 12).map((g) => {
                const maxOpen = Math.max(...categoryGroups.map((c) => c.open), 1);
                return (
                  <div key={g.category} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm text-foreground font-medium">
                      {g.category}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          g.critical > 0
                            ? "bg-red-500 dark:bg-red-600"
                            : g.high > 0
                              ? "bg-amber-500 dark:bg-amber-600"
                              : "bg-primary"
                        )}
                        style={{ width: `${(g.open / maxOpen) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 min-w-[80px] justify-end">
                      <span className="text-sm font-bold">{g.open}</span>
                      <span className="text-xs text-muted-foreground">
                        / {g.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring non-conformities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base">Recurring Non-Conformities</CardTitle>
            </div>
            {recurring.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {recurring.length} pattern{recurring.length !== 1 ? "s" : ""} detected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <EmptyState
              icon={<RefreshCw className="h-10 w-10" />}
              title="No recurring issues detected"
              description="Issues that appear at the same site across multiple inspections will be flagged here."
            />
          ) : (
            <DataTable
              data={recurring}
              columns={recurringColumns}
              searchPlaceholder="Search recurring findings..."
              searchFn={(item, q) =>
                item.siteName.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q)
              }
              getRowKey={(r) => `${r.siteId}-${r.category}`}
            />
          )}
        </CardContent>
      </Card>

      {/* High-severity unresolved */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <CardTitle className="text-base">
              High &amp; Critical Unresolved ({highSeverityUnresolved.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {highSeverityUnresolved.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-10 w-10" />}
              title="All clear"
              description="No unresolved high or critical severity findings."
            />
          ) : (
            <DataTable
              data={highSeverityUnresolved}
              columns={unresolvedColumns}
              searchPlaceholder="Search findings..."
              searchFn={(item, q) =>
                item.title.toLowerCase().includes(q) ||
                (item.assignee || "").toLowerCase().includes(q)
              }
              getRowKey={(a) => a.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
