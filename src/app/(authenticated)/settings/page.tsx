"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/hooks/use-org";
import { Building2, User, Shield, Briefcase, Globe, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

function tierLabel(tier?: string): string {
  switch (tier) {
    case "business": return "Business";
    case "pro": return "Pro";
    case "free": return "Free";
    default: return tier || "Unknown";
  }
}

function tierDescription(tier?: string): string {
  switch (tier) {
    case "business": return "Dashboard access, team management, analytics, findings intelligence";
    case "pro": return "Dashboard access, analytics, reports";
    case "free": return "Mobile app only — upgrade to access the dashboard";
    default: return "Subscription data not available";
  }
}

function tierColor(tier?: string): string {
  switch (tier) {
    case "business": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "pro": return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300";
    default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

export default function SettingsPage() {
  const { profile } = useAuth();
  const { org, currentUserRole, error } = useOrg();

  const tier = profile?.subscriptionTier;

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
          {currentUserRole && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Role</label>
              <div>
                <Badge variant="secondary" className="text-xs capitalize">
                  {currentUserRole}
                </Badge>
              </div>
            </div>
          )}
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
            {profile?.jobTitle && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Job Title
                </label>
                <Input value={profile.jobTitle} readOnly className="bg-muted" />
              </div>
            )}
            {profile?.country && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Country
                </label>
                <Input value={profile.country} readOnly className="bg-muted" />
              </div>
            )}
            {profile?.industry && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Industry</label>
                <Input value={profile.industry} readOnly className="bg-muted" />
              </div>
            )}
            {profile?.company && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input value={profile.company} readOnly className="bg-muted" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription — real data from profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Subscription</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                {tierLabel(tier)} Tier
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tierDescription(tier)}
              </p>
            </div>
            <Badge className={cn("text-xs font-medium", tierColor(tier))}>
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Subscription is managed through the SafeCheck Pro mobile app via RevenueCat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
