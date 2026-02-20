"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/kpi";
import { getCurrentMonth, formatMonth } from "@/lib/dates";
import type { MonthlyResponse } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<MonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const currentMonth = getCurrentMonth();

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/monthly?month=${currentMonth}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <p className="text-muted-foreground">{formatMonth(currentMonth)}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports/new">
            <Button>Новый отчёт</Button>
          </Link>
          <Link href={`/reports/monthly/${currentMonth}`}>
            <Button variant="outline">Месячная сводка</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Загрузка...</div>
      ) : !data || data.reportsCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              За {formatMonth(currentMonth)} пока нет отчётов.
            </p>
            <Link href="/reports/new">
              <Button>Создать первый отчёт</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground">
                  Отчётов за месяц
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.reportsCount}</div>
                <p className="text-sm text-muted-foreground">
                  недельных отчётов
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground">
                  Средний KPI команды
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const avg =
                    data.summary.reduce((s, e) => s + e.monthlyKpi, 0) /
                    data.summary.length;
                  return (
                    <>
                      <div
                        className={`text-3xl font-bold ${
                          avg >= 100
                            ? "text-green-600"
                            : avg >= 70
                            ? "text-yellow-600"
                            : "text-destructive"
                        }`}
                      >
                        {avg.toFixed(1)}%
                      </div>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            avg >= 100
                              ? "bg-green-500"
                              : avg >= 70
                              ? "bg-yellow-500"
                              : "bg-destructive"
                          }`}
                          style={{ width: `${Math.min(avg, 100)}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {data.summary.map((s) => (
              <Card key={s.employee.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {s.employee.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {ROLE_LABELS[s.employee.role] ?? s.employee.role}
                    </Badge>
                  </div>
                  <CardDescription>
                    {s.weeksCount} нед. учтено
                  </CardDescription>
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
                        width: `${Math.min(s.monthlyKpi, 100)}%`,
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
