"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ComplianceChart } from "@/components/dashboard/compliance-chart";
import { ActionSummary } from "@/components/dashboard/action-summary";
import { useAnalytics } from "@/hooks/use-analytics";
import { useIncidents } from "@/hooks/use-incidents";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ClipboardCheck,
  Target,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  FileBarChart,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { subDays, parseISO, isAfter } from "date-fns";
import { exportToCsv } from "@/lib/csv-export";
import { toast } from "sonner";
import { inspectionStatusLabel, cn } from "@/lib/utils";
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
  const { incidents } = useIncidents();
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
      const site = insp.siteName || "No site assigned";
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

  // Template breakdown (merged from Templates page)
  const templateBreakdown = useMemo(() => {
    const map: Record<string, { name: string; count: number; scores: number[]; lastDate: string }> = {};
    for (const insp of filteredInspections) {
      const key = insp.templateId || insp.name;
      if (!map[key]) map[key] = { name: insp.name, count: 0, scores: [], lastDate: "" };
      map[key].count++;
      if (insp.score !== null) map[key].scores.push(insp.score);
      if (insp.date > map[key].lastDate) map[key].lastDate = insp.date;
    }
    return Object.entries(map)
      .map(([id, { name, count, scores, lastDate }]) => ({
        id,
        name,
        count,
        avgScore:
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null,
        lastDate,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filteredInspections]);

  // ─── Export handlers ───
  const handleAnalyticsExport = () => {
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

  const handleFullExport = () => {
    exportToCsv("full-inspection-report", inspections, [
      { header: "ID", value: (i) => i.id },
      { header: "Date", value: (i) => i.date },
      { header: "Name", value: (i) => i.name },
      { header: "Site", value: (i) => i.siteName },
      { header: "Address", value: (i) => i.siteAddress },
      { header: "Inspector", value: (i) => i.inspectorName },
      { header: "Score", value: (i) => i.score },
      { header: "Status", value: (i) => inspectionStatusLabel(i.status) },
      { header: "Sections", value: (i) => i.sections.length },
    ]);
    toast.success("Full inspection report exported");
  };

  const handleActionsExport = () => {
    exportToCsv("corrective-actions-report", actions, [
      { header: "Title", value: (a) => a.title },
      { header: "Description", value: (a) => a.description },
      { header: "Severity", value: (a) => a.severity },
      { header: "Status", value: (a) => a.status },
      { header: "Assignee", value: (a) => a.assignee },
      { header: "Due Date", value: (a) => a.dueDate },
      { header: "Created", value: (a) => a.createdAt },
      { header: "Resolved", value: (a) => a.resolvedAt },
    ]);
    toast.success("Corrective actions report exported");
  };

  const handleIncidentsExport = () => {
    exportToCsv("incidents-report", incidents, [
      { header: "Title", value: (inc) => inc.title },
      { header: "Type", value: (inc) => inc.type.replace(/_/g, " ") },
      { header: "Severity", value: (inc) => inc.severity },
      { header: "Status", value: (inc) => inc.status.replace(/_/g, " ") },
      { header: "Site", value: (inc) => inc.siteName },
      { header: "Occurred At", value: (inc) => inc.occurredAt },
      { header: "Reported By", value: (inc) => inc.reportedByEmail },
      { header: "RIDDOR", value: (inc) => inc.riddorReportable ? "Yes" : "No" },
      { header: "Injured Persons", value: (inc) => inc.injuredPersons ?? 0 },
      { header: "Description", value: (inc) => inc.description ?? "" },
    ]);
    toast.success("Incidents report exported");
  };

  const handleJsonExport = () => {
    const blob = new Blob([JSON.stringify(inspections, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspections-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON export downloaded");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Compliance intelligence, performance insights, and data exports"
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
            <Button variant="outline" size="sm" onClick={handleAnalyticsExport} disabled={filteredInspections.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
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

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="templates">Template Performance</TabsTrigger>
          <TabsTrigger value="exports">Export Data</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Insights (original analytics content) ─── */}
        <TabsContent value="insights" className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {loading ? <ChartSkeleton /> : <ComplianceChart data={complianceTrend} />}
            </div>
            <div>
              {loading ? <ChartSkeleton /> : <ActionSummary data={actionSummary} />}
            </div>
          </div>

          {/* Performance breakdowns */}
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
                      <div key={site.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {site.siteId ? (
                            <Link href={`/sites/${site.siteId}`} className="truncate font-medium hover:text-primary hover:underline">
                              {site.name}
                            </Link>
                          ) : (
                            <span className="truncate font-medium text-muted-foreground italic">{site.name}</span>
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
                              <span className={
                                site.avgScore >= 80 ? "text-emerald-700 font-medium" :
                                site.avgScore >= 50 ? "text-amber-700 font-medium" : "text-red-700 font-medium"
                              }>
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
                      <div key={inspector.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate font-medium">{inspector.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {inspector.count} insp.
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {inspector.avgScore !== null ? (
                            <span className={
                              inspector.avgScore >= 80 ? "text-emerald-700 font-medium" :
                              inspector.avgScore >= 50 ? "text-amber-700 font-medium" : "text-red-700 font-medium"
                            }>
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
        </TabsContent>

        {/* ─── TAB 2: Template Performance (merged from Templates page) ─── */}
        <TabsContent value="templates" className="space-y-6">
          {templateBreakdown.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No template data for this period. Templates appear here once inspections are completed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Template summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{templateBreakdown.length}</p>
                      <p className="text-xs text-muted-foreground">Templates Used</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{filteredInspections.length}</p>
                      <p className="text-xs text-muted-foreground">Inspections in Period</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {templateBreakdown.length > 0
                          ? Math.round(filteredInspections.length / templateBreakdown.length * 10) / 10
                          : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg. Uses / Template</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Template table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Template Name</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Times Used</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg. Score</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templateBreakdown.map((tpl) => (
                          <tr key={tpl.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{tpl.name}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{tpl.count}</td>
                            <td className="px-4 py-3 text-right">
                              {tpl.avgScore !== null ? (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs font-medium tabular-nums",
                                    tpl.avgScore >= 80
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                      : tpl.avgScore >= 50
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                        : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                                  )}
                                >
                                  {tpl.avgScore}%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                              {tpl.lastDate ? new Date(tpl.lastDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── TAB 3: Export Data (merged from Reports page) ─── */}
        <TabsContent value="exports" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Inspection Report</CardTitle>
                    <p className="text-sm text-muted-foreground">{inspections.length} inspections — CSV</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Every inspection with date, site, inspector, score, and status.
                </p>
                <Button onClick={handleFullExport} disabled={inspections.length === 0} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Corrective Actions</CardTitle>
                    <p className="text-sm text-muted-foreground">{actions.length} actions — CSV</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  All corrective actions — severity, assignee, due dates, and resolution status.
                </p>
                <Button onClick={handleActionsExport} disabled={actions.length === 0} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Incidents Report</CardTitle>
                    <p className="text-sm text-muted-foreground">{incidents.length} incidents — CSV</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  All incidents including type, severity, RIDDOR status, and actions taken.
                </p>
                <Button onClick={handleIncidentsExport} disabled={incidents.length === 0} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                    <FileBarChart className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Full Data Export</CardTitle>
                    <p className="text-sm text-muted-foreground">{inspections.length} inspections — JSON</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete inspection dataset as JSON for integrations and custom reporting.
                </p>
                <Button variant="outline" disabled={inspections.length === 0} onClick={handleJsonExport} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Download JSON
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
