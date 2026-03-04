"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column, type FilterConfig } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useInspections } from "@/hooks/use-inspections";
import { exportToCsv } from "@/lib/csv-export";
import { FileText, ClipboardCheck, BarChart3, Download } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TemplateSummary {
  templateId: string;
  name: string;
  usageCount: number;
  avgScore: number | null;
  lastUsed: string | null;
}

const columns: Column<TemplateSummary>[] = [
  {
    key: "name",
    label: "Template Name",
    sortable: true,
    className: "text-sm font-medium",
    render: (t) => t.name,
    sortValue: (t) => t.name.toLowerCase(),
  },
  {
    key: "usageCount",
    label: "Times Used",
    sortable: true,
    className: "text-sm tabular-nums text-right",
    headerClassName: "text-xs uppercase tracking-wider text-right",
    render: (t) => t.usageCount,
    sortValue: (t) => t.usageCount,
  },
  {
    key: "avgScore",
    label: "Avg. Score",
    sortable: true,
    render: (t) =>
      t.avgScore !== null ? (
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-medium tabular-nums",
            t.avgScore >= 80
              ? "bg-emerald-50 text-emerald-700"
              : t.avgScore >= 50
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
          )}
        >
          {t.avgScore}%
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    sortValue: (t) => t.avgScore,
  },
  {
    key: "lastUsed",
    label: "Last Used",
    sortable: true,
    className: "text-sm text-muted-foreground whitespace-nowrap",
    render: (t) => {
      if (!t.lastUsed) return "—";
      try {
        return new Date(t.lastUsed).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch {
        return "—";
      }
    },
    sortValue: (t) => t.lastUsed || "",
  },
];

export default function TemplatesPage() {
  const { inspections, loading } = useInspections();

  const templates = useMemo(() => {
    const map: Record<string, { name: string; count: number; scores: number[]; dates: string[] }> = {};
    for (const insp of inspections) {
      const key = insp.templateId || insp.name;
      if (!map[key]) map[key] = { name: insp.name, count: 0, scores: [], dates: [] };
      map[key].count++;
      if (insp.score !== null) map[key].scores.push(insp.score);
      if (insp.date) map[key].dates.push(insp.date);
    }
    return Object.entries(map)
      .map(([templateId, { name, count, scores, dates }]): TemplateSummary => ({
        templateId,
        name,
        usageCount: count,
        avgScore:
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null,
        lastUsed: dates.sort().reverse()[0] || null,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);
  }, [inspections]);

  const handleExport = () => {
    exportToCsv("templates", templates, [
      { header: "Template", value: (t) => t.name },
      { header: "Times Used", value: (t) => t.usageCount },
      { header: "Avg. Score", value: (t) => t.avgScore },
      { header: "Last Used", value: (t) => t.lastUsed },
    ]);
    toast.success("Templates exported to CSV");
  };

  if (loading) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        subtitle={`${templates.length} templates used across your inspections`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={templates.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{templates.length}</p>
              <p className="text-xs text-muted-foreground">Templates Used</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inspections.length}</p>
              <p className="text-xs text-muted-foreground">Total Inspections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {templates.length > 0
                  ? Math.round(inspections.length / templates.length * 10) / 10
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground">Avg. Uses / Template</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={templates}
        columns={columns}
        searchPlaceholder="Search templates..."
        searchFn={(item, q) => item.name.toLowerCase().includes(q)}
        getRowKey={(t) => t.templateId}
        emptyState={
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No templates used yet"
            description="Templates will appear here once inspections are completed in the mobile app."
          />
        }
      />
    </div>
  );
}
