"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { ActionStatusBadge, SeverityBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useActions } from "@/hooks/use-actions";
import { formatDate, severityLabel, actionStatusLabel } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import type { CorrectiveAction, ActionSeverity, ActionStatus } from "@/lib/types";
import { AlertTriangle, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const severityOptions: ActionSeverity[] = ["low", "medium", "high", "critical"];
const statusOptions: ActionStatus[] = ["open", "inProgress", "resolved", "closed"];

const columns: Column<CorrectiveAction>[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    className: "text-sm font-medium max-w-[300px] truncate",
    render: (a) => a.title,
    sortValue: (a) => a.title.toLowerCase(),
  },
  {
    key: "severity",
    label: "Severity",
    sortable: true,
    render: (a) => <SeverityBadge severity={a.severity} />,
    filterValue: (a) => a.severity,
    sortValue: (a) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity];
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (a) => <ActionStatusBadge status={a.status} />,
    filterValue: (a) => a.status,
    sortValue: (a) => a.status,
  },
  {
    key: "assignee",
    label: "Assignee",
    sortable: true,
    className: "text-sm text-muted-foreground",
    render: (a) => a.assignee || "—",
    sortValue: (a) => (a.assignee || "").toLowerCase(),
  },
  {
    key: "inspection",
    label: "Inspection",
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
  {
    key: "dueDate",
    label: "Due Date",
    sortable: true,
    className: "text-sm text-muted-foreground whitespace-nowrap",
    render: (a) => formatDate(a.dueDate),
    sortValue: (a) => a.dueDate || "9999",
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    className: "text-sm text-muted-foreground whitespace-nowrap",
    render: (a) => formatDate(a.createdAt),
    sortValue: (a) => a.createdAt || "",
  },
];

const filters: FilterConfig[] = [
  {
    key: "severity",
    label: "Severity",
    options: severityOptions.map((s) => ({
      value: s,
      label: severityLabel(s),
    })),
  },
  {
    key: "status",
    label: "Status",
    options: statusOptions.map((s) => ({
      value: s,
      label: actionStatusLabel(s),
    })),
  },
];

export default function ActionsPage() {
  const { actions, loading } = useActions();

  const openCount = actions.filter(
    (a) => a.status === "open" || a.status === "inProgress"
  ).length;

  const handleExport = () => {
    exportToCsv("corrective-actions", actions, [
      { header: "Title", value: (a) => a.title },
      { header: "Severity", value: (a) => severityLabel(a.severity) },
      { header: "Status", value: (a) => actionStatusLabel(a.status) },
      { header: "Assignee", value: (a) => a.assignee },
      { header: "Due Date", value: (a) => a.dueDate },
      { header: "Created", value: (a) => a.createdAt },
      { header: "Description", value: (a) => a.description },
    ]);
    toast.success("Actions exported to CSV");
  };

  if (loading) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corrective Actions"
        subtitle={`${actions.length} total \u00b7 ${openCount} open`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={actions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <DataTable
        data={actions}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search actions..."
        searchFn={(item, q) =>
          item.title.toLowerCase().includes(q) ||
          (item.assignee || "").toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        }
        getRowKey={(a) => a.id}
        emptyState={
          <EmptyState
            icon={<AlertTriangle className="h-12 w-12" />}
            title="No corrective actions yet"
            description="Actions created from inspections in the mobile app will appear here."
          />
        }
      />
    </div>
  );
}
