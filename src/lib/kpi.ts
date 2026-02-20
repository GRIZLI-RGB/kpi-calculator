export interface MetricInput {
  fact: number;
  goal: number;
  direction: "positive" | "negative";
  weight: number;
  threshold: number | null;
}

export interface MetricResult {
  fact: number;
  goal: number;
  percent: number;
  weightedScore: number;
}

export function calculateMetricPercent(input: MetricInput): number {
  const { fact, goal, direction, threshold } = input;

  if (direction === "negative") {
    // fact=0 means zero defects — always perfect regardless of goal
    if (fact === 0) return 100;
    // If goal=0 but fact>0, there were defects with no baseline — treat as 0%
    if (goal === 0) return 0;

    const factPercent = (fact / goal) * 100;
    const thresh = threshold ?? 0;

    if (factPercent <= thresh) return 100;
    if (thresh >= 100) return 0;

    return Math.max(0, 100 - ((factPercent - thresh) / (100 - thresh)) * 100);
  }

  // Positive metric: no goal set — treat as 100% (nothing expected or overperformance)
  if (goal === 0) {
    return 100;
  }

  return (fact / goal) * 100;
}

export function calculateMetric(input: MetricInput): MetricResult {
  const percent = calculateMetricPercent(input);
  const weightedScore = percent * input.weight;
  return {
    fact: input.fact,
    goal: input.goal,
    percent: Math.round(percent * 100) / 100,
    weightedScore: Math.round(weightedScore * 100) / 100,
  };
}

export function calculateTotalKpi(
  metrics: { percent: number; weight: number }[]
): number {
  const total = metrics.reduce((sum, m) => sum + m.percent * m.weight, 0);
  return Math.round(total * 100) / 100;
}

export function calculateMoneyKpi(
  kpiPercent: number,
  budget: number | null
): number | null {
  if (budget === null || budget === undefined) return null;
  return Math.round(budget * (kpiPercent / 100));
}

export const CATEGORY_LABELS: Record<string, string> = {
  speed: "Скорость разработки",
  quality: "Качество разработки",
  management: "Управление командой",
};

export const DIRECTION_LABELS: Record<string, string> = {
  positive: "Больше — лучше",
  negative: "Меньше — лучше",
};

export const ROLE_LABELS: Record<string, string> = {
  developer: "Разработчик",
  teamlead: "Тимлид",
};
