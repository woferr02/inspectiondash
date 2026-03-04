"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useIncidents } from "@/hooks/use-incidents";
import { useSites } from "@/hooks/use-sites";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/lib/auth";
import { addIncident, updateIncidentStatus, deleteIncident, writeAuditEntry } from "@/lib/firestore";
import { exportToCsv } from "@/lib/csv-export";
import { formatDate, cn } from "@/lib/utils";
import type { IncidentType, IncidentSeverity, IncidentStatus, Incident } from "@/lib/types";
import {
  AlertTriangle,
  Download,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: "accident", label: "Accident" },
  { value: "near_miss", label: "Near Miss" },
  { value: "dangerous_occurrence", label: "Dangerous Occurrence" },
  { value: "ill_health", label: "Ill Health" },
  { value: "environmental", label: "Environmental" },
  { value: "property_damage", label: "Property Damage" },
  { value: "other", label: "Other" },
];

const SEVERITIES: { value: IncidentSeverity; label: string }[] = [
  { value: "minor", label: "Minor" },
  { value: "moderate", label: "Moderate" },
  { value: "major", label: "Major" },
  { value: "fatal", label: "Fatal" },
];

const STATUSES: { value: IncidentStatus; label: string }[] = [
  { value: "reported", label: "Reported" },
  { value: "investigating", label: "Investigating" },
  { value: "corrective_action", label: "Corrective Action" },
  { value: "closed", label: "Closed" },
];

function typeLabel(t: IncidentType) {
  return INCIDENT_TYPES.find((x) => x.value === t)?.label ?? t;
}

