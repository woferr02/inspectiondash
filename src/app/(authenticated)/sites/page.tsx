"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useSites } from "@/hooks/use-sites";
import { formatDate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import type { Site } from "@/lib/types";
import { Download, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const columns: Column<Site>[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    className: "text-sm font-medium",
    render: (s) => (
      <Link
        href={`/sites/${s.id}`}
        className="hover:text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {s.name}
      </Link>
    ),
    sortValue: (s) => s.name.toLowerCase(),
  },
  {
    key: "address",
    label: "Address",
    sortable: true,
    className: "text-sm text-muted-foreground",
    render: (s) => s.address || "—",
    sortValue: (s) => (s.address || "").toLowerCase(),
  },
  {
    key: "contact",
    label: "Contact",
    className: "text-sm text-muted-foreground",
    render: (s) => s.contactName || "—",
  },
  {
    key: "inspectionCount",
    label: "Inspections",
    sortable: true,
    className: "text-sm text-right tabular-nums",
    headerClassName: "text-xs uppercase tracking-wider text-right",
    render: (s) => s.inspectionCount,
    sortValue: (s) => s.inspectionCount,
  },
  {
    key: "lastInspection",
    label: "Last Inspection",
    sortable: true,
    className: "text-sm text-muted-foreground whitespace-nowrap",
    render: (s) => formatDate(s.lastInspectionDate),
    sortValue: (s) => s.lastInspectionDate || "",
  },
];

export default function SitesPage() {
  const { sites, loading } = useSites();
  const router = useRouter();

  const handleExport = () => {
    exportToCsv("sites", sites, [
      { header: "Name", value: (s) => s.name },
      { header: "Address", value: (s) => s.address },
      { header: "Contact", value: (s) => s.contactName },
      { header: "Inspections", value: (s) => s.inspectionCount },
      { header: "Last Inspection", value: (s) => s.lastInspectionDate },
    ]);
    toast.success("Sites exported to CSV");
  };

  if (loading) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sites"
        subtitle={`${sites.length} inspection sites`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={sites.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <DataTable
        data={sites}
        columns={columns}
        searchPlaceholder="Search sites..."
        searchFn={(item, q) =>
          item.name.toLowerCase().includes(q) ||
          (item.address || "").toLowerCase().includes(q) ||
          (item.contactName || "").toLowerCase().includes(q)
        }
        getRowKey={(s) => s.id}
        onRowClick={(s) => router.push(`/sites/${s.id}`)}
        emptyState={
          <EmptyState
            icon={<MapPin className="h-12 w-12" />}
            title="No sites yet"
            description="Sites created in the mobile app will sync to this dashboard."
          />
        }
      />
    </div>
  );
}
