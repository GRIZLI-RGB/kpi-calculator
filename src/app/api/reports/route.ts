import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { calculateMetric } from "@/lib/kpi";

export async function GET() {
  const reports = await prisma.weeklyReport.findMany({
    include: {
      entries: {
        include: { employee: true, metricConfig: true },
      },
    },
    orderBy: { periodStart: "desc" },
  });
  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { periodStart, periodEnd, entries } = body as {
    periodStart: string;
    periodEnd: string;
    entries: Array<{
      employeeId: string;
      metricConfigId: string;
      fact: number;
      goal: number;
    }>;
  };

  const employees = await prisma.employee.findMany({
    include: { metrics: true },
  });

  const metricMap = new Map<string, (typeof employees)[0]["metrics"][0]>();
  for (const emp of employees) {
    for (const m of emp.metrics) {
      metricMap.set(m.id, m);
    }
  }

  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  const existing = await prisma.weeklyReport.findFirst({
    where: { periodStart: pStart, periodEnd: pEnd },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Отчёт за этот период уже существует" },
      { status: 409 }
    );
  }

  const report = await prisma.weeklyReport.create({
    data: { periodStart: pStart, periodEnd: pEnd },
  });

  for (const entry of entries) {
    const metricCfg = metricMap.get(entry.metricConfigId);
    if (!metricCfg) continue;

    const result = calculateMetric({
      fact: entry.fact,
      goal: entry.goal,
      direction: metricCfg.direction as "positive" | "negative",
      weight: metricCfg.weight,
      threshold: metricCfg.threshold,
    });

    await prisma.reportEntry.create({
      data: {
        reportId: report.id,
        employeeId: entry.employeeId,
        metricConfigId: entry.metricConfigId,
        fact: result.fact,
        goal: result.goal,
        percent: result.percent,
        weightedScore: result.weightedScore,
      },
    });
  }

  const fullReport = await prisma.weeklyReport.findUnique({
    where: { id: report.id },
    include: {
      entries: {
        include: { employee: true, metricConfig: true },
      },
    },
  });

  return NextResponse.json(fullReport, { status: 201 });
}
