"use client";

import { useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { ActionStatusBadge, SeverityBadge } from "@/components/shared/status-badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useActions } from "@/hooks/use-actions";
import { useSites } from "@/hooks/use-sites";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/lib/auth";
import {
  updateActionStatus,
  updateActionAssignee,
  updateActionDueDate,
  addAction,
  writeAuditEntry,
} from "@/lib/firestore";
import { formatDate, severityLabel, actionStatusLabel, cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";
import type { CorrectiveAction, ActionSeverity, ActionStatus } from "@/lib/types";
import { AlertTriangle, Download, ExternalLink, Plus, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const severityOptions: ActionSeverity[] = ["low", "medium", "high", "critical"];
const statusOptions: ActionStatus[] = ["open", "inProgress", "resolved", "closed"];

/* ─── Inline Status Select ─── */
function StatusSelect({
  action,
  orgId,
  userId,
  userEmail,
}: {
  action: CorrectiveAction;
  orgId: string;
  userId: string;
  userEmail: string;
}) {
  const [updating, setUpdating] = useState(false);

  const handleChange = useCallback(
    async (newStatus: string) => {
      if (newStatus === action.status) return;
      setUpdating(true);
      try {
        await updateActionStatus(orgId, action.id, newStatus as ActionStatus);
        await writeAuditEntry(orgId, {
          action: newStatus === "resolved" ? "actionResolved" : "actionClosed",
          userId,
          userEmail,
          targetId: action.id,
          description: `Changed "${action.title}" status from ${actionStatusLabel(action.status)} to ${actionStatusLabel(newStatus as ActionStatus)}`,
        });
        toast.success(`Action updated to ${actionStatusLabel(newStatus as ActionStatus)}`);
      } catch {
        toast.error("Failed to update action status");
      } finally {
        setUpdating(false);
      }
    },
    [action, orgId, userId, userEmail]
  );

  return (
    <Select value={action.status} onValueChange={handleChange} disabled={updating}>
      <SelectTrigger
        className="h-7 w-[130px] text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {actionStatusLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ─── Inline Assignee Editor ─── */
function AssigneeEditor({
  action,
  orgId,
  userId,
  userEmail,
}: {
  action: CorrectiveAction;
  orgId: string;
  userId: string;
  userEmail: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(action.assignee || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === action.assignee) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateActionAssignee(orgId, action.id, value);
      await writeAuditEntry(orgId, {
        action: "actionUpdated",
        userId,
        userEmail,
        targetId: action.id,
        description: `Reassigned "${action.title}" to ${value || "unassigned"}`,
      });
      toast.success("Assignee updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update assignee");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); setValue(action.assignee || ""); }}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground group"
      >
        <span>{action.assignee || "Unassigned"}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-[120px] text-xs"
        placeholder="Name..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button
        variant="ghost" size="icon" className="h-6 w-6"
        onClick={handleSave} disabled={saving}
      >
        <Check className="h-3 w-3 text-emerald-600" />
      </Button>
      <Button
        variant="ghost" size="icon" className="h-6 w-6"
        onClick={() => setEditing(false)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ─── Inline Due Date Editor ─── */
function DueDateEditor({
  action,
  orgId,
  userId,
  userEmail,
}: {
  action: CorrectiveAction;
  orgId: string;
  userId: string;
  userEmail: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(action.dueDate?.split("T")[0] || "");
  const [saving, setSaving] = useState(false);

  const isOverdue =
    (action.status === "open" || action.status === "inProgress") &&
    action.dueDate &&
    action.dueDate < new Date().toISOString();

  const handleSave = async () => {
    const newDue = value ? new Date(value).toISOString() : null;
    if (newDue === action.dueDate) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateActionDueDate(orgId, action.id, newDue);
      await writeAuditEntry(orgId, {
        action: "actionUpdated",
        userId,
        userEmail,
        targetId: action.id,
        description: `Changed due date on "${action.title}" to ${value || "none"}`,
      });
      toast.success("Due date updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update due date");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setValue(action.dueDate?.split("T")[0] || "");
          setEditing(true);
        }}
        className={cn(
          "flex items-center gap-1 text-sm group whitespace-nowrap",
          isOverdue ? "text-red-600 font-medium dark:text-red-400" : "text-muted-foreground"
        )}
      >
        <span>{formatDate(action.dueDate)}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-[140px] text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button
        variant="ghost" size="icon" className="h-6 w-6"
        onClick={handleSave} disabled={saving}
      >
        <Check className="h-3 w-3 text-emerald-600" />
      </Button>
      <Button
        variant="ghost" size="icon" className="h-6 w-6"
        onClick={() => setEditing(false)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/* ─── Create Action Dialog ─── */
function CreateActionDialog({
  orgId,
  userId,
  userEmail,
  sites,
}: {
  orgId: string;
  userId: string;
  userEmail: string;
  sites: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<ActionSeverity>("medium");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [siteId, setSiteId] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setSeverity("medium");
    setAssignee(""); setDueDate(""); setSiteId("");
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const siteName = sites.find((s) => s.id === siteId)?.name ?? "";
      const id = await addAction(orgId, {
        title: title.trim(),
        description: description.trim(),
        severity,
        assignee: assignee.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        siteId: siteId || undefined,
        siteName: siteName || undefined,
      });
      await writeAuditEntry(orgId, {
        action: "actionCreated",
        userId,
        userEmail,
        targetId: id,
        description: `Created corrective action "${title.trim()}" from dashboard`,
      });
      toast.success("Corrective action created");
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to create action");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Action
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Corrective Action</DialogTitle>
          <DialogDescription>
            Add a new corrective action to track a finding or issue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="e.g. Fire extinguisher expired"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Details about the finding..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as ActionSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {severityOptions.map((s) => (
                    <SelectItem key={s} value={s}>{severityLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignee</label>
              <Input
                placeholder="Person responsible"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Site</label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !title.trim()}>
            {saving ? "Creating..." : "Create Action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ActionsPage() {
  const { actions, loading } = useActions();
  const { sites } = useSites();
  const { orgId, isAdmin } = useOrg();
  const { user, profile } = useAuth();

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const openCount = actions.filter(
    (a) => a.status === "open" || a.status === "inProgress"
  ).length;
  const overdueCount = actions.filter(
    (a) =>
      (a.status === "open" || a.status === "inProgress") &&
      a.dueDate &&
      a.dueDate < new Date().toISOString()
  ).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === actions.length) setSelected(new Set());
    else setSelected(new Set(actions.map((a) => a.id)));
  };

  const handleBulkStatus = async (status: ActionStatus) => {
    if (!orgId || !user || selected.size === 0) return;
    const ids = [...selected];
    let ok = 0;
    for (const id of ids) {
      try {
        await updateActionStatus(orgId, id, status);
        ok++;
      } catch { /* continue */ }
    }
    if (ok > 0) {
      await writeAuditEntry(orgId, {
        action: status === "resolved" ? "actionResolved" : "actionClosed",
        userId: user.uid,
        userEmail: profile?.email ?? "",
        targetId: ids.join(","),
        description: `Bulk updated ${ok} action(s) to ${actionStatusLabel(status)}`,
      });
    }
    toast.success(`${ok} action(s) updated to ${actionStatusLabel(status)}`);
    setSelected(new Set());
  };

  const columns: Column<CorrectiveAction>[] = [
    {
      key: "select",
      label: "",
      render: (a) => (
        <Checkbox
          checked={selected.has(a.id)}
          onCheckedChange={() => toggleSelect(a.id)}
          onClick={(e) => e.stopPropagation()}
          className="mr-1"
        />
      ),
    },
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
      render: (a) =>
        orgId && user ? (
          <StatusSelect
            action={a}
            orgId={orgId}
            userId={user.uid}
            userEmail={profile?.email ?? ""}
          />
        ) : (
          <ActionStatusBadge status={a.status} />
        ),
      filterValue: (a) => a.status,
      sortValue: (a) => a.status,
    },
    {
      key: "assignee",
      label: "Assignee",
      sortable: true,
      render: (a) =>
        orgId && user ? (
          <AssigneeEditor
            action={a}
            orgId={orgId}
            userId={user.uid}
            userEmail={profile?.email ?? ""}
          />
        ) : (
          <span className="text-sm text-muted-foreground">{a.assignee || "—"}</span>
        ),
      sortValue: (a) => (a.assignee || "").toLowerCase(),
    },
    {
      key: "inspection",
      label: "Inspection",
      className: "text-sm",
      render: (a) =>
        a.inspectionId ? (
          <Link
            href={`/inspections/${a.inspectionId}`}
            className="inline-flex items-center gap-1 text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Dashboard</span>
        ),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      render: (a) =>
        orgId && user ? (
          <DueDateEditor
            action={a}
            orgId={orgId}
            userId={user.uid}
            userEmail={profile?.email ?? ""}
          />
        ) : (
          <span className="text-sm text-muted-foreground">{formatDate(a.dueDate)}</span>
        ),
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

  if (loading) return (
    <div className="space-y-6">
      <PageHeader title="Corrective Actions" subtitle="Loading actions…" />
      <TableSkeleton rows={8} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corrective Actions"
        subtitle={`${actions.length} total \u00b7 ${openCount} open \u00b7 ${overdueCount} overdue`}
        actions={
          <div className="flex items-center gap-2">
            {orgId && user && (
              <CreateActionDialog
                orgId={orgId}
                userId={user.uid}
                userEmail={profile?.email ?? ""}
                sites={sites.map((s) => ({ id: s.id, name: s.name }))}
              />
            )}
            <Button variant="outline" size="sm" onClick={handleExport} disabled={actions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkStatus("resolved")}>
              Mark Resolved
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatus("closed")}>
              Mark Closed
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

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
            description={
              orgId
                ? "Create your first action using the \"New Action\" button above."
                : "Actions created from inspections in the mobile app will appear here."
            }
          />
        }
      />
    </div>
  );
}
