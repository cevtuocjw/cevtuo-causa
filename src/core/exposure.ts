import type { Chain, Household } from "./types";

export interface HouseholdMetrics {
  /** 月收入 − 固定支出 − 房贷 */
  buffer: number;
  /** 房贷 ÷ 月收入（月供收入比） */
  housingRatio: number;
  /** 流动现金 ÷（固定支出 + 房贷） */
  bufferMonths: number;
  /** 总负债 ÷ 年收入 */
  debtToIncome: number;
}

export interface ExposureProjection {
  chainId: string;
  target: NonNullable<Chain["exposure"]>["target"];
  deltaPct: number;
  /** 目标变量本身的变化量（元） */
  deltaValue: number;
  before: HouseholdMetrics;
  after: HouseholdMetrics;
}

export function householdMetrics(h: Household): HouseholdMetrics {
  const buffer = h.income - h.fixed - h.mortgage;
  const outflow = h.fixed + h.mortgage;
  return {
    buffer,
    housingRatio: h.income > 0 ? h.mortgage / h.income : 0,
    bufferMonths: outflow > 0 ? h.liquid / outflow : 0,
    debtToIncome: h.income > 0 ? h.debt / (h.income * 12) : 0,
  };
}

/**
 * 把“若这条链成立”换算成家庭指标变化。
 * 只做单变量平移，不做多链叠加；没有 exposure 时不编造数字。
 */
export function projectExposure(
  chain: Chain,
  household: Household,
): ExposureProjection | null {
  if (!chain.exposure) return null;
  const { target, deltaPct } = chain.exposure;
  const p = deltaPct / 100;
  const next: Household = { ...household };
  const base = household[target];

  next[target] = Math.max(0, base * (1 + p));

  return {
    chainId: chain.id,
    target,
    deltaPct,
    deltaValue: next[target] - base,
    before: householdMetrics(household),
    after: householdMetrics(next),
  };
}
