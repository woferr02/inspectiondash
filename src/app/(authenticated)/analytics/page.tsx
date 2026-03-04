"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ComplianceChart } from "@/components/dashboard/compliance-chart";
import { ActionSummary } from "@/components/dashboard/action-summary";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  KpiCardSkeleton,
  ChartSkeleton,
} from "@/components/shared/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Target,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
} from "lucide-react";
import { useMemo, useState } from "react";
import { subDays, parseISO, isAfter } from "date-fns";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "sonner";
import Link from "next/link";

const kpiIcons = [ClipboardCheck, Target, AlertTriangle, Clock];

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export default function AnalyticsPage() {
  const { kpis, complianceTrend, actionSummary, inspections, actions, loading, error } =
    useAnalytics();
  const [range, setRange] = useState("30");

  // Filter inspections by date range
  const filteredInspections = useMemo(() => {
    if (range === "all") return inspections;
    const cutoff = subDays(new Date(), Number(range));
    return inspections.filter((i) => {
      try {
        return isAfter(parseISO(i.date), cutoff);
      } catch {
        return false;
      }
    });
  }, [inspections, range]);

  const filteredActions = useMemo(() => {
    if (range === "all") return actions;
    const cutoff = subDays(new Date(), Number(range));
    return actions.filter((a) => {
      try {
        return isAfter(parseISO(a.createdAt), cutoff);
      } catch {
        return false;
      }
    });
  }, [actions, range]);

  // Site-level breakdown: avg score per site
  const siteBreakdown = useMemo(() => {
    const map: Record<string, { total: number; scores: number[]; siteId?: string }> = {};
    for (const insp of filteredInspections) {
      const site = insp.siteName || "Unassigned";
      if (!map[site]) map[site] = { total: 0, scores: [], siteId: insp.siteId };
      map[site].total++;
      if (insp.score !== null) map[site].scores.push(insp.score);
    }
    return Object.entries(map)
      .map(([name, { total, scores, siteId }]) => ({
        name,
        siteId,
        count: total,
        avgScore:
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredInspections]);

  // Inspector breakdown
  const inspectorBreakdown = useMemo(() => {
    const map: Record<string, { total: number; scores: number[] }> = {};
    for (const insp of filteredInspections) {
      const name = insp.inspectorName || "Unknown";
      if (!map[name]) map[name] = { total: 0, scores: [] };
      map[name].total++;
      if (insp.score !== null) map[name].scores.push(insp.score);
    }
    return Object.entries(map)
      .map(([name, { total, scores }]) => ({
        name,
        count: total,
        avgScore:
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredInspections]);

  const handleExport = () => {
    exportToCsv("analytics-export", filteredInspections, [
      { header: "Date", value: (i) => i.date },
      { header: "Name", value: (i) => i.name },
      { header: "Site", value: (i) => i.siteName },
      { header: "Inspector", value: (i) => i.inspectorName },
      { header: "Score", value: (i) => i.score },
      { header: "Status", value: (i) => i.status },
    ]);
    toast.success("Analytics data exported to CSV");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Compliance intelligence and performance insights"
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rangeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredInspections.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Failed to load analytics data: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} icon={kpiIcons[i]} />
            ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ComplianceChart data={complianceTrend} />
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

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Site breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Site</CardTitle>
          </CardHeader>
          <CardContent>
            {siteBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No inspection data for this period
              </p>
            ) : (
              <div className="space-y-3">
                {siteBreakdown.map((site) => (
                  <div
                    key={site.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {site.siteId ? (
                        <Link href={`/sites/${site.siteId}`} className="truncate font-medium hover:text-primary hover:underline">
                          {site.name}
                        </Link>
                      ) : (
                        <span className="truncate font-medium">{site.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {site.count} insp.
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {site.avgScore !== null ? (
                        <>
                          {site.avgScore >= 80 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          ) : site.avgScore >= 50 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                          )}
                          <span
                            className={
                              site.avgScore >= 80
                                ? "text-emerald-700 font-medium"
                                : site.avgScore >= 50
                                  ? "text-amber-700 font-medium"
                                  : "text-red-700 font-medium"
                            }
                          >
                            {site.avgScore}%
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inspector breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Inspector</CardTitle>
          </CardHeader>
          <CardContent>
            {inspectorBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No inspection data for this period
              </p>
            ) : (
              <div className="space-y-3">
                {inspectorBreakdown.map((inspector) => (
                  <div
                    key={inspector.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium">{inspector.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {inspector.count} insp.
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {inspector.avgScore !== null ? (
                        <span
                          className={
                            inspector.avgScore >= 80
                              ? "text-emerald-700 font-medium"
                              : inspector.avgScore >= 50
                                ? "text-amber-700 font-medium"
                                : "text-red-700 font-medium"
                          }
                        >
                          {inspector.avgScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
