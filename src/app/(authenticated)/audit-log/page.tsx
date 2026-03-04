"use client";

import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuditLog } from "@/hooks/use-audit-log";
import { formatDateTime, cn } from "@/lib/utils";
import { ScrollText } from "lucide-react";
import type { AuditEntry, AuditAction } from "@/lib/types";

/* ── helpers ── */

function actionColor(action: AuditAction): string {
  if (action.includes("Created") || action.includes("Invited"))
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (action.includes("Deleted") || action.includes("Removed"))
    return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
  if (
    action.includes("Submitted") ||
    action.includes("Resolved") ||
    action.includes("Closed")
  )
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
  return "bg-muted text-muted-foreground";
}

function actionLabel(action: AuditAction): string {
  return action.replace(/([A-Z])/g, " $1").trim();
}

/* ── columns ── */

const columns: Column<AuditEntry>[] = [
  {
    key: "timestamp",
    label: "Time",
    sortable: true,
    className: "text-sm whitespace-nowrap",
    render: (e) => formatDateTime(e.timestamp),
    sortValue: (e) => e.timestamp,
  },
  {
    key: "action",
    label: "Action",
    sortable: true,
    render: (e) => (
      <Badge
        variant="secondary"
        className={cn("text-xs px-2 py-0.5 font-medium", actionColor(e.action))}
      >
        {actionLabel(e.action)}
      </Badge>
    ),
    filterValue: (e) => e.action,
    sortValue: (e) => e.action,
  },
  {
    key: "userEmail",
    label: "User",
    sortable: true,
    className: "text-sm text-muted-foreground",
    render: (e) => e.userEmail,
    sortValue: (e) => e.userEmail.toLowerCase(),
  },
  {
    key: "description",
    label: "Description",
    className: "text-sm text-muted-foreground max-w-[400px] truncate",
    render: (e) => e.description,
  },
];

/* ── page ── */

export default function AuditLogPage() {
  const { entries, loading, error } = useAuditLog();

  if (loading) return <TableSkeleton rows={10} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle={`${entries.length} events recorded`}
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
          {error}
        </div>
      )}

      <DataTable
        data={entries}
        columns={columns}
        searchPlaceholder="Search audit log..."
        searchFn={(item, q) =>
          item.userEmail.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q)
        }
        getRowKey={(e) => e.id}
        emptyState={
          <EmptyState
            icon={<ScrollText className="h-12 w-12" />}
            title="No audit events yet"
            description="Actions performed by team members will be logged here."
          />
        }
      />
    </div>
  );
}
