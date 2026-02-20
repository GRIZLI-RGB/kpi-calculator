import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

const DEVELOPERS = [
  { name: "Сергей", role: "developer", order: 1 },
  { name: "Кирилл", role: "developer", order: 2 },
  { name: "Арсений", role: "developer", order: 3 },
];

const TEAMLEAD = { name: "Евгений", role: "teamlead", order: 0 };

const DEV_METRICS = [
  {
    name: "Завершённые задачи",
    category: "speed",
    direction: "positive",
    weight: 0.5,
    threshold: null,
    order: 0,
  },
  {
    name: "Возвращённые задачи",
    category: "quality",
    direction: "negative",
    weight: 0.2,
    threshold: 10,
    order: 1,
  },
  {
    name: "Критичные баги",
    category: "quality",
    direction: "negative",
    weight: 0.2,
    threshold: 5,
    order: 2,
  },
  {
    name: "Минорные баги",
    category: "quality",
    direction: "negative",
    weight: 0.1,
    threshold: 15,
    order: 3,
  },
];

const TL_METRICS = [
  {
    name: "Проведённые ревью",
    category: "management",
    direction: "positive",
    weight: 0.35,
    threshold: null,
    order: 0,
  },
  {
    name: "Завершённые задачи",
    category: "management",
    direction: "positive",
    weight: 0.35,
    threshold: null,
    order: 1,
  },
  {
    name: "Критичные баги в продакшене",
    category: "management",
    direction: "negative",
    weight: 0.3,
    threshold: 5,
    order: 2,
  },
];

async function main() {
  await prisma.reportEntry.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.metricConfig.deleteMany();
  await prisma.employee.deleteMany();

  const tl = await prisma.employee.create({ data: TEAMLEAD });
  for (const m of TL_METRICS) {
    await prisma.metricConfig.create({
      data: { ...m, employeeId: tl.id },
    });
  }

  for (const dev of DEVELOPERS) {
    const emp = await prisma.employee.create({ data: dev });
    for (const m of DEV_METRICS) {
      await prisma.metricConfig.create({
        data: { ...m, employeeId: emp.id },
      });
    }
  }

  console.log("Seed complete: 4 employees with metrics created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
