import { describe, expect, it } from "vitest";
import { SOURCE_META, initialChains } from "../data/chains";
import { SOURCE_REGISTRY, getSource } from "../data/sourceRegistry";
import { isPreciseKind, SOURCE_KIND_LABEL } from "./source";

const KINDS = ["release", "dataset", "document", "portal", "sample"];
const TIERS = ["T1", "T2", "T3", "T4", "T5"];
const INDEPENDENCE = ["official", "official-derived", "secondary", "internal", "absence"];

describe("来源注册表", () => {
  it("id 唯一，且基本字段齐全", () => {
    const ids = SOURCE_REGISTRY.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const source of SOURCE_REGISTRY) {
      expect(source.name.length, source.id).toBeGreaterThan(0);
      expect(source.publisher.length, source.id).toBeGreaterThan(0);
      expect(source.title.length, source.id).toBeGreaterThan(0);
      expect(source.dataset.length, source.id).toBeGreaterThan(0);
      expect(KINDS, source.id).toContain(source.kind);
      expect(TIERS, source.id).toContain(source.tier);
      expect(INDEPENDENCE, source.id).toContain(source.independence);
      expect(source.retrievedAt, source.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("非样本来源有可打开链接；精确来源必须有发布日", () => {
    for (const source of SOURCE_REGISTRY) {
      if (source.kind === "sample") {
        expect(source.url, `${source.id} 样本不应伪装成公开链接`).toBeUndefined();
        continue;
      }
      expect(source.url, `${source.id} 缺链接`).toMatch(/^https?:\/\//);
      if (isPreciseKind(source.kind)) {
        expect(source.publishedAt, `${source.id} 缺发布日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(source.publishedAt! <= source.retrievedAt, `${source.id} 发布晚于抓取`).toBe(true);
      }
    }
  });

  it("样本不会被标成 T1/T2", () => {
    for (const source of SOURCE_REGISTRY) {
      if (source.kind !== "sample") continue;
      expect(["T4", "T5"], source.id).toContain(source.tier);
      expect(source.independence, source.id).toBe("internal");
    }
  });

  it("getSource 对未知 id 返回 undefined，不抛异常", () => {
    expect(getSource("does-not-exist")).toBeUndefined();
    expect(getSource("cn-pmi-nbs-2026-10")?.kind).toBe("release");
  });
});

describe("链证据来源", () => {
  it("每条链里出现的来源名都在 SOURCE_META 中登记", () => {
    for (const chain of initialChains) {
      for (const source of chain.sources) {
        expect(SOURCE_META[source.name], `${chain.id}/${source.name}`).toBeTruthy();
      }
    }
  });

  it("18 个链来源都指向注册表中的真实条目", () => {
    const entries = Object.entries(SOURCE_META);
    expect(entries).toHaveLength(18);
    for (const [name, meta] of entries) {
      const registered = getSource(meta.sourceId);
      expect(registered, `${name} → ${meta.sourceId}`).toBeTruthy();
      expect(registered!.tier, name).toBe(`T${meta.tier}`);
      expect(SOURCE_KIND_LABEL, name).toHaveProperty(registered!.kind);
    }
  });
});
