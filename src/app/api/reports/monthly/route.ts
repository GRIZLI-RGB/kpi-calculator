import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { calculateMoneyKpi } from "@/lib/kpi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // e.g., "2026-02"

  if (!month) {
    return NextResponse.json(
      { error: "month parameter required (e.g. 2026-02)" },
      { status: 400 }
    );
  }

  const [year, m] = month.split("-").map(Number);
  const startOfMonth = new Date(year, m - 1, 1);
  const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);

  // Overlap: include reports whose period intersects the month
  const reports = await prisma.weeklyReport.findMany({
    where: {
      periodStart: { lte: endOfMonth },
      periodEnd: { gte: startOfMonth },
    },
    include: {
      entries: {
        include: {
          employee: true,
          metricConfig: true,
        },
      },
    },
    orderBy: { periodStart: "asc" },
  });

  const employees = await prisma.employee.findMany({
    include: { metrics: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  // Aggregate per employee
  const summary = employees.map((emp) => {
    const weeklyKpis: { reportId: string; periodStart: string; periodEnd: string; kpi: number }[] = [];

    for (const report of reports) {
      const empEntries = report.entries.filter(
        (e) => e.employeeId === emp.id
      );
      if (empEntries.length === 0) continue;

      const weekKpi = empEntries.reduce((sum, e) => sum + e.weightedScore, 0);
      weeklyKpis.push({
        reportId: report.id,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        kpi: Math.round(weekKpi * 100) / 100,
      });
    }

    const monthlyKpi =
      weeklyKpis.length > 0
        ? Math.round(
            (weeklyKpis.reduce((s, w) => s + w.kpi, 0) / weeklyKpis.length) *
              100
          ) / 100
        : 0;

    const moneyKpi = calculateMoneyKpi(monthlyKpi, emp.kpiBudget);

    return {
      employee: emp,
      weeklyKpis,
      monthlyKpi,
      moneyKpi,
      weeksCount: weeklyKpis.length,
    };
  });

  return NextResponse.json({
    month,
    reportsCount: reports.length,
    summary,
  });
}
