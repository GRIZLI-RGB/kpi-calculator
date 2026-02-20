-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "kpiBudget" REAL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MetricConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "threshold" REAL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MetricConfig_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReportEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "metricConfigId" TEXT NOT NULL,
    "fact" REAL NOT NULL,
    "goal" REAL NOT NULL,
    "percent" REAL NOT NULL,
    "weightedScore" REAL NOT NULL,
    CONSTRAINT "ReportEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportEntry_metricConfigId_fkey" FOREIGN KEY ("metricConfigId") REFERENCES "MetricConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MetricConfig_employeeId_name_key" ON "MetricConfig"("employeeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_periodStart_periodEnd_key" ON "WeeklyReport"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ReportEntry_reportId_employeeId_metricConfigId_key" ON "ReportEntry"("reportId", "employeeId", "metricConfigId");
