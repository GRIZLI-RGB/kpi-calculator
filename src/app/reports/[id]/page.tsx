"use client";

import { useEffect, useState, useCallback, use, Fragment } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/kpi";
import { formatDate } from "@/lib/dates";
import { generateWeeklyPdf } from "@/lib/pdf";
import type { WeeklyReportData, ReportEntryData } from "@/lib/types";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<WeeklyReportData | null>(null);

  const loadReport = useCallback(async () => {
    const res = await fetch(`/api/reports/${id}`);
    if (res.ok) setReport(await res.json());
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (!report) {
    return <div className="py-12 text-center text-muted-foreground">Загрузка...</div>;
  }

  // Group entries by category, then by employee
  const grouped = new Map<
    string,
    Map<string, { empName: string; entries: ReportEntryData[] }>
  >();

  for (const entry of report.entries) {
    const cat = entry.metricConfig.category;
    if (!grouped.has(cat)) grouped.set(cat, new Map());
    const catMap = grouped.get(cat)!;
    if (!catMap.has(entry.employeeId)) {
      catMap.set(entry.employeeId, {
        empName: entry.employee.name,
        entries: [],
      });
    }
    catMap.get(entry.employeeId)!.entries.push(entry);
  }

  // Total KPI per employee
  const empTotals = new Map<
    string,
    { name: string; kpi: number; budget: number | null }
  >();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Отчёт по команде</h1>
          <p className="text-muted-foreground">
            Период: {formatDate(report.periodStart)} —{" "}
            {formatDate(report.periodEnd)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports">
            <Button variant="outline">Назад к списку</Button>
          </Link>
          <Button onClick={() => generateWeeklyPdf(report)}>
            Скачать PDF
          </Button>
        </div>
      </div>

      {Array.from(grouped.entries()).map(([category, employeeMap]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABELS[category] ?? category}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Сотрудник / Метрика</TableHead>
                  <TableHead>Факт</TableHead>
                  <TableHead>Цель</TableHead>
                  <TableHead>Процент</TableHead>
                  <TableHead>Вес</TableHead>
                  <TableHead>Взвеш. балл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(employeeMap.values()).map(
                  ({ empName, entries }) => (
                    <Fragment key={empName}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={6} className="font-bold text-sm">
                          {empName}
                        </TableCell>
                      </TableRow>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="pl-6 text-sm">
                            {entry.metricConfig.name}
                          </TableCell>
                          <TableCell>{entry.fact}</TableCell>
                          <TableCell>{entry.goal}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.percent >= 100
                                  ? "default"
                                  : entry.percent >= 70
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {entry.percent.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(entry.metricConfig.weight * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell>{entry.weightedScore.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Итого KPI</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>KPI %</TableHead>
                <TableHead>KPI ₽</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(empTotals.values()).map((emp) => {
                const money =
                  emp.budget !== null
                    ? Math.round(emp.budget * (emp.kpi / 100))
                    : null;
                return (
                  <TableRow key={emp.name}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <span
                        className={`font-bold text-lg ${
                          emp.kpi >= 100
                            ? "text-green-600"
                            : emp.kpi >= 70
                            ? "text-yellow-600"
                            : "text-destructive"
                        }`}
                      >
                        {emp.kpi.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {money !== null ? (
                        <span className="font-bold text-lg">
                          {money.toLocaleString("ru-RU")} ₽
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
