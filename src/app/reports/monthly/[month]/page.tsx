"use client";

import { useEffect, useState, useCallback, use } from "react";
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
import { formatDate, formatMonth } from "@/lib/dates";
import { generateMonthlyPdf } from "@/lib/pdf";
import type { MonthlyResponse } from "@/lib/types";

export default function MonthlyReportPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = use(params);
  const [data, setData] = useState<MonthlyResponse | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/reports/monthly?month=${month}`);
    if (res.ok) setData(await res.json());
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!data) {
    return <div className="py-12 text-center text-muted-foreground">Загрузка...</div>;
  }

  // Navigate months
  const [year, m] = month.split("-").map(Number);
  const prevMonth = m === 1
    ? `${year - 1}-12`
    : `${year}-${String(m - 1).padStart(2, "0")}`;
  const nextMonth = m === 12
    ? `${year + 1}-01`
    : `${year}-${String(m + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Месячная сводка</h1>
          <div className="flex items-center gap-4 mt-1">
            <Link href={`/reports/monthly/${prevMonth}`}>
              <Button variant="ghost" size="sm">
                &larr;
              </Button>
            </Link>
            <span className="text-lg font-medium">{formatMonth(month)}</span>
            <Link href={`/reports/monthly/${nextMonth}`}>
              <Button variant="ghost" size="sm">
                &rarr;
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground mt-1">
            Отчётов за месяц: {data.reportsCount}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports">
            <Button variant="outline">К отчётам</Button>
          </Link>
          {data.reportsCount > 0 && (
            <Button onClick={() => generateMonthlyPdf(data)}>
              Скачать PDF
            </Button>
          )}
        </div>
      </div>

      {data.reportsCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            За {formatMonth(month)} нет недельных отчётов.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>KPI по неделям</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    {data.summary[0]?.weeklyKpis.map((w) => (
                      <TableHead key={w.reportId} className="text-center">
                        {formatDate(w.periodStart)} —<br />
                        {formatDate(w.periodEnd)}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold">
                      Среднее
                    </TableHead>
                    <TableHead className="text-center font-bold">₽</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.summary.map((s) => (
                    <TableRow key={s.employee.id}>
                      <TableCell className="font-medium">
                        {s.employee.name}
                      </TableCell>
                      {s.weeklyKpis.map((w) => (
                        <TableCell key={w.reportId} className="text-center">
                          <span
                            className={
                              w.kpi >= 100
                                ? "text-green-600"
                                : w.kpi >= 70
                                ? "text-yellow-600"
                                : "text-destructive"
                            }
                          >
                            {w.kpi.toFixed(1)}%
                          </span>
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <span
                          className={`font-bold text-lg ${
                            s.monthlyKpi >= 100
                              ? "text-green-600"
                              : s.monthlyKpi >= 70
                              ? "text-yellow-600"
                              : "text-destructive"
                          }`}
                        >
                          {s.monthlyKpi.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {s.moneyKpi !== null ? (
                          <span className="font-bold">
                            {s.moneyKpi.toLocaleString("ru-RU")} ₽
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data.summary.map((s) => (
              <Card key={s.employee.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.employee.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl font-bold ${
                      s.monthlyKpi >= 100
                        ? "text-green-600"
                        : s.monthlyKpi >= 70
                        ? "text-yellow-600"
                        : "text-destructive"
                    }`}
                  >
                    {s.monthlyKpi.toFixed(1)}%
                  </div>
                  {s.moneyKpi !== null && (
                    <div className="text-lg font-medium mt-1">
                      {s.moneyKpi.toLocaleString("ru-RU")} ₽
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.weeksCount} нед. из отчётов
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.monthlyKpi >= 100
                          ? "bg-green-500"
                          : s.monthlyKpi >= 70
                          ? "bg-yellow-500"
                          : "bg-destructive"
                      }`}
                      style={{
                        width: `${Math.min(s.monthlyKpi, 150)}%`,
                        maxWidth: "100%",
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
