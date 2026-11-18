import { describe, expect, it } from "vitest";
import { householdMetrics, projectExposure } from "./exposure";
import { makeChain } from "./fixtures";
import { DEFAULT_HOUSEHOLD } from "./types";

const base = { ...DEFAULT_HOUSEHOLD };

describe("householdMetrics", () => {
  it("月缓冲、月供收入比、缓冲月数、负债收入比", () => {
    const m = householdMetrics(base);
    expect(m.buffer).toBe(7400);
    expect(m.housingRatio).toBeCloseTo(0.4, 4);
    expect(m.bufferMonths).toBeCloseTo(86000 / 20600, 4);
    expect(m.debtToIncome).toBeCloseTo(1260000 / (28000 * 12), 4);
  });
});

describe("projectExposure", () => {
  it("没有暴露时返回 null", () => {
    expect(projectExposure(makeChain(), base)).toBeNull();
  });

  it("收入 +5%：月缓冲增加，缓冲月数不变", () => {
    const chain = makeChain({ exposure: { target: "income", deltaPct: 5 } });
    const p = projectExposure(chain, base)!;
    expect(p.deltaValue).toBeCloseTo(1400, 6);
    expect(p.after.buffer).toBeCloseTo(8800, 6);
    expect(p.after.bufferMonths).toBeCloseTo(p.before.bufferMonths, 6);
  });

  it("房贷 +10%：月缓冲下降，缓冲月数下降", () => {
    const chain = makeChain({ exposure: { target: "mortgage", deltaPct: 10 } });
    const p = projectExposure(chain, base)!;
    expect(p.deltaValue).toBeCloseTo(1120, 6);
    expect(p.after.buffer).toBeCloseTo(6280, 6);
    expect(p.after.bufferMonths).toBeLessThan(p.before.bufferMonths);
  });

  it("现金 −20%：缓冲月数下降，月缓冲不变", () => {
    const chain = makeChain({ exposure: { target: "liquid", deltaPct: -20 } });
    const p = projectExposure(chain, base)!;
    expect(p.after.buffer).toBeCloseTo(p.before.buffer, 6);
    expect(p.after.bufferMonths).toBeLessThan(p.before.bufferMonths);
  });

  it("负债 +10%：负债收入比上升，月缓冲不变", () => {
    const chain = makeChain({ exposure: { target: "debt", deltaPct: 10 } });
    const p = projectExposure(chain, base)!;
    expect(p.after.debtToIncome).toBeGreaterThan(p.before.debtToIncome);
    expect(p.after.buffer).toBeCloseTo(p.before.buffer, 6);
  });

  it("目标为 0 时不产生负数或 NaN", () => {
    const zero = { ...base, income: 0 };
    const p = projectExposure(
      makeChain({ exposure: { target: "income", deltaPct: 10 } }),
      zero,
    )!;
    expect(p.deltaValue).toBe(0);
    expect(Number.isFinite(p.after.buffer)).toBe(true);
  });
});
