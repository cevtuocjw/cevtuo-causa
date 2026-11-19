import { describe, expect, it } from "vitest";
import {
  alignmentSummary,
  alignmentVerdict,
  canAverage,
  isFullySourced,
  orderedSources,
  type AlignmentSeries,
} from "./alignment";
import { isPreciseKind, isSingleSource } from "./source";
import { ALIGNMENT_SERIES } from "../data/alignment";
import { SOURCE_REGISTRY, getSource } from "../data/sourceRegistry";

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
    { region: "CN", sourceId: "cn-cpi-nbs-2026-10", value: "1", period: "2026-10", definition: "同一口径" },
    { region: "US", sourceId: "us-bls-cpi-sep-2026", value: "2", period: "2026-09", definition: "同一口径" },
    { region: "EU", sourceId: "eu-eurostat-hicp-2026-10", value: "3", period: "2026-10", definition: "同一口径" },
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

  it("每条来源的 sourceId 都能在注册表中找到", () => {
    for (const series of ALIGNMENT_SERIES) {
      for (const source of series.sources) {
        expect(getSource(source.sourceId), `${series.id}/${source.sourceId}`).toBeTruthy();
      }
    }
  });

  it("注册表里的口径来源都有链接、抓取日期与来源类型", () => {
    const ids = new Set(
      ALIGNMENT_SERIES.flatMap((series) => series.sources.map((source) => source.sourceId)),
    );
    expect(ids.size).toBe(18);
    for (const id of ids) {
      const meta = getSource(id)!;
      expect(meta.url, id).toMatch(/^https?:\/\//);
      expect(meta.retrievedAt, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["release", "dataset", "document", "portal"], id).toContain(meta.kind);
    }
  });

  it("非门户口径来源必须有发布日期，且不能晚于抓取日期", () => {
    const ids = new Set(
      ALIGNMENT_SERIES.flatMap((series) => series.sources.map((source) => source.sourceId)),
    );
    for (const id of ids) {
      const meta = getSource(id)!;
      if (!isPreciseKind(meta.kind)) continue;
      expect(meta.publishedAt, `${id} 缺发布日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(meta.publishedAt! <= meta.retrievedAt, `${id} 发布晚于抓取`).toBe(true);
    }
  });

  it("18 条来源里至少 16 条是精确发布页/数据集/文件", () => {
    const sources = ALIGNMENT_SERIES.flatMap((series) => series.sources);
    const precise = sources.filter((source) => {
      const meta = getSource(source.sourceId);
      return meta ? isPreciseKind(meta.kind) : false;
    });
    expect(sources).toHaveLength(18);
    expect(precise.length).toBeGreaterThanOrEqual(16);
  });

  it("single-source 只由 T3 触发", () => {
    expect(isSingleSource("T3")).toBe(true);
    expect(isSingleSource("T2")).toBe(false);
    for (const source of SOURCE_REGISTRY) {
      if (source.tier !== "T3") {
        expect(isSingleSource(source.tier), source.id).toBe(false);
      }
    }
  });

  it("注册表 id 唯一", () => {
    const ids = SOURCE_REGISTRY.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
