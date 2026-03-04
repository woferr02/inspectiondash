"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/hooks/use-org";
import { Building2, User, Shield } from "lucide-react";

export default function SettingsPage() {
  const { profile } = useAuth();
  const { org, error } = useOrg();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your organization and preferences" />

      {/* Read-only notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
        <strong>Read-only</strong> — Organization and profile settings are managed from the
        SafeCheck Pro mobile app. Changes made there will be reflected here.
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          Failed to load organization data: {error}
        </div>
      )}

      {/* Organization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Organization</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Name</label>
              <Input value={org?.name ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization ID</label>
              <Input value={org?.id ?? ""} readOnly className="bg-muted font-mono text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input value={profile?.displayName ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={profile?.email ?? ""} readOnly className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Subscription</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
            <div>
              <p className="text-sm font-semibold text-primary">Business Tier</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dashboard access, team management, analytics
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
