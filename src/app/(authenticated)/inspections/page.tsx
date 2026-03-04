"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { ScoreBadge } from "@/components/shared/score-badge";
import { InspectionStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useInspections } from "@/hooks/use-inspections";
import { formatDate, inspectionStatusLabel } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import type { Inspection, InspectionStatus } from "@/lib/types";
import { ClipboardCheck, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const statusOptions: InspectionStatus[] = [
  "draft",
  "inProgress",
  "completed",
  "submitted",
  "archived",
];

const columns: Column<Inspection>[] = [
  {
    key: "date",
    label: "Date",
    sortable: true,
    className: "text-sm whitespace-nowrap",
    render: (i) => formatDate(i.date),
    sortValue: (i) => i.date || "",
  },
  {
    key: "name",
    label: "Name",
    sortable: true,
    className: "text-sm font-medium",
    render: (i) => (
      <Link
        href={`/inspections/${i.id}`}
        className="hover:text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {i.name}
      </Link>
    ),
    sortValue: (i) => i.name.toLowerCase(),
  },
  {
    key: "siteName",
    label: "Site",
    sortable: true,
    className: "text-sm",
    render: (i) =>
      i.siteId ? (
        <Link
          href={`/sites/${i.siteId}`}
          className="hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {i.siteName || "—"}
        </Link>
      ) : (
        <span className="text-muted-foreground">{i.siteName || "—"}</span>
      ),
    sortValue: (i) => (i.siteName || "").toLowerCase(),
  },
  {
    key: "inspectorName",
    label: "Inspector",
    sortable: true,
    className: "text-sm text-muted-foreground",
    render: (i) => i.inspectorName || "—",
    sortValue: (i) => (i.inspectorName || "").toLowerCase(),
  },
  {
    key: "score",
    label: "Score",
    sortable: true,
    render: (i) => <ScoreBadge score={i.score} />,
    sortValue: (i) => i.score,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (i) => <InspectionStatusBadge status={i.status} />,
    sortValue: (i) => i.status,
  },
];

const filters: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    options: statusOptions.map((s) => ({
      value: s,
      label: inspectionStatusLabel(s),
    })),
  },
];

export default function InspectionsPage() {
  const { inspections, loading } = useInspections();
  const router = useRouter();

  const handleExport = () => {
    exportToCsv("inspections", inspections, [
      { header: "Date", value: (i) => i.date },
      { header: "Name", value: (i) => i.name },
      { header: "Site", value: (i) => i.siteName },
      { header: "Inspector", value: (i) => i.inspectorName },
      { header: "Score", value: (i) => i.score },
      { header: "Status", value: (i) => inspectionStatusLabel(i.status) },
    ]);
    toast.success("Inspections exported to CSV");
  };

  if (loading) return (
    <div className="space-y-6">
      <PageHeader title="Inspections" subtitle="Loading inspections…" />
      <TableSkeleton rows={10} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspections"
        subtitle={`${inspections.length} total inspections`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={inspections.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <DataTable
        data={inspections}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search inspections..."
        searchFn={(item, q) =>
          item.name.toLowerCase().includes(q) ||
          (item.siteName || "").toLowerCase().includes(q) ||
          (item.inspectorName || "").toLowerCase().includes(q)
        }
        getRowKey={(i) => i.id}
        onRowClick={(i) => router.push(`/inspections/${i.id}`)}
        emptyState={
          <EmptyState
            icon={<ClipboardCheck className="h-12 w-12" />}
            title="No inspections yet"
            description="Your team's inspections will appear here once they sync from the mobile app."
          />
        }
      />
    </div>
  );
}
