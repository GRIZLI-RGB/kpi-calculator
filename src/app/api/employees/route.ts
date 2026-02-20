import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: { metrics: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const body = await request.json();
  const employee = await prisma.employee.create({
    data: {
      name: body.name,
      role: body.role,
      kpiBudget: body.kpiBudget ?? null,
      order: body.order ?? 0,
    },
    include: { metrics: true },
  });
  return NextResponse.json(employee, { status: 201 });
}
