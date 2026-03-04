"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
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
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/lib/auth";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  writeAuditEntry,
} from "@/lib/firestore";
import { exportToCsv } from "@/lib/csv-export";
import { formatDate, cn } from "@/lib/utils";
import { Users, Download, UserPlus, Trash2 } from "lucide-react";
import type { OrgMember, OrgRole } from "@/lib/types";
import { toast } from "sonner";

function roleColor(role: OrgRole): string {
  switch (role) {
    case "admin":
      return "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300";
    case "manager":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300";
    case "inspector":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
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

/* ─── Inline Role Select ─── */
function RoleSelect({
  member,
  orgId,
  currentUserEmail,
  disabled,
}: {
  member: OrgMember;
  orgId: string;
  currentUserEmail: string;
  disabled: boolean;
}) {
  const [updating, setUpdating] = useState(false);

  const handleChange = async (newRole: string) => {
    if (newRole === member.role || !orgId) return;
    setUpdating(true);
    try {
      await updateMemberRole(orgId, member.userId, newRole as OrgRole);
      await writeAuditEntry(orgId, {
        action: "member_role_changed",
        userId: member.userId,
        userEmail: currentUserEmail,
        targetId: member.userId,
        description: `Role changed from ${roleLabel(member.role)} to ${roleLabel(newRole as OrgRole)} for ${member.email}`,
      });
      toast.success(`${member.displayName || member.email} role updated to ${roleLabel(newRole as OrgRole)}`);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdating(false);
    }
  };

  if (disabled) {
    return (
      <Badge
        variant="secondary"
        className={cn("text-xs px-2 py-0.5 font-medium", roleColor(member.role))}
      >
        {roleLabel(member.role)}
      </Badge>
    );
  }

  return (
    <Select value={member.role} onValueChange={handleChange} disabled={updating}>
      <SelectTrigger className="h-7 w-[110px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roleOptions.map((r) => (
          <SelectItem key={r} value={r} className="text-xs">
            {roleLabel(r)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ─── Remove Member Button ─── */
function RemoveMemberButton({
  member,
  orgId,
  currentUserEmail,
}: {
  member: OrgMember;
  orgId: string;
  currentUserEmail: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!orgId) return;
    setRemoving(true);
    try {
      await removeMember(orgId, member.userId);
      await writeAuditEntry(orgId, {
        action: "member_removed",
        userId: member.userId,
        userEmail: currentUserEmail,
        targetId: member.userId,
        description: `Removed ${member.email} from the organization`,
      });
      toast.success(`${member.displayName || member.email} removed`);
      setConfirming(false);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-red-600"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="destructive"
        size="sm"
        className="h-7 text-xs"
        onClick={handleRemove}
        disabled={removing}
      >
        {removing ? "..." : "Confirm"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

const filters: FilterConfig[] = [
  {
    key: "role",
    label: "Role",
    options: roleOptions.map((r) => ({ value: r, label: roleLabel(r) })),
  },
];

export default function TeamPage() {
  const { org, members, loading, error, isAdmin, orgId } = useOrg();
  const { user } = useAuth();

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("inspector");
  const [inviting, setInviting] = useState(false);

  const currentUserEmail = user?.email || "";

  const handleInvite = useCallback(async () => {
    if (!orgId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteMember(orgId, inviteEmail.trim(), inviteRole);
      await writeAuditEntry(orgId, {
        action: "member_invited",
        userId: user?.uid || "",
        userEmail: currentUserEmail,
        targetId: inviteEmail.trim(),
        description: `Invited ${inviteEmail.trim()} as ${roleLabel(inviteRole)}`,
      });
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      setInviteRole("inspector");
      setInviteOpen(false);
    } catch {
      toast.error("Failed to invite member");
    } finally {
      setInviting(false);
    }
  }, [orgId, inviteEmail, inviteRole, user?.uid, currentUserEmail]);

  const handleExport = () => {
    exportToCsv("team-members", members, [
      { header: "Name", value: (m) => m.displayName },
      { header: "Email", value: (m) => m.email },
      { header: "Role", value: (m) => roleLabel(m.role) },
      { header: "Joined", value: (m) => m.joinedAt },
    ]);
    toast.success("Team members exported to CSV");
  };

  // Build columns inside the component so we can access orgId / isAdmin / userEmail
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
        <RoleSelect
          member={m}
          orgId={orgId || ""}
          currentUserEmail={currentUserEmail}
          disabled={!isAdmin || m.email === currentUserEmail}
        />
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
    ...(isAdmin
      ? [
          {
            key: "actions" as const,
            label: "",
            render: (m: OrgMember) =>
              m.email !== currentUserEmail ? (
                <RemoveMemberButton
                  member={m}
                  orgId={orgId || ""}
                  currentUserEmail={currentUserEmail}
                />
              ) : null,
          },
        ]
      : []),
  ];

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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join {org?.name || "your organization"}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <label htmlFor="invite-email" className="text-sm font-medium">
                        Email address
                      </label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="invite-role" className="text-sm font-medium">
                        Role
                      </label>
                      <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                        <SelectTrigger id="invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((r) => (
                            <SelectItem key={r} value={r}>
                              {roleLabel(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail.trim()}
                    >
                      {inviting ? "Sending..." : "Send Invite"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="sm" onClick={handleExport} disabled={members.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
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
            description={
              isAdmin
                ? "Invite team members using the button above."
                : "Invite team members from the mobile app to collaborate on inspections."
            }
          />
        }
      />
    </div>
  );
}
