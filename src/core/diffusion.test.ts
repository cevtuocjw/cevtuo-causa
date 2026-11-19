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
