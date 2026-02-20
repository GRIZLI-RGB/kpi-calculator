import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CATEGORY_LABELS } from "./kpi";
import { formatDate, formatMonth } from "./dates";
import { ROBOTO_REGULAR_BASE64, ROBOTO_MEDIUM_BASE64 } from "./roboto-font";
import type { WeeklyReportData, MonthlyResponse, ReportEntryData } from "./types";

function loadFont(doc: jsPDF): boolean {
  try {
    doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
    doc.addFileToVFS("Roboto-Medium.ttf", ROBOTO_MEDIUM_BASE64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFont("Roboto-Medium.ttf", "Roboto", "bold");
    doc.setFont("Roboto");
    return true;
  } catch {
    return false;
  }
}

function t(cyrillic: string, latin: string, hasFont: boolean) {
  return hasFont ? cyrillic : latin;
}

export function generateWeeklyPdf(report: WeeklyReportData) {
  const doc = new jsPDF({ orientation: "landscape" });
  const hasFont = loadFont(doc);
  const fontName = hasFont ? "Roboto" : "helvetica";

  doc.setFont(fontName);
  doc.setFontSize(16);
  doc.text(t("Отчёт по команде", "Team Report", hasFont), 14, 15);
  doc.setFontSize(10);
  doc.text(
    `${t("Период", "Period", hasFont)}: ${formatDate(report.periodStart)} \u2014 ${formatDate(report.periodEnd)}`,
    14,
    22
  );

  const grouped = new Map<
    string,
    Map<string, { empName: string; entries: ReportEntryData[] }>
  >();
  for (const entry of report.entries) {
    const cat = entry.metricConfig.category;
    if (!grouped.has(cat)) grouped.set(cat, new Map());
    const catMap = grouped.get(cat)!;
    if (!catMap.has(entry.employeeId)) {
      catMap.set(entry.employeeId, { empName: entry.employee.name, entries: [] });
    }
    catMap.get(entry.employeeId)!.entries.push(entry);
  }

  let startY = 28;

  for (const [category, empMap] of grouped.entries()) {
    const catLabel = hasFont
      ? (CATEGORY_LABELS[category] ?? category)
      : category;

    const tableRows: (string | number)[][] = [];
    for (const { empName, entries } of empMap.values()) {
      tableRows.push([empName, "", "", "", "", ""]);
      for (const e of entries) {
        tableRows.push([
          `  ${e.metricConfig.name}`,
          e.fact,
          e.goal,
          `${e.percent.toFixed(1)}%`,
          `${(e.metricConfig.weight * 100).toFixed(0)}%`,
          e.weightedScore.toFixed(1),
        ]);
      }
    }

    autoTable(doc, {
      startY,
      head: [[
        catLabel,
        t("Факт", "Fact", hasFont),
        t("Цель", "Goal", hasFont),
        "%",
        t("Вес", "Weight", hasFont),
        t("Балл", "Score", hasFont),
      ]],
      body: tableRows,
      styles: { font: fontName, fontSize: 8 },
      headStyles: { fillColor: [41, 41, 41] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const text = String(data.cell.raw);
          if (!text.startsWith("  ")) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  const empTotals = new Map<string, { name: string; kpi: number; budget: number | null }>();
  for (const entry of report.entries) {
    const existing = empTotals.get(entry.employeeId);
    if (existing) {
      existing.kpi += entry.weightedScore;
    } else {
      empTotals.set(entry.employeeId, {
        name: entry.employee.name,
        kpi: entry.weightedScore,
        budget: entry.employee.kpiBudget,
      });
    }
  }

  const summaryRows = Array.from(empTotals.values()).map((emp) => [
    emp.name,
    `${emp.kpi.toFixed(1)}%`,
    emp.budget !== null
      ? `${Math.round(emp.budget * (emp.kpi / 100)).toLocaleString("ru-RU")} ${t("₽", "RUB", hasFont)}`
      : "\u2014",
  ]);

  autoTable(doc, {
    startY: startY + 2,
    head: [[
      t("Сотрудник", "Employee", hasFont),
      "KPI %",
      t("KPI ₽", "KPI RUB", hasFont),
    ]],
    body: summaryRows,
    styles: { font: fontName, fontSize: 9 },
    headStyles: { fillColor: [41, 41, 41] },
    margin: { left: 14, right: 14 },
  });

  doc.save(
    `KPI_Report_${formatDate(report.periodStart).replace(/\./g, "-")}_${formatDate(report.periodEnd).replace(/\./g, "-")}.pdf`
  );
}

export function generateMonthlyPdf(data: MonthlyResponse) {
  const doc = new jsPDF({ orientation: "landscape" });
  const hasFont = loadFont(doc);
  const fontName = hasFont ? "Roboto" : "helvetica";

  doc.setFont(fontName);
  doc.setFontSize(16);
  doc.text(t("Месячная сводка", "Monthly Summary", hasFont), 14, 15);
  doc.setFontSize(10);
  doc.text(formatMonth(data.month), 14, 22);

  const weekHeaders = data.summary[0]?.weeklyKpis.map(
    (w) => `${formatDate(w.periodStart)}\u2014${formatDate(w.periodEnd)}`
  ) ?? [];

  const headers = [
    t("Сотрудник", "Employee", hasFont),
    ...weekHeaders,
    t("Средний KPI", "Avg KPI", hasFont),
    t("KPI ₽", "KPI RUB", hasFont),
  ];
  const rows = data.summary.map((s) => [
    s.employee.name,
    ...s.weeklyKpis.map((w) => `${w.kpi.toFixed(1)}%`),
    `${s.monthlyKpi.toFixed(1)}%`,
    s.moneyKpi !== null
      ? `${s.moneyKpi.toLocaleString("ru-RU")} ${t("₽", "RUB", hasFont)}`
      : "\u2014",
  ]);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    styles: { font: fontName, fontSize: 9 },
    headStyles: { fillColor: [41, 41, 41] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`KPI_Monthly_${data.month}.pdf`);
}
