"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useOrg } from "@/hooks/use-org";
import { exportToCsv } from "@/lib/csv-export";
import { formatDate, cn } from "@/lib/utils";
import { Users, Download } from "lucide-react";
import type { OrgMember, OrgRole } from "@/lib/types";
import { toast } from "sonner";

function roleColor(role: OrgRole): string {
  switch (role) {
    case "admin":
      return "bg-purple-50 text-purple-700";
    case "manager":
      return "bg-blue-50 text-blue-700";
    case "inspector":
      return "bg-slate-100 text-slate-600";
  }
}

function roleLabel(role: OrgRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "inspector":
      return "Inspector";
  }
}

const roleOptions: OrgRole[] = ["admin", "manager", "inspector"];

const columns: Column<OrgMember>[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    className: "text-sm font-medium",
    render: (m) => m.displayName || "—",
    sortValue: (m) => (m.displayName || "").toLowerCase(),
  },
  {
    key: "email",
    label: "Email",
    sortable: true,
    className: "text-sm text-muted-foreground",
    render: (m) => m.email,
    sortValue: (m) => m.email.toLowerCase(),
  },
  {
    key: "role",
    label: "Role",
    sortable: true,
    render: (m) => (
      <Badge
        variant="secondary"
        className={cn("text-xs px-2 py-0.5 font-medium", roleColor(m.role))}
      >
        {roleLabel(m.role)}
      </Badge>
    ),
    sortValue: (m) => m.role,
  },
  {
    key: "joinedAt",
    label: "Joined",
    sortable: true,
    className: "text-sm text-muted-foreground whitespace-nowrap",
    render: (m) => formatDate(m.joinedAt),
    sortValue: (m) => m.joinedAt || "",
  },
];

const filters: FilterConfig[] = [
  {
    key: "role",
    label: "Role",
    options: roleOptions.map((r) => ({ value: r, label: roleLabel(r) })),
  },
];

export default function TeamPage() {
  const { org, members, loading, error } = useOrg();

  const handleExport = () => {
    exportToCsv("team-members", members, [
      { header: "Name", value: (m) => m.displayName },
      { header: "Email", value: (m) => m.email },
      { header: "Role", value: (m) => roleLabel(m.role) },
      { header: "Joined", value: (m) => m.joinedAt },
    ]);
    toast.success("Team members exported to CSV");
  };

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle={
          org
            ? `${org.name} \u00b7 ${members.length} member${members.length !== 1 ? "s" : ""}`
            : "Manage your organization\u2019s team members"
        }
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={members.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          {error}
        </div>
      )}

      <DataTable
        data={members}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search members..."
        searchFn={(item, q) =>
          (item.displayName || "").toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q)
        }
        getRowKey={(m) => m.userId}
        emptyState={
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No team members found"
            description="Invite team members from the mobile app to collaborate on inspections."
          />
        }
      />
    </div>
  );
}
