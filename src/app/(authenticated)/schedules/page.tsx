"use client";

import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { useSchedules } from "@/hooks/use-schedules";
import { useSites } from "@/hooks/use-sites";
import { exportToCsv } from "@/lib/csv-export";
import type { Schedule } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { Download, Calendar } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

function frequencyLabel(freq: string) {
  const labels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annual",
  };
  return labels[freq] ?? freq;
}

function dueStatus(nextDue: string): { label: string; variant: "destructive" | "outline" | "secondary" } {
  try {
    const d = parseISO(nextDue);
    if (isPast(d) && !isToday(d)) return { label: "Overdue", variant: "destructive" };
    if (isToday(d)) return { label: "Due today", variant: "outline" };
    return { label: "Upcoming", variant: "secondary" };
  } catch {
    return { label: "—", variant: "secondary" };
  }
}

export default function SchedulesPage() {
  const { schedules, loading } = useSchedules();
  const { sites } = useSites();

  const siteMap = new Map(sites.map((s) => [s.id, s.name]));

  const enriched = schedules.map((s) => ({
    ...s,
    resolvedSiteName: s.siteName ?? siteMap.get(s.siteId) ?? s.siteId,
  }));

  const columns: Column<(typeof enriched)[number]>[] = [
    {
      key: "template",
      label: "Template",
      sortable: true,
      render: (s) => (
        <span className="font-medium text-foreground">{s.templateName ?? s.templateId}</span>
      ),
      sortValue: (s) => (s.templateName ?? s.templateId).toLowerCase(),
    },
    {
      key: "site",
      label: "Site",
      sortable: true,
      render: (s) => (
        <Link
          href={`/sites/${s.siteId}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {s.resolvedSiteName}
        </Link>
      ),
      sortValue: (s) => s.resolvedSiteName.toLowerCase(),
    },
    {
      key: "assignee",
      label: "Assignee",
      sortable: true,
      render: (s) => s.assigneeName ?? s.assignee ?? "—",
      sortValue: (s) => (s.assigneeName ?? s.assignee ?? "").toLowerCase(),
    },
    {
      key: "frequency",
      label: "Frequency",
      sortable: true,
      render: (s) => (
        <Badge variant="outline" className="capitalize">
          {frequencyLabel(s.frequency)}
        </Badge>
      ),
      filterValue: (s) => s.frequency,
      sortValue: (s) => {
        const order: Record<string, number> = { daily: 1, weekly: 2, monthly: 3, quarterly: 4, annual: 5 };
        return order[s.frequency] ?? 99;
      },
    },
    {
      key: "nextDue",
      label: "Next Due",
      sortable: true,
      render: (s) => {
        const status = dueStatus(s.nextDue);
        return (
          <div className="flex items-center gap-2">
            <span>{format(parseISO(s.nextDue), "MMM d, yyyy")}</span>
            <Badge variant={status.variant} className="text-xs">
              {status.label}
            </Badge>
          </div>
        );
      },
      sortValue: (s) => s.nextDue,
    },
    {
      key: "lastCompleted",
      label: "Last Completed",
      sortable: true,
      render: (s) =>
        s.lastCompleted
          ? format(parseISO(s.lastCompleted), "MMM d, yyyy")
          : "Never",
      sortValue: (s) => s.lastCompleted ?? "",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (s) => (
        <Badge variant={s.isActive === false ? "secondary" : "outline"}>
          {s.isActive === false ? "Paused" : "Active"}
        </Badge>
      ),
      sortValue: (s) => (s.isActive === false ? 1 : 0),
    },
  ];

  const filters: FilterConfig[] = [
    {
      key: "frequency",
      label: "Frequency",
      options: [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Annual", value: "annual" },
      ],
    },
  ];

  const handleExport = () => {
    exportToCsv("schedules", enriched, [
      { header: "Template", value: (s) => s.templateName ?? s.templateId },
      { header: "Site", value: (s) => s.resolvedSiteName },
      { header: "Assignee", value: (s) => s.assigneeName ?? s.assignee ?? "" },
      { header: "Frequency", value: (s) => s.frequency },
      { header: "Next Due", value: (s) => s.nextDue },
      { header: "Last Completed", value: (s) => s.lastCompleted ?? "" },
      { header: "Active", value: (s) => (s.isActive === false ? "No" : "Yes") },
    ]);
    toast.success("Schedules exported");
  };

  if (loading) return <TableSkeleton rows={5} />;

  const overdue = enriched.filter((s) => {
    try { return isPast(parseISO(s.nextDue)) && !isToday(parseISO(s.nextDue)); } catch { return false; }
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        subtitle={`${schedules.length} scheduled inspections${overdue > 0 ? ` · ${overdue} overdue` : ""}`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={enriched.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <DataTable
        data={enriched}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search schedules..."
        searchFn={(s, q) => {
          const lower = q.toLowerCase();
          return (
            (s.templateName ?? s.templateId).toLowerCase().includes(lower) ||
            s.resolvedSiteName.toLowerCase().includes(lower) ||
            (s.assigneeName ?? s.assignee ?? "").toLowerCase().includes(lower)
          );
        }}
        getRowKey={(s) => s.id}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Calendar className="h-10 w-10" />
            <p className="text-sm">No inspection schedules configured yet.</p>
            <p className="text-xs">Create schedules from the SafeCheck Pro mobile app.</p>
          </div>
        }
      />
    </div>
  );
}
