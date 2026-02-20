"use client";

import { useEffect, useState, useCallback } from "react";
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
import { formatDate, getCurrentMonth } from "@/lib/dates";
import type { WeeklyReportData } from "@/lib/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReportData[]>([]);

  const loadReports = useCallback(async () => {
    const res = await fetch("/api/reports");
    setReports(await res.json());
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function deleteReport(id: string) {
    if (!confirm("Удалить этот отчёт?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    loadReports();
  }

  function getReportKpis(report: WeeklyReportData) {
    const empMap = new Map<string, { name: string; kpi: number }>();
    for (const entry of report.entries) {
      const existing = empMap.get(entry.employeeId);
      if (existing) {
        existing.kpi += entry.weightedScore;
      } else {
        empMap.set(entry.employeeId, {
          name: entry.employee.name,
          kpi: entry.weightedScore,
        });
      }
    }
    return Array.from(empMap.values());
  }

  const currentMonth = getCurrentMonth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Отчёты</h1>
          <p className="text-muted-foreground">
            Недельные отчёты по KPI команды
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/reports/monthly/${currentMonth}`}>
            <Button variant="outline">Месячная сводка</Button>
          </Link>
          <Link href="/reports/new">
            <Button>Новый отчёт</Button>
          </Link>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Отчётов пока нет.{" "}
            <Link href="/reports/new" className="text-primary underline">
              Создать первый отчёт
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Все отчёты</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Период</TableHead>
                  <TableHead>KPI сотрудников</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const kpis = getReportKpis(report);
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {formatDate(report.periodStart)} —{" "}
                        {formatDate(report.periodEnd)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {kpis.map((k) => (
                            <span
                              key={k.name}
                              className="inline-flex items-center gap-1 text-sm"
                            >
                              <span className="text-muted-foreground">
                                {k.name}:
                              </span>
                              <span
                                className={`font-medium ${
                                  k.kpi >= 100
                                    ? "text-green-600"
                                    : k.kpi >= 70
                                    ? "text-yellow-600"
                                    : "text-destructive"
                                }`}
                              >
                                {k.kpi.toFixed(1)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(report.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/reports/${report.id}`}>
                            <Button variant="ghost" size="sm">
                              Открыть
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteReport(report.id)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
