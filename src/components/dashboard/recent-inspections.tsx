"use client";

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
import { formatDate } from "@/lib/utils";
import type { Inspection } from "@/lib/types";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";

interface RecentInspectionsProps {
  inspections: Inspection[];
}

export function RecentInspections({ inspections }: RecentInspectionsProps) {
  const recent = inspections.slice(0, 10);

  if (recent.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<ClipboardCheck className="h-10 w-10" />}
            title="No inspections yet"
            description="Your team's inspections will appear here once they sync from the mobile app."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Inspections</CardTitle>
        <Link
          href="/inspections"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  Inspection
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  Site
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  Inspector
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  Score
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((inspection) => (
                <TableRow
                  key={inspection.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(inspection.date)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <Link href={`/inspections/${inspection.id}`} className="hover:text-primary hover:underline">
                      {inspection.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {inspection.siteId ? (
                      <Link href={`/sites/${inspection.siteId}`} className="hover:text-primary hover:underline">
                        {inspection.siteName || "—"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{inspection.siteName || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inspection.inspectorName || "—"}
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={inspection.score} />
                  </TableCell>
                  <TableCell>
                    <InspectionStatusBadge status={inspection.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
