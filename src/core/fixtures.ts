import type { Chain, Household, StateV2 } from "./types";
import { DEFAULT_HOUSEHOLD, emptyState } from "./types";

export function makeChain(overrides: Partial<Chain> = {}): Chain {
  return {
    id: "chain-test",
    title: "测试链条",
    event: "某个事件发生",
    mechanism: ["第一段传导"],
    variable: "测试变量",
    projection: "你的月收入",
    counterfactual: "如果关键指标回到基准，这条链不成立",
    confidence: 0.6,
    openedAt: "2026-11-01",
    dueAt: "2026-12-10",
    signposts: [
      {
        id: "sp-1",
        label: "先行指标",
        value: "50.8",
        target: "≥ 50",
        state: "on-track",
        source: "统计局",
        at: "2026-11-15",
        history: [],
      },
    ],
    sources: [{ name: "统计局", state: "ok", at: "2026-11-15 09:00" }],
    impacts: [1, 1, 0, 0],
    tags: ["测试"],
    origin: "user",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeState(
  overrides: Partial<StateV2> = {},
  household: Household = DEFAULT_HOUSEHOLD,
): StateV2 {
  return {
    ...emptyState(household),
    chains: [makeChain()],
    activeId: "chain-test",
    ...overrides,
  };
}
