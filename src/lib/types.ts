export interface MetricConfigData {
  id: string;
  employeeId: string;
  name: string;
  category: string;
  direction: string;
  weight: number;
  threshold: number | null;
  order: number;
}

export interface EmployeeData {
  id: string;
  name: string;
  role: string;
  kpiBudget: number | null;
  order: number;
  createdAt: string;
  metrics: MetricConfigData[];
}

export interface ReportEntryData {
  id: string;
  reportId: string;
  employeeId: string;
  metricConfigId: string;
  fact: number;
  goal: number;
  percent: number;
  weightedScore: number;
  employee: EmployeeData;
  metricConfig: MetricConfigData;
}

export interface WeeklyReportData {
  id: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  entries: ReportEntryData[];
}

export interface MonthlySummaryEmployee {
  employee: EmployeeData;
  weeklyKpis: {
    reportId: string;
    periodStart: string;
    periodEnd: string;
    kpi: number;
  }[];
  monthlyKpi: number;
  moneyKpi: number | null;
  weeksCount: number;
}

export interface MonthlyResponse {
  month: string;
  reportsCount: number;
  summary: MonthlySummaryEmployee[];
}
