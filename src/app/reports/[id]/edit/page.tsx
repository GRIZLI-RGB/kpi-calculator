"use client";

import { useEffect, useState, useCallback, useMemo, Fragment, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORY_LABELS,
  calculateMetricPercent,
  calculateMoneyKpi,
} from "@/lib/kpi";
import type {
  EmployeeData,
  MetricConfigData,
  WeeklyReportData,
  ReportEntryData,
} from "@/lib/types";
import { formatDate } from "@/lib/dates";

interface EntryState {
  employeeId: string;
  metricConfigId: string;
  fact: string;
  goal: string;
}

type EmployeeWithMetrics = EmployeeData & { metrics: MetricConfigData[] };

export default function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithMetrics[]>([]);
  const [entries, setEntries] = useState<Map<string, EntryState>>(new Map());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const buildStateFromReport = useCallback((data: WeeklyReportData) => {
    const empMap = new Map<string, EmployeeWithMetrics>();

    for (const entry of data.entries) {
      const baseEmp = entry.employee as EmployeeData;
      let emp = empMap.get(entry.employeeId);
      if (!emp) {
        emp = { ...baseEmp, metrics: [] };
        empMap.set(entry.employeeId, emp);
      }
      const exists = emp.metrics.find((m) => m.id === entry.metricConfigId);
      if (!exists) {
        emp.metrics.push(entry.metricConfig as MetricConfigData);
      }
    }

    setEmployees(Array.from(empMap.values()));

    const initialEntries = new Map<string, EntryState>();
    for (const e of data.entries as ReportEntryData[]) {
      const key = `${e.employeeId}_${e.metricConfigId}`;
      initialEntries.set(key, {
        employeeId: e.employeeId,
        metricConfigId: e.metricConfigId,
        fact: e.fact.toString(),
        goal: e.goal.toString(),
      });
    }
    setEntries(initialEntries);

    setPeriodStart(data.periodStart.slice(0, 10));
    setPeriodEnd(data.periodEnd.slice(0, 10));
  }, []);

  const loadReport = useCallback(async () => {
    const res = await fetch(`/api/reports/${id}`);
    if (!res.ok) return;
    const data: WeeklyReportData = await res.json();
    setReport(data);
    buildStateFromReport(data);
  }, [id, buildStateFromReport]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Find the "Завершённые задачи" metric for a given employee
  function getCompletedTasksMetric(
    empId: string
  ): MetricConfigData | undefined {
    const emp = employees.find((e) => e.id === empId);
    return emp?.metrics.find(
      (m) => m.name === "Завершённые задачи" && m.direction === "positive"
    );
  }

  function updateEntry(key: string, field: "fact" | "goal", value: string) {
    setEntries((prev) => {
      const next = new Map(prev);
      const entry = next.get(key)!;
      next.set(key, { ...entry, [field]: value });

      // Auto-fill: when "Завершённые задачи" fact changes,
      // propagate as "goal" to all negative metrics of the same employee
      if (field === "fact") {
        const emp = employees.find((e) => e.id === entry.employeeId);
        const metric = emp?.metrics.find((m) => m.id === entry.metricConfigId);
        if (
          metric?.name === "Завершённые задачи" &&
          metric.direction === "positive"
        ) {
          const negativeMetrics = emp!.metrics.filter(
            (m) => m.direction === "negative"
          );
          for (const nm of negativeMetrics) {
            const nKey = `${entry.employeeId}_${nm.id}`;
            const nEntry = next.get(nKey);
            if (nEntry) {
              next.set(nKey, { ...nEntry, goal: value });
            }
          }
        }
      }

      return next;
    });
  }

  function getPercent(metric: MetricConfigData, key: string): number | null {
    const entry = entries.get(key);
    if (!entry) return null;
    const fact = parseFloat(entry.fact);
    const goal = parseFloat(entry.goal);
    if (isNaN(fact) || isNaN(goal)) return null;
    // Allow 0/0 — the calculation handles it correctly
    if (fact === 0 && goal === 0 && entry.fact === "" && entry.goal === "") {
      return null;
    }
    return calculateMetricPercent({
      fact,
      goal,
      direction: metric.direction as "positive" | "negative",
      weight: metric.weight,
      threshold: metric.threshold,
    });
  }

  const employeeKpis = useMemo(() => {
    const result: Record<string, number> = {};
    for (const emp of employees) {
      let totalKpi = 0;
      let hasData = false;
      for (const m of emp.metrics) {
        const key = `${emp.id}_${m.id}`;
        const pct = getPercent(m, key);
        if (pct !== null) {
          totalKpi += pct * m.weight;
          hasData = true;
        }
      }
      result[emp.id] = hasData ? Math.round(totalKpi * 100) / 100 : 0;
    }
    return result;
  }, [employees, entries]);

  async function handleSave() {
    setSaving(true);
    try {
      const entryList = Array.from(entries.values())
        .filter((e) => e.fact !== "" && e.goal !== "")
        .map((e) => ({
          employeeId: e.employeeId,
          metricConfigId: e.metricConfigId,
          fact: parseFloat(e.fact),
          goal: parseFloat(e.goal),
        }));

      const res = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          entries: entryList,
        }),
      });

      if (res.ok) {
        const updated: WeeklyReportData = await res.json();
        router.push(`/reports/${updated.id}`);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Ошибка при сохранении отчёта");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!report) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Загрузка отчёта...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Редактирование отчёта</h1>
          <p className="text-muted-foreground">
            Период: {formatDate(report.periodStart)} —{" "}
            {formatDate(report.periodEnd)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/reports/${report.id}`)}
        >
          Отменить
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Период</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Начало</label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Конец</label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          {periodStart && periodEnd && (
            <span className="text-sm text-muted-foreground self-end pb-2">
              {formatDate(periodStart)} — {formatDate(periodEnd)}
            </span>
          )}
        </CardContent>
      </Card>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            В этом отчёте нет записей.
          </CardContent>
        </Card>
      ) : (
        Array.from(
          new Map(
            employees.flatMap((emp) =>
              emp.metrics.map((m) => [m.category, null] as const)
            )
          ).keys()
        ).map((category) => {
          const categoryEmployees = employees
            .map((emp) => ({
              emp,
              metrics: emp.metrics.filter((m) => m.category === category),
            }))
            .filter((x) => x.metrics.length > 0);

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{CATEGORY_LABELS[category] ?? category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">
                        Сотрудник / Метрика
                      </TableHead>
                      <TableHead className="w-28">Факт</TableHead>
                      <TableHead className="w-28">Цель</TableHead>
                      <TableHead className="w-28">Процент</TableHead>
                      <TableHead className="w-20">Вес</TableHead>
                      <TableHead className="w-28">Взвеш. балл</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryEmployees.map(({ emp, metrics }) => (
                      <Fragment key={emp.id}>
                        <TableRow className="bg-muted/50">
                          <TableCell
                            colSpan={6}
                            className="font-bold text-sm"
                          >
                            {emp.name}
                          </TableCell>
                        </TableRow>
                        {metrics.map((m) => {
                          const key = `${emp.id}_${m.id}`;
                          const entry = entries.get(key);
                          const pct = getPercent(m, key);
                          const isNegative = m.direction === "negative";
                          const hasAutoGoal =
                            isNegative && !!getCompletedTasksMetric(emp.id);

                          return (
                            <TableRow key={key}>
                              <TableCell className="pl-6 text-sm">
                                {m.name}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={entry?.fact ?? ""}
                                  onChange={(e) =>
                                    updateEntry(key, "fact", e.target.value)
                                  }
                                  placeholder="0"
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                {hasAutoGoal ? (
                                  <div
                                    className="h-8 flex items-center px-3 rounded-md bg-muted text-sm text-muted-foreground"
                                    title={`Порог из настроек: до ${
                                      m.threshold ?? 0
                                    }%. База: ${
                                      entry?.goal || "—"
                                    } (из «Завершённые задачи»)`}
                                  >
                                    до {m.threshold ?? 0}%
                                  </div>
                                ) : (
                                  <Input
                                    type="number"
                                    min="0"
                                    value={entry?.goal ?? ""}
                                    onChange={(e) =>
                                      updateEntry(key, "goal", e.target.value)
                                    }
                                    placeholder="0"
                                    className="h-8"
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {pct !== null ? (
                                  <span
                                    className={
                                      pct >= 100
                                        ? "text-green-600 font-medium"
                                        : pct >= 70
                                        ? "text-yellow-600"
                                        : "text-destructive"
                                    }
                                  >
                                    {pct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {(m.weight * 100).toFixed(0)}%
                              </TableCell>
                              <TableCell>
                                {pct !== null ? (
                                  <span>{(pct * m.weight).toFixed(1)}</span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

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
              {employees.map((emp) => {
                const kpi = employeeKpis[emp.id] ?? 0;
                const money = calculateMoneyKpi(kpi, emp.kpiBudget);
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <span
                        className={`font-bold ${
                          kpi >= 100
                            ? "text-green-600"
                            : kpi >= 70
                            ? "text-yellow-600"
                            : "text-destructive"
                        }`}
                      >
                        {kpi.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {money !== null ? (
                        <span className="font-medium">
                          {money.toLocaleString("ru-RU")} ₽
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Бюджет не задан
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/reports/${report.id}`)}
          disabled={saving}
        >
          Отмена
        </Button>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </div>
    </div>
  );
}

