"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreBadge } from "@/components/shared/score-badge";
import { InspectionStatusBadge, SeverityBadge, ActionStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Separator } from "@/components/ui/separator";
import { useSites } from "@/hooks/use-sites";
import { useInspections } from "@/hooks/use-inspections";
import { useActions } from "@/hooks/use-actions";
import { formatDate, cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import {
  MapPin,
  Phone,
  User,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { sites, loading: sitesLoading } = useSites();
  const { inspections, loading: inspLoading } = useInspections();
  const { actions, loading: actionsLoading } = useActions();

  const site = sites.find((s) => s.id === id);
  // Match by siteId if available, fall back to name matching
  const siteInspections = inspections.filter(
    (i) => (i.siteId && i.siteId === id) || (!i.siteId && i.siteName === site?.name)
  );
  const loading = sitesLoading || inspLoading || actionsLoading;

  // Open corrective actions for this site
  const siteActions = useMemo(() => {
    const inspIds = new Set(siteInspections.map((i) => i.id));
    return actions.filter((a) => inspIds.has(a.inspectionId));
  }, [siteInspections, actions]);

  const openSiteActions = useMemo(
    () => siteActions.filter((a) => a.status === "open" || a.status === "inProgress"),
    [siteActions]
  );

  // Compliance trend data (score over time, chronological order)
  const trendData = useMemo(() => {
    return siteInspections
      .filter((i) => i.score !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((i) => ({
        date: new Date(i.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
        score: i.score,
      }));
  }, [siteInspections]);

  // Score delta from previous inspection
  const scoreDelta = useMemo(() => {
    const scored = siteInspections.filter((i) => i.score !== null);
    if (scored.length < 2) return null;
    return (scored[0].score ?? 0) - (scored[1].score ?? 0);
  }, [siteInspections]);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{siteInspections.length}</p>
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
            <div className="flex items-center justify-center gap-1">
              {scoreDelta !== null ? (
                <>
                  {scoreDelta > 0 && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                  {scoreDelta < 0 && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {scoreDelta === 0 && <Minus className="h-4 w-4 text-muted-foreground" />}
                  <span className={cn("text-lg font-bold",
                    scoreDelta > 0 ? "text-emerald-600" : scoreDelta < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score Delta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold", openSiteActions.length > 0 && "text-amber-600 dark:text-amber-400")}>
              {openSiteActions.length}
            </p>
            <p className="text-xs text-muted-foreground">Open Actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Trend Chart */}
      {trendData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--card-foreground)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--primary)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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

      {/* Open Corrective Actions */}
      {openSiteActions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base">
                Open Corrective Actions ({openSiteActions.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Finding</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Severity</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Assignee</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openSiteActions.map((a) => {
                    const isOverdue =
                      a.dueDate && new Date(a.dueDate) < new Date();
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-sm font-medium max-w-[240px] truncate">
                          {a.title}
                        </TableCell>
                        <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                        <TableCell><ActionStatusBadge status={a.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.assignee || "Unassigned"}
                        </TableCell>
                        <TableCell className={cn(
                          "text-sm whitespace-nowrap",
                          isOverdue ? "text-red-600 font-medium dark:text-red-400" : "text-muted-foreground"
                        )}>
                          {formatDate(a.dueDate)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
