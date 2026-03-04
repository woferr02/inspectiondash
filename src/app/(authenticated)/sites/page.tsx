"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSites } from "@/hooks/use-sites";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/lib/auth";
import { addSite, writeAuditEntry } from "@/lib/firestore";
import { formatDate } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import type { Site } from "@/lib/types";
import { Download, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/* ─── Add Site Dialog ─── */
function AddSiteDialog({
  orgId,
  userId,
  userEmail,
}: {
  orgId: string;
  userId: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setAddress(""); setContactName("");
    setContactPhone(""); setNotes("");
  };

  const handleCreate = async () => {
    if (!name.trim() || !address.trim()) return;
    setSaving(true);
    try {
      const id = await addSite(orgId, {
        name: name.trim(),
        address: address.trim(),
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      await writeAuditEntry(orgId, {
        action: "siteCreated",
        userId,
        userEmail,
        targetId: id,
        description: `Created site "${name.trim()}" at ${address.trim()}`,
      });
      toast.success(`Site "${name.trim()}" created`);
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to create site");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Site</DialogTitle>
          <DialogDescription>
            Add a new inspection location to your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Site Name *</label>
            <Input
              placeholder="e.g. Main Warehouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address *</label>
            <Input
              placeholder="Full street address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Name</label>
              <Input
                placeholder="Site contact person"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Phone</label>
              <Input
                placeholder="+44 ..."
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Access instructions, parking, special requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim() || !address.trim()}>
            {saving ? "Creating..." : "Create Site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const { orgId } = useOrg();
  const { user, profile } = useAuth();
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
          <div className="flex items-center gap-2">
            {orgId && user && (
              <AddSiteDialog
                orgId={orgId}
                userId={user.uid}
                userEmail={profile?.email ?? ""}
              />
            )}
            <Button variant="outline" size="sm" onClick={handleExport} disabled={sites.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
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
            description={
              orgId
                ? 'Add your first site using the "Add Site" button above.'
                : "Sites created in the mobile app will sync to this dashboard."
            }
          />
        }
      />
    </div>
  );
}
