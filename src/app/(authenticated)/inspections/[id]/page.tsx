"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { InspectionStatusBadge } from "@/components/shared/status-badge";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useInspectionDetail } from "@/hooks/use-inspection-detail";
import type { InspectionAnswer, AnswerValue } from "@/lib/types";
import {
  Download,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  MinusCircle,
  MessageSquare,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhotoGallery } from "@/components/shared/photo-gallery";
import { exportToCsv } from "@/lib/csv-export";
import { downloadInspectionPdf } from "@/lib/pdf-report";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/hooks/use-org";
import { toast } from "sonner";
import { FileText } from "lucide-react";

function answerIcon(value: AnswerValue) {
  switch (value) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "na":
      return <MinusCircle className="h-4 w-4 text-slate-400" />;
    default:
      return <MinusCircle className="h-4 w-4 text-slate-300" />;
  }
}

function answerColor(value: AnswerValue): string {
  switch (value) {
    case "pass":
      return "bg-emerald-50 text-emerald-700";
    case "fail":
      return "bg-red-50 text-red-700";
    case "na":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-slate-50 text-slate-400";
  }
}

function answerLabel(value: AnswerValue): string {
  switch (value) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "na":
      return "N/A";
    default:
      return value;
  }
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { inspection, answers, loading, error } = useInspectionDetail(id);
  const { profile } = useAuth();
  const { org } = useOrg();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Inspections", href: "/inspections" }, { label: "Error" }]} />
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Inspections", href: "/inspections" }, { label: "Not Found" }]} />
        <p className="text-muted-foreground">Inspection not found.</p>
      </div>
    );
  }

  // Build a lookup of answers by sectionId
  const answersMap = new Map<string, InspectionAnswer>();
  for (const a of answers) {
    answersMap.set(a.sectionId, a);
  }

  // Build flat list for CSV export
  const exportRows: { section: string; question: string; answer: string; note: string }[] = [];
  for (const section of inspection.sections) {
    const sa = answersMap.get(section.id);
    if (!sa) continue;
    for (const [qId, val] of Object.entries(sa.answers)) {
      exportRows.push({
        section: section.name,
        question: qId,
        answer: answerLabel(val),
        note: sa.notes?.[qId] || "",
      });
    }
  }

  const handleExport = () => {
    exportToCsv(`inspection-${inspection.id}`, exportRows, [
      { header: "Section", value: (r) => r.section },
      { header: "Question", value: (r) => r.question },
      { header: "Answer", value: (r) => r.answer },
      { header: "Note", value: (r) => r.note },
    ]);
    toast.success("Report exported to CSV");
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Inspections", href: "/inspections" }, { label: inspection.name }]} />

      <PageHeader
        title={inspection.name}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                downloadInspectionPdf(inspection, answers, org?.name);
                toast.success("PDF report downloaded");
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export inspection report as CSV</TooltipContent>
            </Tooltip>
          </div>
        }
      />

      {/* Meta info */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {inspection.siteId ? (
            <Link href={`/sites/${inspection.siteId}`} className="hover:text-primary hover:underline">
              {inspection.siteName || "No site"}
            </Link>
          ) : (
            inspection.siteName || "No site"
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          {inspection.inspectorName || "Unknown"}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {formatDate(inspection.date)}
        </div>
        <ScoreBadge score={inspection.score} />
        <InspectionStatusBadge status={inspection.status} />
      </div>

      <Separator />

      {/* Section overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inspection.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {section.completedCount}/{section.questionCount} questions
                </span>
                <ScoreBadge score={section.score} />
              </div>
              <div
                className="mt-2 h-1.5 rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={section.questionCount > 0 ? Math.round((section.completedCount / section.questionCount) * 100) : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${section.name} progress`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${section.questionCount > 0 ? (section.completedCount / section.questionCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed answers — the report viewer */}
      {answers.length > 0 && (
        <>
          <Separator />
          <h2 className="text-lg font-semibold">Inspection Report</h2>

          {inspection.sections.map((section) => {
            const sectionAnswers = answersMap.get(section.id);
            if (!sectionAnswers) return null;

            const questionIds = Object.keys(sectionAnswers.answers);
            if (questionIds.length === 0) return null;

            // Summary counts for this section
            const passCount = questionIds.filter(
              (qId) => sectionAnswers.answers[qId] === "pass"
            ).length;
            const failCount = questionIds.filter(
              (qId) => sectionAnswers.answers[qId] === "fail"
            ).length;
            const naCount = questionIds.filter(
              (qId) => sectionAnswers.answers[qId] === "na"
            ).length;

            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {passCount > 0 && (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                          {passCount} Pass
                        </Badge>
                      )}
                      {failCount > 0 && (
                        <Badge variant="secondary" className="bg-red-50 text-red-700 text-xs">
                          {failCount} Fail
                        </Badge>
                      )}
                      {naCount > 0 && (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-xs">
                          {naCount} N/A
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {questionIds.map((qId, qIndex) => {
                      const value = sectionAnswers.answers[qId];
                      const note = sectionAnswers.notes?.[qId];
                      const photos = sectionAnswers.photos?.[qId];
                      // Show a readable label: "Q1", "Q2" etc. with the raw ID as tooltip
                      const qLabel = `Q${qIndex + 1}`;

                      return (
                        <div key={qId} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-2 min-w-0">
                              {answerIcon(value)}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm font-medium text-foreground cursor-help">
                                    {qLabel}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <span className="font-mono text-xs">{qId}</span>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs px-2 py-0.5 font-medium shrink-0",
                                answerColor(value)
                              )}
                            >
                              {answerLabel(value)}
                            </Badge>
                          </div>

                          {/* Note */}
                          {note && (
                            <div className="mt-2 ml-6 flex items-start gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-sm text-muted-foreground">
                                {note}
                              </p>
                            </div>
                          )}

                          {/* Photos */}
                          {photos && photos.length > 0 && (
                            <div className="mt-2 ml-6">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {photos.length} photo{photos.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              <PhotoGallery paths={photos} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
