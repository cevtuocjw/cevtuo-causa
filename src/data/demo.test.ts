import { describe, expect, it } from "vitest";
import { demoState } from "./demo";
import { eligibleRecords, recordsForTag } from "../core/stats";

const now = new Date("2026-11-19T10:00:00");

describe("演示账本的类别数据", () => {
  const state = demoState(now);

  it("每条演示链都有宏观 / 政策 / 行业 / 个人中的至少一个标签", () => {
    const allowed = new Set(["宏观", "政策", "行业", "个人"]);
    expect(state.chains).toHaveLength(7);
    for (const chain of state.chains) {
      expect(chain.tags.some((tag) => allowed.has(tag))).toBe(true);
    }
  });

  it("演示记录都挂到了存在的链条上，类别筛选有样本", () => {
    const ids = new Set(state.chains.map((chain) => chain.id));
    expect(state.records.every((record) => ids.has(record.chainId))).toBe(true);

    const rows = eligibleRecords(state.records, { includeSeed: true });
    for (const tag of ["宏观", "政策", "行业", "个人"]) {
      expect(recordsForTag(rows, state.chains, tag).length).toBeGreaterThan(0);
    }
  });

  it("演示记录仍然是 seed，默认不会混进个人校准", () => {
    expect(
      eligibleRecords(state.records, { includeSeed: false }),
    ).toHaveLength(0);
  });
});
