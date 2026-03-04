"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/hooks/use-org";
import { updateUserProfile, updateOrgName, writeAuditEntry } from "@/lib/firestore";
import { Building2, User, Shield, Briefcase, Globe, CreditCard, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { user, profile } = useAuth();
  const { org, currentUserRole, isAdmin, error } = useOrg();

  // ─── Profile form state ───
  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // ─── Org form state ───
  const [orgName, setOrgName] = useState("");
  const [orgDirty, setOrgDirty] = useState(false);
  const [orgSaving, setOrgSaving] = useState(false);

  // Sync from profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setJobTitle(profile.jobTitle ?? "");
      setCompany(profile.company ?? "");
      setCountry(profile.country ?? "");
      setIndustry(profile.industry ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (org) setOrgName(org.name ?? "");
  }, [org]);

  // Dirty detection
  useEffect(() => {
    if (!profile) return;
    setProfileDirty(
      displayName !== (profile.displayName ?? "") ||
      jobTitle !== (profile.jobTitle ?? "") ||
      company !== (profile.company ?? "") ||
      country !== (profile.country ?? "") ||
      industry !== (profile.industry ?? "")
    );
  }, [displayName, jobTitle, company, country, industry, profile]);

  useEffect(() => {
    if (!org) return;
    setOrgDirty(orgName !== (org.name ?? ""));
  }, [orgName, org]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        country: country.trim(),
        industry: industry.trim(),
      });
      toast.success("Profile updated");
      setProfileDirty(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!profile?.orgId || !user) return;
    setOrgSaving(true);
    try {
      await updateOrgName(profile.orgId, orgName.trim());
      await writeAuditEntry(profile.orgId, {
        action: "orgUpdated" as any,
        userId: user.uid,
        userEmail: profile.email ?? "",
        targetId: profile.orgId,
        description: `Updated organization name to "${orgName.trim()}"`,
      });
      toast.success("Organization name updated");
      setOrgDirty(false);
    } catch {
      toast.error("Failed to update organization name");
    } finally {
      setOrgSaving(false);
    }
  };

  const tier = profile?.subscriptionTier;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your organization and profile" />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
          Failed to load organization data: {error}
        </div>
      )}

      {/* Organization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Organization</CardTitle>
            </div>
            {isAdmin && orgDirty && (
              <Button size="sm" onClick={handleSaveOrg} disabled={orgSaving}>
                <Save className="mr-2 h-4 w-4" />
                {orgSaving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="setting-org-name" className="text-sm font-medium">Organization Name</label>
              {isAdmin ? (
                <Input
                  id="setting-org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organization name"
                />
              ) : (
                <Input id="setting-org-name" value={org?.name ?? ""} readOnly className="bg-muted" />
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-org-id" className="text-sm font-medium">Organization ID</label>
              <Input id="setting-org-id" value={org?.id ?? ""} readOnly className="bg-muted font-mono text-xs" />
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
            {profileDirty && (
              <Button size="sm" onClick={handleSaveProfile} disabled={profileSaving}>
                <Save className="mr-2 h-4 w-4" />
                {profileSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="setting-display-name" className="text-sm font-medium">Display Name</label>
              <Input
                id="setting-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-email" className="text-sm font-medium">Email</label>
              <Input id="setting-email" value={profile?.email ?? ""} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-job-title" className="text-sm font-medium flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Job Title
              </label>
              <Input
                id="setting-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Health & Safety Manager"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-country" className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Country
              </label>
              <Input
                id="setting-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United Kingdom"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-industry" className="text-sm font-medium">Industry</label>
              <Input
                id="setting-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Construction"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="setting-company" className="text-sm font-medium">Company</label>
              <Input
                id="setting-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Safety Ltd"
              />
            </div>
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
