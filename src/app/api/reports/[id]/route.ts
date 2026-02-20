import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await prisma.weeklyReport.findUnique({
    where: { id },
    include: {
      entries: {
        include: {
          employee: true,
          metricConfig: true,
        },
      },
    },
  });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(report);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const report = await prisma.weeklyReport.update({
    where: { id },
    data: {
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    },
  });

  await prisma.reportEntry.deleteMany({ where: { reportId: id } });

  for (const entry of entries) {
    const metricCfg = metricMap.get(entry.metricConfigId);
    if (!metricCfg) continue;

    const percent =
      metricCfg.direction === "negative"
        ? (() => {
            if (entry.fact === 0) return 100;
            if (entry.goal === 0) return 0;
            const factPercent = (entry.fact / entry.goal) * 100;
            const thresh = metricCfg.threshold ?? 0;
            if (factPercent <= thresh) return 100;
            if (thresh >= 100) return 0;
            return Math.max(
              0,
              100 - ((factPercent - thresh) / (100 - thresh)) * 100
            );
          })()
        : entry.goal === 0
        ? 100
        : (entry.fact / entry.goal) * 100;

    const roundedPercent = Math.round(percent * 100) / 100;
    const weightedScore =
      Math.round(roundedPercent * metricCfg.weight * 100) / 100;

    await prisma.reportEntry.create({
      data: {
        reportId: report.id,
        employeeId: entry.employeeId,
        metricConfigId: entry.metricConfigId,
        fact: entry.fact,
        goal: entry.goal,
        percent: roundedPercent,
        weightedScore,
      },
    });
  }

  const fullReport = await prisma.weeklyReport.findUnique({
    where: { id: report.id },
    include: {
      entries: {
        include: {
          employee: true,
          metricConfig: true,
        },
      },
    },
  });

  return NextResponse.json(fullReport);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.weeklyReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
