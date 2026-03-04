"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { useAnalytics } from "@/hooks/use-analytics";
import { useIncidents } from "@/hooks/use-incidents";
import { KpiCardSkeleton } from "@/components/shared/loading-skeleton";
import { exportToCsv } from "@/lib/csv-export";
import {
  FileBarChart,
  Download,
  ClipboardCheck,
  ShieldAlert,
  AlertTriangle,
  Target,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { inspectionStatusLabel } from "@/lib/utils";
import { format } from "date-fns";

export default function ReportsPage() {
  const { kpis, inspections, actions, loading } = useAnalytics();
  const { incidents } = useIncidents();

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
      { header: "Immediate Actions", value: (inc) => inc.immediateActions ?? "" },
      { header: "Description", value: (inc) => inc.description ?? "" },
    ]);
    toast.success("Incidents report exported");
  };

  const handleJsonExport = () => {
    const blob = new Blob([JSON.stringify(inspections, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspections-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON export downloaded");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" subtitle="Export compliance data across your organization" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const kpiIcons = [ClipboardCheck, Target, AlertTriangle, Clock] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Export compliance data across your organization"
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} icon={kpiIcons[i]} />
        ))}
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Inspection Report</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {inspections.length} inspections — CSV
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Every inspection with date, site, inspector, score, and status.
              Import into Excel or Google Sheets for custom analysis.
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
                <CardTitle className="text-base">Corrective Actions Report</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {actions.length} actions — CSV
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              All corrective actions — severity, assignee, due dates, and
              resolution status for remediation tracking.
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
                <p className="text-sm text-muted-foreground">
                  {incidents.length} incidents — CSV
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              All incidents including type, severity, RIDDOR status, injured
              persons, and immediate actions taken.
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
                <p className="text-sm text-muted-foreground">
                  {inspections.length} inspections — JSON
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Complete inspection dataset as JSON, including sections and
              questions. Ideal for integrations and custom reporting pipelines.
            </p>
            <Button variant="outline" disabled={inspections.length === 0} onClick={handleJsonExport} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
