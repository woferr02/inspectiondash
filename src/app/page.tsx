"use client";

import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ComplianceChart } from "@/components/dashboard/compliance-chart";
import { RecentInspections } from "@/components/dashboard/recent-inspections";
import { ActionSummary } from "@/components/dashboard/action-summary";
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
} from "lucide-react";

const kpiIcons = [ClipboardCheck, Target, AlertTriangle, Clock];

export default function DashboardPage() {
  const { kpis, complianceTrend, actionSummary, inspections, loading } =
    useAnalytics();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your organization's compliance status"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} icon={kpiIcons[i]} />
            ))}
      </div>

      {/* Charts row */}
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

      {/* Recent inspections */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <RecentInspections inspections={inspections} />
      )}
    </div>
  );
}
