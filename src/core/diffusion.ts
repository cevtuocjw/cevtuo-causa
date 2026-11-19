export const STAGES = [
  "announced",
  "consultation",
  "draft",
  "implementation",
  "review",
] as const;

export type Stage = (typeof STAGES)[number];
export type Confidence = "high" | "medium" | "low";
export type StepStatus = "done" | "watching" | "candidate";

export interface DiffusionStep {
  region: string;
  stage: Stage;
  /** 时间窗，不是承诺日期。 */
  window: string;
  /** 触发条件；没有触发条件就不算下一步。 */
  trigger: string;
  evidence: string;
  confidence: Confidence;
  status: StepStatus;
}

export interface DiffusionCase {
  id: string;
  policy: string;
  origin: string;
  currentStage: Stage;
  updatedAt: string;
  summary: string;
  relatedChainId?: string;
  steps: DiffusionStep[];
}

export const STAGE_LABEL: Record<Stage, string> = {
  announced: "已宣布",
  consultation: "咨询",
  draft: "草案",
  implementation: "实施",
  review: "复审",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const CONFIDENCE_RANK: Record<Confidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

export function isPastStage(stage: Stage, current: Stage): boolean {
  return stageIndex(stage) <= stageIndex(current);
}

export function splitSteps(stepCase: DiffusionCase) {
  return {
    done: stepCase.steps.filter((step) => step.status === "done"),
    watching: stepCase.steps.filter((step) => step.status === "watching"),
    candidates: stepCase.steps.filter((step) => step.status === "candidate"),
  };
}

export function diffusionCounts(cases: readonly DiffusionCase[]) {
  return cases.reduce(
    (acc, item) => {
      const split = splitSteps(item);
      acc.done += split.done.length;
      acc.watching += split.watching.length;
      acc.candidates += split.candidates.length;
      acc.cases += 1;
      return acc;
    },
    { cases: 0, done: 0, watching: 0, candidates: 0 },
  );
}

/** 高置信在前；同置信按阶段先后。 */
export function sortByConfidence(steps: readonly DiffusionStep[]): DiffusionStep[] {
  return [...steps].sort((a, b) => {
    const byConfidence = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (byConfidence !== 0) return byConfidence;
    return stageIndex(a.stage) - stageIndex(b.stage);
  });
}

/**
 * 只返回“还没发生”的步骤：watching / candidate。
 * 已经完成的步骤不能再次被当成下一步。
 */
export function nextSteps(stepCase: DiffusionCase): DiffusionStep[] {
  return sortByConfidence(
    stepCase.steps.filter((step) => step.status !== "done"),
  );
}

export function hasEvidence(step: DiffusionStep): boolean {
  return step.evidence.trim().length > 0 && step.trigger.trim().length > 0;
}
