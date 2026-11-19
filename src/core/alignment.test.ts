import { describe, expect, it } from "vitest";
import {
  alignmentSummary,
  alignmentVerdict,
  canAverage,
  isFullySourced,
  orderedSources,
  preciseSourceCount,
  type AlignmentSeries,
} from "./alignment";
import { isPreciseKind, isSingleSource } from "./source";
import { ALIGNMENT_SERIES } from "../data/alignment";

const CN_SOURCE = {
  region: "CN",
  name: "A",
  tier: "T1",
  value: "1",
  period: "2026-10",
  definition: "同一口径",
  url: "https://example.com/cn",
  urlKind: "release",
  publishedAt: "2026-10-31",
  retrievedAt: "2026-11-19",
} as const;

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
    CN_SOURCE,
    { ...CN_SOURCE, region: "US", name: "B", value: "2", url: "https://example.com/us" },
    { ...CN_SOURCE, region: "EU", name: "C", value: "3", url: "https://example.com/eu" },
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

  it("每条来源都有可打开的链接、抓取日期和来源类型", () => {
    for (const series of ALIGNMENT_SERIES) {
      for (const source of series.sources) {
        const where = `${series.id}/${source.region}`;
        expect(source.url, where).toMatch(/^https?:\/\//);
        expect(source.retrievedAt, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["release", "dataset", "document", "portal"], where).toContain(
          source.urlKind,
        );
      }
    }
  });

  it("非门户来源必须有发布日期，且不能晚于抓取日期", () => {
    for (const series of ALIGNMENT_SERIES) {
      for (const source of series.sources) {
        if (!isPreciseKind(source.urlKind)) continue;
        const where = `${series.id}/${source.region}`;
        expect(source.publishedAt, `${where} 缺发布日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(source.publishedAt! <= source.retrievedAt, `${where} 发布晚于抓取`).toBe(true);
      }
    }
  });

  it("18 条来源里至少 16 条是精确发布页/数据集/文件", () => {
    const total = ALIGNMENT_SERIES.reduce((n, series) => n + series.sources.length, 0);
    const precise = ALIGNMENT_SERIES.reduce((n, series) => n + preciseSourceCount(series), 0);
    expect(total).toBe(18);
    expect(precise).toBeGreaterThanOrEqual(16);
  });

  it("single-source 只由 T3 触发", () => {
    expect(isSingleSource("T3")).toBe(true);
    expect(isSingleSource("T2")).toBe(false);
    for (const series of ALIGNMENT_SERIES) {
      for (const source of series.sources) {
        if (source.tier !== "T3") continue;
        expect(isSingleSource(source.tier), `${series.id}/${source.region}`).toBe(true);
      }
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
