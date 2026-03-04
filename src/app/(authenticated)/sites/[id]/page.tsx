"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreBadge } from "@/components/shared/score-badge";
import { InspectionStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Separator } from "@/components/ui/separator";
import { useSites } from "@/hooks/use-sites";
import { useInspections } from "@/hooks/use-inspections";
import { formatDate } from "@/lib/utils";
import { useParams } from "next/navigation";
import { MapPin, Phone, User, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sites, loading: sitesLoading } = useSites();
  const { inspections, loading: inspLoading } = useInspections();

  const site = sites.find((s) => s.id === id);
  // Match by siteId if available, fall back to name matching
  const siteInspections = inspections.filter(
    (i) => (i.siteId && i.siteId === id) || (!i.siteId && i.siteName === site?.name)
  );
  const loading = sitesLoading || inspLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Sites", href: "/sites" }, { label: "Not Found" }]} />
        <p className="text-muted-foreground">Site not found.</p>
      </div>
    );
  }

  // Compute average score for this site
  const scored = siteInspections.filter((i) => i.score !== null);
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, i) => sum + (i.score ?? 0), 0) / scored.length)
      : null;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Sites", href: "/sites" }, { label: site.name }]} />

      <PageHeader title={site.name} />

      {/* Meta info */}
      <div className="flex flex-wrap gap-4">
        {site.address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {site.address}
          </div>
        )}
        {site.contactName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {site.contactName}
          </div>
        )}
        {site.contactPhone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            {site.contactPhone}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{site.inspectionCount}</p>
            <p className="text-xs text-muted-foreground">Total Inspections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex justify-center">
              <ScoreBadge score={avgScore} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg. Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium">{formatDate(site.lastInspectionDate)}</p>
            <p className="text-xs text-muted-foreground">Last Inspection</p>
          </CardContent>
        </Card>
      </div>

      {site.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{site.notes}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Inspection history for this site */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspection History</CardTitle>
        </CardHeader>
        <CardContent>
          {siteInspections.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-10 w-10" />}
              title="No inspections for this site"
              description="Inspections completed at this site will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Inspector</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Score</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siteInspections.map((insp) => (
                    <TableRow key={insp.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(insp.date)}</TableCell>
                      <TableCell className="text-sm font-medium">
                        <Link href={`/inspections/${insp.id}`} className="hover:text-primary hover:underline">
                          {insp.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {insp.inspectorName || "—"}
                      </TableCell>
                      <TableCell><ScoreBadge score={insp.score} /></TableCell>
                      <TableCell><InspectionStatusBadge status={insp.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
