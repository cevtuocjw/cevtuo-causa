import { describe, expect, it } from "vitest";
import { migrateV1 } from "./migrate";

const v1 = {
  chains: [
    {
      id: "cny-export-hiring",
      title: "人民币走弱",
      event: "离岸人民币跌破 7.35",
      mechanism: ["出口利润回升", "扩产滞后"],
      variable: "招聘岗位",
      projection: "你的行业收入",
      counterfactual: "如果 PMI 跌破 50，则不成立",
      summary: "摘要",
      confidence: 0.62,
      opened: "2026-08-14",
      due: "2026-11-21",
      status: "due",
      signposts: [
        {
          id: "pmi",
          label: "PMI",
          value: "50.8",
          target: "≥ 50",
          state: "on-track",
          source: "国家统计局",
          at: "2026-10-31",
        },
      ],
      sources: [{ name: "国家统计局", state: "ok", at: "2026-11-17 09:12" }],
      impacts: [2, 2, -1, 0],
    },
  ],
  records: [
    { confidence: 0.82, outcome: "hit" },
    { confidence: 0.35, outcome: "insufficient" },
  ],
  activeId: "cny-export-hiring",
  household: {
    income: 30000,
    fixed: 8000,
    mortgage: 11000,
    liquid: 90000,
    debt: 1200000,
    dependents: 1,
  },
};

describe("migrateV1", () => {
  const now = new Date(2026, 11, 1, 12, 0, 0);
  const { state, warnings } = migrateV1(v1, now);

  it("升级到 schemaVersion 2", () => {
    expect(state.schemaVersion).toBe(2);
    expect(state.chains).toHaveLength(1);
    expect(state.records).toHaveLength(2);
    expect(state.activeId).toBe("cny-export-hiring");
  });

  it("演示链的日期按相对天数平移到当前", () => {
    expect(state.chains[0].dueAt).toBe("2026-12-04");
    expect(state.chains[0].openedAt < state.chains[0].dueAt).toBe(true);
  });

  it("演示链与记录标为 seed，不进入默认校准", () => {
    expect(state.chains[0].origin).toBe("seed");
    expect(state.records.every((r) => r.origin === "seed")).toBe(true);
    expect(state.records.every((r) => r.chainId === "")).toBe(true);
    expect(state.settings.showSeedInStats).toBe(false);
  });

  it("保留家庭数字", () => {
    expect(state.household).toEqual(v1.household);
  });

  it("指标带 history 快照", () => {
    expect(state.chains[0].signposts[0].history).toHaveLength(1);
    expect(state.chains[0].signposts[0].history?.[0].value).toBe("50.8");
  });

  it("v2 再次迁移是幂等的", () => {
    const again = migrateV1(state, now);
    expect(again.state).toEqual(state);
    expect(again.warnings).toEqual([]);
  });

  it("无法识别的 payload 必须抛错，不能静默重置", () => {
    expect(() => migrateV1({ hello: "world" }, now)).toThrow(/chains/);
    expect(() => migrateV1(null, now)).toThrow(/对象/);
  });

  it("缺指标/来源时给出警告而不是丢掉链条", () => {
    const result = migrateV1(
      {
        chains: [{ ...v1.chains[0], signposts: [], sources: [] }],
        records: [],
        household: v1.household,
      },
      now,
    );
    expect(result.state.chains).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
