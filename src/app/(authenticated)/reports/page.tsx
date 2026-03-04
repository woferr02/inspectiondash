"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { useAnalytics } from "@/hooks/use-analytics";
import { KpiCardSkeleton } from "@/components/shared/loading-skeleton";
import { exportToCsv } from "@/lib/csv-export";
import {
  FileBarChart,
  Download,
  ClipboardCheck,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { inspectionStatusLabel } from "@/lib/utils";
import Link from "next/link";

export default function ReportsPage() {
  const { kpis, inspections, actions, loading } = useAnalytics();

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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" subtitle="Generate and download compliance reports" />
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
        subtitle="Generate and download compliance reports"
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} icon={kpiIcons[i]} />
        ))}
      </div>

      {/* Report types */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Full Inspection Report</CardTitle>
                <p className="text-sm text-muted-foreground">
                  All {inspections.length} inspections with scores and status
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download a CSV containing every inspection, including date, site,
              inspector, score, and status. Import into Excel or Google Sheets for
              custom analysis.
            </p>
            <Button onClick={handleFullExport} disabled={inspections.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Corrective Actions Report</CardTitle>
                <p className="text-sm text-muted-foreground">
                  All {actions.length} corrective actions with severity and status
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all corrective actions — severity, assignee, due dates, and
              resolution status. Track open issues and remediation timelines.
            </p>
            <Button onClick={handleActionsExport} disabled={actions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Site Compliance Report</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Compliance summary by site
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View per-site compliance scores and inspection frequency.
              Available from the Analytics page with date filtering.
            </p>
            <Button variant="outline" asChild>
              <Link href="/analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                Go to Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                <FileBarChart className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Executive Summary (PDF)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Coming soon
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              A formatted PDF report with charts, KPIs, and trend analysis
              suitable for sharing with leadership and auditors.
            </p>
            <Button disabled variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
