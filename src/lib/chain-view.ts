import type { Chain as CoreChain } from "../core/types";
import { deriveStatus } from "../core/status";
import type { Chain as ViewChain } from "../data/chains";

/**
 * 0.3 的 state 是 CoreChain；0.2 的展示组件仍按 ViewChain 读字段。
 * 这里只做展示映射，状态由时间推导，不把 status 写回 state。
 */
export function toChainView(chain: CoreChain, now: Date): ViewChain {
  const status = deriveStatus(chain, now);
  return {
    id: chain.id,
    title: chain.title,
    event: chain.event,
    mechanism: chain.mechanism,
    variable: chain.variable,
    projection: chain.projection,
    coordinates: chain.tags,
    confidence: chain.confidence,
    opened: chain.openedAt,
    due: chain.dueAt,
    status:
      status === "settled" ? "settled" : status === "due" || status === "overdue" ? "due" : "live",
    summary: chain.summary ?? chain.mechanism.join(" → "),
    counterfactual: chain.counterfactual,
    signposts: chain.signposts,
    sources: chain.sources,
    impacts: chain.impacts,
    exposure: chain.exposure,
    outcome: chain.outcome,
  };
}
