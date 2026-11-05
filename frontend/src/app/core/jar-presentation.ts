import { JarType, MonthlyPlanJar } from './budget.models';

export const JAR_CLASS: Record<JarType, string> = {
  livingExpenses: 'living',
  food: 'food',
  children: 'children',
  emergencyFund: 'emergency',
  savings: 'savings',
  investment: 'investment',
  entertainmentAndTravel: 'travel'
};

const JAR_COLOR: Record<JarType, string> = {
  livingExpenses: 'var(--f1-jar-living)',
  food: 'var(--f1-jar-food)',
  children: 'var(--f1-jar-children)',
  emergencyFund: 'var(--f1-jar-emergency)',
  savings: 'var(--f1-jar-savings)',
  investment: 'var(--f1-jar-investment)',
  entertainmentAndTravel: 'var(--f1-jar-travel)'
};

export function jarClass(jarType: JarType): string {
  return JAR_CLASS[jarType];
}

export function allocationDonut(jars: readonly Pick<MonthlyPlanJar, 'jarType' | 'percentage'>[]): string {
  let cursor = 0;
  const stops = jars.map((jar) => {
    const next = cursor + jar.percentage;
    const stop = `${JAR_COLOR[jar.jarType]} ${cursor}% ${next}%`;
    cursor = next;
    return stop;
  });

  return `conic-gradient(${stops.join(',')})`;
}

export function progressWidth(percentageUsed: number): number {
  if (!Number.isFinite(percentageUsed) || percentageUsed <= 0) {
    return 0;
  }

  return Math.min(percentageUsed, 100);
}

export function isOverBudget(percentageUsed: number): boolean {
  return percentageUsed > 100;
}
