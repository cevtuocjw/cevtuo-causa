import { describe, expect, it } from "vitest";
import {
  diffusionCounts,
  hasEvidence,
  isPastStage,
  nextSteps,
  sortByConfidence,
  splitSteps,
  stageIndex,
  STAGES,
  type DiffusionCase,
} from "./diffusion";
import { DIFFUSION_CASES } from "../data/diffusion";
import { initialChains } from "../data/chains";
import { isPreciseKind } from "./source";

const sample: DiffusionCase = {
  id: "sample",
  policy: "示例政策",
  origin: "欧盟",
  currentStage: "consultation",
  updatedAt: "2026-11-19",
  summary: "示例",
  steps: [
    {
      region: "欧盟",
      stage: "announced",
      window: "2026-01",
      trigger: "宣布",
      evidence: "公告",
      url: "https://example.com/announcement",
      urlKind: "document",
      publishedAt: "2026-01-01",
      retrievedAt: "2026-11-19",
      docNumber: "示例公告 1 号",
      confidence: "high",
      status: "done",
    },
    {
      region: "英国",
      stage: "draft",
      window: "2027",
      trigger: "草案",
      evidence: "文件",
      url: "https://example.com/draft",
      urlKind: "document",
      publishedAt: "2026-02-01",
      retrievedAt: "2026-11-19",
      docNumber: "草案 2 号",
      confidence: "medium",
      status: "watching",
    },
    {
      region: "美国",
      stage: "announced",
      window: "2027",
      trigger: "听证",
      evidence: "议案",
      url: "https://example.com/bill",
      urlKind: "document",
      publishedAt: "2026-03-01",
      retrievedAt: "2026-11-19",
      docNumber: "H.R. 1",
      confidence: "low",
      status: "candidate",
    },
  ],
};

describe("政策扩散", () => {
  it("阶段顺序固定，且不会把当前阶段当成未来", () => {
    expect(STAGES).toEqual([
      "announced",
      "consultation",
      "draft",
      "implementation",
      "review",
    ]);
    expect(stageIndex("announced")).toBeLessThan(stageIndex("implementation"));
    expect(isPastStage("announced", "consultation")).toBe(true);
    expect(isPastStage("review", "consultation")).toBe(false);
  });

  it("拆分已完成 / 观察中 / 候选", () => {
    expect(splitSteps(sample)).toEqual({
      done: [sample.steps[0]],
      watching: [sample.steps[1]],
      candidates: [sample.steps[2]],
    });
  });

  it("下一步只包含未完成步骤，并按置信度排序", () => {
    const rows = nextSteps(sample);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.status)).not.toContain("done");
    expect(rows[0].confidence).toBe("medium");
  });

  it("置信度排序高 → 中 → 低，同置信按阶段", () => {
    const sorted = sortByConfidence(sample.steps);
    expect(sorted.map((row) => row.confidence)).toEqual(["high", "medium", "low"]);
  });

  it("每一步都必须有证据与触发条件", () => {
    for (const item of DIFFUSION_CASES) {
      for (const step of item.steps) {
        expect(hasEvidence(step), `${item.id}/${step.region}`).toBe(true);
        expect(step.url, `${item.id}/${step.region}`).toMatch(/^https?:\/\//);
      }
    }
  });

  it("每一步都标抓取日期与来源类型；精确文件必须有发布日", () => {
    for (const item of DIFFUSION_CASES) {
      for (const step of item.steps) {
        const where = `${item.id}/${step.region}`;
        expect(step.retrievedAt, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["release", "document", "portal"], where).toContain(step.urlKind);
        if (isPreciseKind(step.urlKind)) {
          expect(step.publishedAt, `${where} 缺发布日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(step.publishedAt! <= step.retrievedAt, `${where} 发布晚于抓取`).toBe(true);
        }
      }
    }
  });

  it("13 步里至少 12 步落到发布页或文件，且至少 10 步有文号", () => {
    const steps = DIFFUSION_CASES.flatMap((item) => item.steps);
    expect(steps).toHaveLength(13);
    expect(steps.filter((step) => isPreciseKind(step.urlKind)).length).toBeGreaterThanOrEqual(12);
    expect(steps.filter((step) => Boolean(step.docNumber)).length).toBeGreaterThanOrEqual(10);
  });

  it("演示数据有 3 个案例，且关联的 chain 都存在", () => {
    const ids = new Set(initialChains.map((chain) => chain.id));
    expect(DIFFUSION_CASES).toHaveLength(3);
    for (const item of DIFFUSION_CASES) {
      expect(item.relatedChainId, item.id).toBeTruthy();
      expect(ids.has(item.relatedChainId!), item.id).toBe(true);
    }
  });

  it("计数覆盖全部步骤", () => {
    const counts = diffusionCounts(DIFFUSION_CASES);
    const total = DIFFUSION_CASES.reduce((n, item) => n + item.steps.length, 0);
    expect(counts.cases).toBe(3);
    expect(counts.done + counts.watching + counts.candidates).toBe(total);
  });
});
