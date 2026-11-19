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
import { getSource } from "../data/sourceRegistry";
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
      sourceId: "eu-cbam-reg-2023-956",
      confidence: "high",
      status: "done",
    },
    {
      region: "英国",
      stage: "draft",
      window: "2027",
      trigger: "草案",
      evidence: "文件",
      sourceId: "uk-cbam-refinery-consultation-2026",
      confidence: "medium",
      status: "watching",
    },
    {
      region: "美国",
      stage: "announced",
      window: "2027",
      trigger: "听证",
      evidence: "议案",
      sourceId: "us-clean-competition-act",
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
      }
    }
  });

  it("每一步的 sourceId 都能在注册表中找到", () => {
    for (const item of DIFFUSION_CASES) {
      for (const step of item.steps) {
        expect(getSource(step.sourceId), `${item.id}/${step.sourceId}`).toBeTruthy();
      }
    }
  });

  it("精确文件必须有链接、发布日与文号/数据集", () => {
    for (const item of DIFFUSION_CASES) {
      for (const step of item.steps) {
        const meta = getSource(step.sourceId)!;
        const where = `${item.id}/${step.region}`;
        expect(meta.retrievedAt, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["release", "document", "portal"], where).toContain(meta.kind);
        if (!isPreciseKind(meta.kind)) continue;
        expect(meta.url, where).toMatch(/^https?:\/\//);
        expect(meta.publishedAt, `${where} 缺发布日`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(meta.publishedAt! <= meta.retrievedAt, `${where} 发布晚于抓取`).toBe(true);
        expect(meta.dataset.length, `${where} 缺文号/数据集`).toBeGreaterThan(0);
      }
    }
  });

  it("13 步里至少 12 步落到发布页或文件，且至少 12 步有文号/数据集", () => {
    const steps = DIFFUSION_CASES.flatMap((item) => item.steps);
    expect(steps).toHaveLength(13);
    const precise = steps.filter((step) => {
      const meta = getSource(step.sourceId);
      return meta ? isPreciseKind(meta.kind) : false;
    });
    const identified = steps.filter((step) => (getSource(step.sourceId)?.dataset.length ?? 0) > 0);
    expect(precise.length).toBeGreaterThanOrEqual(12);
    expect(identified.length).toBeGreaterThanOrEqual(12);
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
