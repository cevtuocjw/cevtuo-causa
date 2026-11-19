import { describe, expect, it } from "vitest";
import {
  alignmentSummary,
  alignmentVerdict,
  canAverage,
  isFullySourced,
  orderedSources,
  type AlignmentSeries,
} from "./alignment";
import { ALIGNMENT_SERIES } from "../data/alignment";

const direct: AlignmentSeries = {
  id: "direct",
  metric: "同一个指标",
  unit: "%",
  frequency: "月度",
  status: "direct",
  question: "能平均吗？",
  gap: "定义一致。",
  rule: "可以平均。",
  sources: [
    { region: "CN", name: "A", tier: "T1", value: "1", period: "2026-10", definition: "同一口径" },
    { region: "US", name: "B", tier: "T1", value: "2", period: "2026-10", definition: "同一口径" },
    { region: "EU", name: "C", tier: "T1", value: "3", period: "2026-10", definition: "同一口径" },
  ],
};

describe("口径对齐", () => {
  it("只有 direct 允许取平均", () => {
    expect(canAverage(direct)).toBe(true);
    expect(canAverage({ ...direct, status: "convert" })).toBe(false);
    expect(canAverage({ ...direct, status: "not_comparable" })).toBe(false);
  });

  it("verdict 同时给出标签、语气与是否可平均", () => {
    expect(alignmentVerdict(direct)).toEqual({
      label: "可直接比较",
      tone: "positive",
      canAverage: true,
    });
    expect(alignmentVerdict({ ...direct, status: "not_comparable" }).canAverage).toBe(false);
  });

  it("三个地区齐全才算完整来源；重复地区不算", () => {
    expect(isFullySourced(direct)).toBe(true);
    expect(
      isFullySourced({
        ...direct,
        sources: [direct.sources[0], direct.sources[1], direct.sources[1]],
      }),
    ).toBe(false);
    expect(isFullySourced({ ...direct, sources: direct.sources.slice(0, 2) })).toBe(false);
  });

  it("按 CN → US → EU 排序，缺失地区保留 null，不补 0", () => {
    const rows = orderedSources({ ...direct, sources: [direct.sources[1], direct.sources[0]] });
    expect(rows[0]?.region).toBe("CN");
    expect(rows[1]?.region).toBe("US");
    expect(rows[2]).toBeNull();
  });

  it("演示数据每组都有三个地区来源", () => {
    expect(ALIGNMENT_SERIES).toHaveLength(6);
    for (const series of ALIGNMENT_SERIES) {
      expect(isFullySourced(series), series.id).toBe(true);
      expect(series.gap.length, series.id).toBeGreaterThan(0);
      expect(series.rule.length, series.id).toBeGreaterThan(0);
    }
  });

  it("演示数据里没有一组被标成可直接平均", () => {
    const summary = alignmentSummary(ALIGNMENT_SERIES);
    expect(summary.total).toBe(6);
    expect(summary.direct).toBe(0);
    expect(summary.convert).toBe(3);
    expect(summary.notComparable).toBe(3);
  });
});
