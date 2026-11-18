import type { Chain, ExposureTarget, Signpost } from "./types";
import { parseDateOnly } from "./time";

const EXPOSURE_TARGETS: ExposureTarget[] = [
  "income",
  "fixed",
  "mortgage",
  "liquid",
  "debt",
];

function nonEmpty(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function validSignpost(s: Signpost, index: number): string[] {
  const errors: string[] = [];
  const at = `指标 ${index + 1}`;
  if (!nonEmpty(s.id)) errors.push(`${at}：缺少 id`);
  if (!nonEmpty(s.label)) errors.push(`${at}：缺少名称`);
  if (!nonEmpty(s.target)) errors.push(`${at}：缺少目标值`);
  if (!nonEmpty(s.source)) errors.push(`${at}：缺少来源`);
  if (!nonEmpty(s.at)) errors.push(`${at}：缺少时间`);
  if (!["on-track", "reversed", "pending"].includes(s.state)) {
    errors.push(`${at}：状态无效`);
  }
  return errors;
}

/**
 * 新建/编辑链条的唯一校验入口。反事实为空时不允许入库——
 * 这是产品与“更长的 AI 叙事”的分界线。
 */
export function validateChain(chain: Chain): string[] {
  const errors: string[] = [];

  if (!nonEmpty(chain.id)) errors.push("缺少链条 ID");
  if (!nonEmpty(chain.title)) errors.push("标题不能为空");
  if (!nonEmpty(chain.event)) errors.push("触发事件不能为空");
  if (!nonEmpty(chain.variable)) errors.push("被改变的变量不能为空");
  if (!nonEmpty(chain.projection)) errors.push("对生活的投影不能为空");
  if (!nonEmpty(chain.counterfactual)) {
    errors.push("必须写明反事实：什么情况下这条链不成立");
  }

  if (!Array.isArray(chain.mechanism) || chain.mechanism.length < 1) {
    errors.push("传导机制至少 1 段");
  } else if (chain.mechanism.length > 3) {
    errors.push("传导机制最多 3 段");
  } else if (chain.mechanism.some((m) => !nonEmpty(m))) {
    errors.push("传导机制不能有空段");
  }

  if (!Number.isFinite(chain.confidence) || chain.confidence < 0 || chain.confidence > 1) {
    errors.push("置信度必须在 0–100% 之间");
  }

  if (!parseDateOnly(chain.openedAt)) errors.push("登记日格式必须是 YYYY-MM-DD");
  if (!parseDateOnly(chain.dueAt)) errors.push("到期日格式必须是 YYYY-MM-DD");
  if (
    parseDateOnly(chain.openedAt) &&
    parseDateOnly(chain.dueAt) &&
    chain.dueAt <= chain.openedAt
  ) {
    errors.push("到期日必须晚于登记日");
  }

  if (!Array.isArray(chain.signposts) || chain.signposts.length < 1) {
    errors.push("至少 1 个先行指标");
  } else if (chain.signposts.length > 3) {
    errors.push("先行指标最多 3 个");
  } else {
    chain.signposts.forEach((s, i) => errors.push(...validSignpost(s, i)));
  }

  if (!Array.isArray(chain.sources) || chain.sources.length < 1) {
    errors.push("至少 1 个来源");
  } else if (chain.sources.length > 3) {
    errors.push("来源最多 3 个");
  } else if (chain.sources.some((s) => !nonEmpty(s.name))) {
    errors.push("来源名称不能为空");
  }

  if (!Array.isArray(chain.impacts) || chain.impacts.length !== 4) {
    errors.push("影响必须是 4 个坐标值");
  } else if (
    chain.impacts.some((v) => !Number.isFinite(v) || v < -2 || v > 2)
  ) {
    errors.push("四个坐标影响必须在 -2…+2 之间");
  }

  if (chain.exposure) {
    if (!EXPOSURE_TARGETS.includes(chain.exposure.target)) {
      errors.push("家庭暴露目标无效");
    }
    if (
      !Number.isFinite(chain.exposure.deltaPct) ||
      chain.exposure.deltaPct === 0 ||
      Math.abs(chain.exposure.deltaPct) > 50
    ) {
      errors.push("家庭暴露变化必须在 -50%…+50% 之间且不能为 0");
    }
  }

  if (chain.origin !== "user" && chain.origin !== "seed") {
    errors.push("来源标记无效");
  }

  return errors;
}
