"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  DIRECTION_LABELS,
  ROLE_LABELS,
} from "@/lib/kpi";
import type { EmployeeData, MetricConfigData } from "@/lib/types";

export default function TeamPage() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState("");
  const [editMetrics, setEditMetrics] = useState<MetricConfigData[]>([]);

  const loadEmployees = useCallback(async () => {
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(data);
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  function startEdit(emp: EmployeeData) {
    setEditingId(emp.id);
    setEditBudget(emp.kpiBudget?.toString() ?? "");
    setEditMetrics(emp.metrics.map((m) => ({ ...m })));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditMetrics([]);
  }

  function updateMetricField(
    idx: number,
    field: keyof MetricConfigData,
    value: string | number | null
  ) {
    setEditMetrics((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function saveEdit(empId: string) {
    await fetch(`/api/employees/${empId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kpiBudget: editBudget ? parseFloat(editBudget) : null,
      }),
    });

    await fetch(`/api/employees/${empId}/metrics`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics: editMetrics }),
    });

    setEditingId(null);
    loadEmployees();
  }

  const totalWeight = editMetrics.reduce((s, m) => s + m.weight, 0);
  const weightValid = Math.abs(totalWeight - 1) < 0.001;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Команда</h1>
        <p className="text-muted-foreground">
          Настройка сотрудников, метрик, весов и KPI-бюджетов
        </p>
      </div>

      <div className="grid gap-6">
        {employees.map((emp) => (
          <Card key={emp.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{emp.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      {ROLE_LABELS[emp.role] ?? emp.role}
                    </Badge>
                    {emp.kpiBudget !== null && (
                      <span>
                        KPI-бюджет:{" "}
                        {emp.kpiBudget.toLocaleString("ru-RU")} ₽
                      </span>
                    )}
                  </CardDescription>
                </div>
                {editingId !== emp.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(emp)}
                  >
                    Редактировать
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingId === emp.id ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-64">
                      <Label>KPI-бюджет (₽)</Label>
                      <Input
                        type="number"
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        placeholder="Не задан"
                      />
                    </div>
                  </div>
                  <Separator />
                  <h4 className="font-medium">Метрики</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Метрика</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Направление</TableHead>
                        <TableHead className="w-24">Вес</TableHead>
                        <TableHead className="w-24">Порог (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editMetrics.map((m, idx) => (
                        <TableRow key={m.id || idx}>
                          <TableCell className="font-medium">
                            {m.name}
                          </TableCell>
                          <TableCell>
                            {CATEGORY_LABELS[m.category] ?? m.category}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                m.direction === "positive"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {DIRECTION_LABELS[m.direction] ?? m.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.05"
                              min="0"
                              max="1"
                              value={m.weight}
                              onChange={(e) =>
                                updateMetricField(
                                  idx,
                                  "weight",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {m.direction === "negative" ? (
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={m.threshold ?? ""}
                                onChange={(e) =>
                                  updateMetricField(
                                    idx,
                                    "threshold",
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null
                                  )
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm ${
                        weightValid
                          ? "text-green-600"
                          : "text-destructive font-medium"
                      }`}
                    >
                      Сумма весов: {(totalWeight * 100).toFixed(0)}%
                      {!weightValid && " (должна быть 100%)"}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={cancelEdit}>
                        Отмена
                      </Button>
                      <Button
                        onClick={() => saveEdit(emp.id)}
                        disabled={!weightValid}
                      >
                        Сохранить
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Метрика</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Направление</TableHead>
                      <TableHead>Вес</TableHead>
                      <TableHead>Порог</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emp.metrics.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.name}
                        </TableCell>
                        <TableCell>
                          {CATEGORY_LABELS[m.category] ?? m.category}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.direction === "positive"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {DIRECTION_LABELS[m.direction] ?? m.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(m.weight * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell>
                          {m.threshold !== null ? `${m.threshold}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
