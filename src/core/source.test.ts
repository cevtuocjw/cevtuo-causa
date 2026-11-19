import { describe, expect, it } from "vitest";
import { SOURCE_META, initialChains } from "../data/chains";
import { isPreciseKind, SOURCE_KIND_LABEL } from "./source";

describe("链证据来源", () => {
  it("每条链里出现的来源名都在 SOURCE_META 中登记", () => {
    for (const chain of initialChains) {
      for (const source of chain.sources) {
        expect(SOURCE_META[source.name], `${chain.id}/${source.name}`).toBeTruthy();
      }
    }
  });

  it("18 个来源都有类型、抓取日期和一句边界说明", () => {
    const entries = Object.entries(SOURCE_META);
    expect(entries).toHaveLength(18);
    for (const [name, meta] of entries) {
      expect(Object.keys(SOURCE_KIND_LABEL), name).toContain(meta.kind);
      expect(meta.retrievedAt, `${name} 缺抓取日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(meta.note?.length ?? 0, `${name} 缺说明`).toBeGreaterThan(0);
    }
  });

  it("非样本来源有可打开链接；精确来源必须有发布日与数据集", () => {
    for (const [name, meta] of Object.entries(SOURCE_META)) {
      if (meta.kind === "sample") {
        expect(meta.url, `${name} 样本不应伪装成公开链接`).toBeUndefined();
        continue;
      }
      expect(meta.url, `${name} 缺链接`).toMatch(/^https?:\/\//);
      if (isPreciseKind(meta.kind)) {
        expect(meta.publishedAt, `${name} 缺发布日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(meta.publishedAt! <= meta.retrievedAt!, `${name} 发布晚于抓取`).toBe(true);
        expect(meta.dataset?.length ?? 0, `${name} 缺数据集`).toBeGreaterThan(0);
      }
    }
  });

  it("样本来源不会被标成 T1/T2", () => {
    for (const [name, meta] of Object.entries(SOURCE_META)) {
      if (meta.kind !== "sample") continue;
      expect(meta.tier, name).toBeGreaterThanOrEqual(4);
    }
  });
});
