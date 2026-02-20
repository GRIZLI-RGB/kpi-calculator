import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const metrics = await prisma.metricConfig.findMany({
    where: { employeeId: id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(metrics);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const metrics: Array<{
    id?: string;
    name: string;
    category: string;
    direction: string;
    weight: number;
    threshold: number | null;
    order: number;
  }> = body.metrics;

  const existing = await prisma.metricConfig.findMany({
    where: { employeeId: id },
  });
  const existingIds = new Set(existing.map((m) => m.id));
  const incomingIds = new Set(metrics.filter((m) => m.id).map((m) => m.id!));

  // Delete only metrics that were removed (not in the incoming list)
  // but only if they have no report entries referencing them
  for (const ex of existing) {
    if (!incomingIds.has(ex.id)) {
      const entryCount = await prisma.reportEntry.count({
        where: { metricConfigId: ex.id },
      });
      if (entryCount === 0) {
        await prisma.metricConfig.delete({ where: { id: ex.id } });
      }
    }
  }

  const result = [];
  for (const m of metrics) {
    if (m.id && existingIds.has(m.id)) {
      const updated = await prisma.metricConfig.update({
        where: { id: m.id },
        data: {
          name: m.name,
          category: m.category,
          direction: m.direction,
          weight: m.weight,
          threshold: m.threshold,
          order: m.order,
        },
      });
      result.push(updated);
    } else {
      const created = await prisma.metricConfig.create({
        data: {
          employeeId: id,
          name: m.name,
          category: m.category,
          direction: m.direction,
          weight: m.weight,
          threshold: m.threshold,
          order: m.order,
        },
      });
      result.push(created);
    }
  }

  return NextResponse.json(result);
}