function severityColor(s: IncidentSeverity): string {
  switch (s) {
    case "fatal": return "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300";
    case "major": return "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300";
    case "moderate": return "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300";
    case "minor": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function statusColor(s: IncidentStatus): string {
  switch (s) {
    case "reported": return "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300";
    case "investigating": return "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300";
    case "corrective_action": return "bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300";
    case "closed": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
}

/* ─── Inline Status Select ─── */
function IncidentStatusSelect({
  incident,
  orgId,
  userId,
  userEmail,
}: {
  incident: Incident;
  orgId: string;
  userId: string;
  userEmail: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleChange = async (val: string) => {
    if (val === incident.status) return;
    setBusy(true);
    try {
      await updateIncidentStatus(orgId, incident.id, val as IncidentStatus);
      await writeAuditEntry(orgId, {
        action: "incidentStatusChanged" as any,
        userId,
        userEmail,
        targetId: incident.id,
        description: `Changed incident "${incident.title}" status from ${incident.status} to ${val}`,
      });
      toast.success(`Status → ${STATUSES.find((s) => s.value === val)?.label}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Select value={incident.status} onValueChange={handleChange} disabled={busy}>
      <SelectTrigger className={cn("h-7 w-[140px] text-xs border-dashed", statusColor(incident.status))}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ─── Report Incident Dialog ─── */
function ReportIncidentDialog({
  orgId,
  userId,
  userEmail,
  userName,
  sites,
}: {
  orgId: string;
  userId: string;
  userEmail: string;
  userName: string;
  sites: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<IncidentType>("near_miss");
  const [severity, setSeverity] = useState<IncidentSeverity>("minor");
  const [siteId, setSiteId] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [injured, setInjured] = useState(0);
  const [riddor, setRiddor] = useState(false);
  const [immediateActions, setImmediateActions] = useState("");
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedSiteName = sites.find((s) => s.id === siteId)?.name ?? "";

  const reset = () => {
    setTitle(""); setDescription(""); setType("near_miss"); setSeverity("minor");
    setSiteId(""); setOccurredAt(""); setInjured(0); setRiddor(false);
    setImmediateActions(""); setAssignee("");
  };

  const handleCreate = async () => {
    if (!title.trim() || !siteId || !occurredAt) return;
    setSaving(true);
    try {
      const id = await addIncident(orgId, {
        title: title.trim(),
        description: description.trim(),
        type,
        severity,
        status: "reported",
        siteId,
        siteName: selectedSiteName,
        reportedBy: userName,
        reportedByEmail: userEmail,
        reportedAt: new Date().toISOString(),
        occurredAt,
        injuredPersons: injured,
        riddorReportable: riddor,
        immediateActions: immediateActions.trim(),
        rootCause: "",
        assignee: assignee.trim(),
      });
      await writeAuditEntry(orgId, {
        action: "incidentReported" as any,
        userId,
        userEmail,
        targetId: id,
        description: `Reported ${typeLabel(type)}: "${title.trim()}" at ${selectedSiteName} — ${severity} severity`,
      });
      toast.success("Incident reported");
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to report incident");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Report Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report an Incident</DialogTitle>
          <DialogDescription>
            Record an accident, near miss, or dangerous occurrence. All incidents are logged to the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Incident Title *</label>
            <Input
              placeholder="Brief description of what happened"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Incident Type *</label>
              <Select value={type} onValueChange={(v: IncidentType) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity *</label>
              <Select value={severity} onValueChange={(v: IncidentSeverity) => setSeverity(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Site *</label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Where did it happen?" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date & Time of Incident *</label>
              <Input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Full details of the incident — what happened, who was involved, contributing factors..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Injured Persons</label>
              <Input
                type="number"
                min={0}
                value={injured}
                onChange={(e) => setInjured(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Investigator</label>
              <Input
                placeholder="Name of person investigating"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="riddor"
              checked={riddor}
              onCheckedChange={(v) => setRiddor(v === true)}
            />
            <label htmlFor="riddor" className="text-sm font-medium leading-none cursor-pointer">
              RIDDOR Reportable
            </label>
            <span className="text-xs text-muted-foreground">
              (Reporting of Injuries, Diseases and Dangerous Occurrences)
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Immediate Actions Taken</label>
            <Textarea
              placeholder="What was done immediately after the incident?"
              value={immediateActions}
              onChange={(e) => setImmediateActions(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !title.trim() || !siteId || !occurredAt}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? "Reporting..." : "Report Incident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function IncidentsPage() {
  const { incidents, loading } = useIncidents();
  const { sites } = useSites();
  const { orgId } = useOrg();
  const { user, profile } = useAuth();

  const stats = useMemo(() => {
    const open = incidents.filter((i) => i.status !== "closed").length;
    const riddor = incidents.filter((i) => i.riddorReportable).length;
    const thisMonth = incidents.filter((i) => {
      const d = new Date(i.reportedAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: incidents.length, open, riddor, thisMonth };
  }, [incidents]);

  const handleExport = () => {
    exportToCsv("incidents", incidents, [
      { header: "Title", value: (i) => i.title },
      { header: "Type", value: (i) => typeLabel(i.type) },
      { header: "Severity", value: (i) => i.severity },
      { header: "Status", value: (i) => i.status },
      { header: "Site", value: (i) => i.siteName },
      { header: "Occurred", value: (i) => i.occurredAt },
      { header: "Reported By", value: (i) => i.reportedBy },
      { header: "RIDDOR", value: (i) => i.riddorReportable ? "Yes" : "No" },
      { header: "Injured", value: (i) => i.injuredPersons },
      { header: "Assignee", value: (i) => i.assignee },
      { header: "Immediate Actions", value: (i) => i.immediateActions },
    ]);
    toast.success("Incidents exported");
  };

  const handleDelete = async (incident: Incident) => {
    if (!orgId || !user) return;
    if (!confirm(`Delete incident "${incident.title}"?`)) return;
    try {
      await deleteIncident(orgId, incident.id);
      await writeAuditEntry(orgId, {
        action: "incidentDeleted" as any,
        userId: user.uid,
        userEmail: profile?.email ?? "",
        targetId: incident.id,
        description: `Deleted incident "${incident.title}"`,
      });
      toast.success("Incident deleted");
    } catch {
      toast.error("Failed to delete incident");
    }
  };

  const columns: Column<Incident>[] = [
    {
      key: "title",
      label: "Incident",
      sortable: true,
      className: "text-sm font-medium max-w-[200px] truncate",
      render: (i) => i.title,
      sortValue: (i) => i.title.toLowerCase(),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (i) => <Badge variant="outline" className="text-xs">{typeLabel(i.type)}</Badge>,
      filterValue: (i) => i.type,
      sortValue: (i) => i.type,
    },
    {
      key: "severity",
      label: "Severity",
      sortable: true,
      render: (i) => (
        <Badge variant="secondary" className={cn("text-xs capitalize", severityColor(i.severity))}>
          {i.severity}
        </Badge>
      ),
      filterValue: (i) => i.severity,
      sortValue: (i) => {
        const order: Record<string, number> = { fatal: 0, major: 1, moderate: 2, minor: 3 };
        return order[i.severity] ?? 99;
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (i) =>
        orgId && user ? (
          <IncidentStatusSelect
            incident={i}
            orgId={orgId}
            userId={user.uid}
            userEmail={profile?.email ?? ""}
          />
        ) : (
          <Badge variant="secondary" className={cn("text-xs", statusColor(i.status))}>
            {STATUSES.find((s) => s.value === i.status)?.label}
          </Badge>
        ),
      sortValue: (i) => {
        const order: Record<string, number> = { reported: 0, investigating: 1, corrective_action: 2, closed: 3 };
        return order[i.status] ?? 99;
      },
    },
    {
      key: "site",
      label: "Site",
      sortable: true,
      className: "text-sm text-muted-foreground",
      render: (i) => i.siteName,
      sortValue: (i) => i.siteName.toLowerCase(),
    },
    {
      key: "occurred",
      label: "Occurred",
      sortable: true,
      className: "text-sm text-muted-foreground whitespace-nowrap",
      render: (i) => {
        try { return format(parseISO(i.occurredAt), "MMM d, yyyy HH:mm"); }
        catch { return formatDate(i.occurredAt); }
      },
      sortValue: (i) => i.occurredAt,
    },
    {
      key: "riddor",
      label: "RIDDOR",
      render: (i) =>
        i.riddorReportable ? (
          <Badge variant="destructive" className="text-xs">RIDDOR</Badge>
        ) : null,
    },
    {
      key: "reportedBy",
      label: "Reported By",
      className: "text-sm text-muted-foreground",
      render: (i) => i.reportedBy || "—",
    },
    ...(orgId && user
      ? [{
          key: "actions" as const,
          label: "",
          className: "w-[50px]",
          render: (i: Incident) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
              title="Delete incident"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ),
        }]
      : []),
  ];

  const filters: FilterConfig[] = [
    {
      key: "type",
      label: "Type",
      options: INCIDENT_TYPES.map((t) => ({ label: t.label, value: t.value })),
    },
    {
      key: "severity",
      label: "Severity",
      options: SEVERITIES.map((s) => ({ label: s.label, value: s.value })),
    },
  ];

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        subtitle={`${stats.total} total · ${stats.open} open${stats.riddor > 0 ? ` · ${stats.riddor} RIDDOR` : ""} · ${stats.thisMonth} this month`}
        actions={
          <div className="flex items-center gap-2">
            {orgId && user && (
              <ReportIncidentDialog
                orgId={orgId}
                userId={user.uid}
                userEmail={profile?.email ?? ""}
                userName={profile?.displayName ?? ""}
                sites={sites.map((s) => ({ id: s.id, name: s.name }))}
              />
            )}
            <Button variant="outline" size="sm" onClick={handleExport} disabled={incidents.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Incidents</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className={cn("text-2xl font-bold", stats.open > 0 && "text-amber-600")}>{stats.open}</p>
          <p className="text-xs text-muted-foreground">Open</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className={cn("text-2xl font-bold", stats.riddor > 0 && "text-red-600")}>{stats.riddor}</p>
          <p className="text-xs text-muted-foreground">RIDDOR Reportable</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats.thisMonth}</p>
          <p className="text-xs text-muted-foreground">This Month</p>
        </div>
      </div>

      <DataTable
        data={incidents}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search incidents..."
        searchFn={(item, q) =>
          item.title.toLowerCase().includes(q) ||
          item.siteName.toLowerCase().includes(q) ||
          item.reportedBy.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        }
        getRowKey={(i) => i.id}
        emptyState={
          <EmptyState
            icon={<ShieldAlert className="h-12 w-12" />}
            title="No incidents reported"
            description={
              orgId
                ? 'Report incidents using the "Report Incident" button above. Near misses, accidents, dangerous occurrences — track them all here.'
                : "Incidents will appear here once reported."
            }
          />
        }
      />
    </div>
  );
}
