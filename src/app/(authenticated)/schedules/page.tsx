"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { useSchedules } from "@/hooks/use-schedules";
import { useSites } from "@/hooks/use-sites";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/lib/auth";
import { exportToCsv } from "@/lib/csv-export";
import { addSchedule, toggleScheduleActive, deleteSchedule, writeAuditEntry } from "@/lib/firestore";
import type { Schedule } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Download, Calendar, Plus, Pause, Play, Trash2 } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

function frequencyLabel(freq: string) {
  const labels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    biannual: "Bi-annual",
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

/* ─── Create Schedule Dialog ─── */
function CreateScheduleDialog({
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
  const [templateName, setTemplateName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [frequency, setFrequency] = useState("");
  const [assignee, setAssignee] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedSiteName = sites.find((s) => s.id === siteId)?.name ?? "";

  const reset = () => {
    setTemplateName(""); setSiteId(""); setFrequency("");
    setAssignee(""); setNextDue("");
  };

  const handleCreate = async () => {
    if (!templateName.trim() || !siteId || !frequency || !nextDue) return;
    setSaving(true);
    try {
      const id = await addSchedule(orgId, {
        templateId: `tpl_${Date.now()}`,
        templateName: templateName.trim(),
        siteId,
        siteName: selectedSiteName,
        frequency,
        assignee: assignee.trim(),
        nextDue,
      });
      await writeAuditEntry(orgId, {
        action: "scheduleCreated",
        userId,
        userEmail,
        targetId: id,
        description: `Created ${frequencyLabel(frequency).toLowerCase()} schedule "${templateName.trim()}" at ${selectedSiteName}`,
      });
      toast.success("Schedule created");
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to create schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Inspection Schedule</DialogTitle>
          <DialogDescription>
            Set up a recurring inspection at one of your sites.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="schedule-template-name" className="text-sm font-medium">Template / Inspection Name *</label>
            <Input
              id="schedule-template-name"
              placeholder="e.g. Fire Safety Weekly Check"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="schedule-site" className="text-sm font-medium">Site *</label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger id="schedule-site">
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="schedule-frequency" className="text-sm font-medium">Frequency *</label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="schedule-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {["daily","weekly","biweekly","monthly","quarterly","biannual","annual"].map((f) => (
                    <SelectItem key={f} value={f}>{frequencyLabel(f)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="schedule-first-due-date" className="text-sm font-medium">First Due Date *</label>
              <Input
                id="schedule-first-due-date"
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="schedule-assignee" className="text-sm font-medium">Assignee</label>
            <Input
              id="schedule-assignee"
              placeholder="Person or team responsible"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !templateName.trim() || !siteId || !frequency || !nextDue}
          >
            {saving ? "Creating..." : "Create Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Row Action Buttons ─── */
function ScheduleRowActions({
  schedule,
  orgId,
  userId,
  userEmail,
}: {
  schedule: Schedule & { resolvedSiteName: string };
  orgId: string;
  userId: string;
  userEmail: string;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    const newState = schedule.isActive === false ? true : false;
    try {
      await toggleScheduleActive(orgId, schedule.id, newState);
      await writeAuditEntry(orgId, {
        action: newState ? "scheduleResumed" : "schedulePaused",
        userId,
        userEmail,
        targetId: schedule.id,
        description: `${newState ? "Resumed" : "Paused"} schedule "${schedule.templateName ?? schedule.templateId}"`,
      });
      toast.success(newState ? "Schedule resumed" : "Schedule paused");
    } catch {
      toast.error("Failed to update schedule");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteSchedule(orgId, schedule.id);
      await writeAuditEntry(orgId, {
        action: "scheduleDeleted",
        userId,
        userEmail,
        targetId: schedule.id,
        description: `Deleted schedule "${schedule.templateName ?? schedule.templateId}" at ${schedule.resolvedSiteName}`,
      });
      toast.success("Schedule deleted");
    } catch {
      toast.error("Failed to delete schedule");
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={busy}
        onClick={handleToggle}
        title={schedule.isActive === false ? "Resume" : "Pause"}
      >
        {schedule.isActive === false ? (
          <Play className="h-4 w-4 text-green-600" />
        ) : (
          <Pause className="h-4 w-4 text-amber-600" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        disabled={busy}
        onClick={() => setConfirmDelete(true)}
        title="Delete schedule"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Delete schedule &ldquo;{schedule.templateName ?? schedule.templateId}&rdquo; at {schedule.resolvedSiteName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SchedulesPage() {
  const { schedules, loading } = useSchedules();
  const { sites } = useSites();
  const { orgId } = useOrg();
  const { user, profile } = useAuth();

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
        const order: Record<string, number> = { daily: 1, weekly: 2, biweekly: 3, monthly: 4, quarterly: 5, biannual: 6, annual: 7 };
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
    ...(orgId && user
      ? [
          {
            key: "actions" as const,
            label: "",
            className: "w-[80px]",
            render: (s: (typeof enriched)[number]) => (
              <ScheduleRowActions
                schedule={s}
                orgId={orgId}
                userId={user.uid}
                userEmail={profile?.email ?? ""}
              />
            ),
          },
        ]
      : []),
  ];

  const filters: FilterConfig[] = [
    {
      key: "frequency",
      label: "Frequency",
      options: [
        { label: "Daily", value: "daily" },
        { label: "Weekly", value: "weekly" },
        { label: "Bi-weekly", value: "biweekly" },
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Bi-annual", value: "biannual" },
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

  if (loading) return (
    <div className="space-y-6">
      <PageHeader title="Schedules" subtitle="Loading…" />
      <TableSkeleton rows={5} />
    </div>
  );

  const overdue = enriched.filter((s) => {
    try { return isPast(parseISO(s.nextDue)) && !isToday(parseISO(s.nextDue)); } catch { return false; }
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        subtitle={`${schedules.length} scheduled inspections${overdue > 0 ? ` · ${overdue} overdue` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            {orgId && user && (
              <CreateScheduleDialog
                orgId={orgId}
                userId={user.uid}
                userEmail={profile?.email ?? ""}
                sites={sites.map((s) => ({ id: s.id, name: s.name }))}
              />
            )}
            <Button variant="outline" size="sm" onClick={handleExport} disabled={enriched.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
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
          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
            title="No schedules yet"
            description={
              orgId
                ? 'Create your first inspection schedule using the "New Schedule" button above.'
                : "Schedules will appear here once configured."
            }
          />
        }
      />
    </div>
  );
}
