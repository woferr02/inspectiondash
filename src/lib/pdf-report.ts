"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Inspection, InspectionAnswer, AnswerValue } from "@/lib/types";

function answerLabel(value: AnswerValue): string {
  switch (value) {
    case "pass": return "PASS";
    case "fail": return "FAIL";
    case "na": return "N/A";
    default: return value;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return dateStr; }
}

/**
 * Generate a branded PDF inspection report.
 * Returns the jsPDF instance (caller can save or open).
 */
export function generateInspectionPdf(
  inspection: Inspection,
  answers: InspectionAnswer[],
  orgName?: string,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ─── Header bar ───
  doc.setFillColor(17, 24, 39); // slate-900
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("SafeCheck Pro", margin, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Inspection Report", margin, 24);

  if (orgName) {
    doc.setFontSize(9);
    doc.text(orgName, pageWidth - margin, 16, { align: "right" });
  }

  doc.setFontSize(9);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, pageWidth - margin, 24, { align: "right" });

  y = 48;

  // ─── Inspection title ───
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(inspection.name, margin, y);
  y += 10;

  // ─── Meta info table ───
  const meta = [
    ["Site", inspection.siteName || "—"],
    ["Address", inspection.siteAddress || "—"],
    ["Inspector", inspection.inspectorName || "—"],
    ["Date", formatDate(inspection.date)],
    ["Score", inspection.score !== null ? `${inspection.score}%` : "—"],
    ["Status", (inspection.status || "—").replace(/([A-Z])/g, " $1").trim()],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: meta,
    theme: "plain",
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30, textColor: [100, 116, 139] },
      1: { textColor: [17, 24, 39] },
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ─── Section summary ───
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Section Summary", margin, y);
  y += 2;

  const sectionSummary = inspection.sections.map((s) => [
    s.name,
    `${s.completedCount}/${s.questionCount}`,
    s.score !== null ? `${s.score}%` : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Section", "Completed", "Score"]],
    body: sectionSummary,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 9, textColor: [17, 24, 39] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // ─── Build answers map ───
  const answersMap = new Map<string, InspectionAnswer>();
  for (const a of answers) {
    answersMap.set(a.sectionId, a);
  }

  // ─── Detailed findings per section ───
  for (const section of inspection.sections) {
    const sectionAnswers = answersMap.get(section.id);
    if (!sectionAnswers) continue;
    const questionIds = Object.keys(sectionAnswers.answers);
    if (questionIds.length === 0) continue;

    // Check if we need a new page
    if (y > 240) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(section.name, margin, y);
    y += 2;

    const rows = questionIds.map((qId, idx) => {
      const value = sectionAnswers.answers[qId];
      const note = sectionAnswers.notes?.[qId] || "";
      const photoCount = sectionAnswers.photos?.[qId]?.length || 0;
      const extras: string[] = [];
      if (note) extras.push(`Note: ${note}`);
      if (photoCount > 0) extras.push(`${photoCount} photo(s)`);

      return [
        `Q${idx + 1}`,
        qId.replace(/_/g, " "),
        answerLabel(value),
        extras.join(" | "),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Question", "Result", "Notes / Photos"]],
      body: rows,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [71, 85, 105],
        fontStyle: "bold",
        fontSize: 7,
      },
      bodyStyles: { fontSize: 8, textColor: [17, 24, 39] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: "auto", textColor: [100, 116, 139], fontStyle: "italic" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        // Color the Result column
        if (data.column.index === 2 && data.section === "body") {
          const val = data.cell.raw as string;
          if (val === "PASS") data.cell.styles.textColor = [5, 150, 105];
          else if (val === "FAIL") data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [148, 163, 184];
        }
      },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ─── Footer on every page ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `SafeCheck Pro — ${inspection.name} — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  return doc;
}

/** Generate and trigger download */
export function downloadInspectionPdf(
  inspection: Inspection,
  answers: InspectionAnswer[],
  orgName?: string,
) {
  const doc = generateInspectionPdf(inspection, answers, orgName);
  const filename = `inspection-${inspection.id}-${inspection.date}.pdf`;
  doc.save(filename);
}
