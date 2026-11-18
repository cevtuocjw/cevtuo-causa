import type { Chain, Household, Signpost, StateV2 } from "./types";
import { validateChain } from "./validate";
import { canEditConfidence } from "./status";
import { RuleError } from "./settle";
import { formatDateOnly } from "./time";

export function createChain(state: StateV2, chain: Chain): StateV2 {
  if (state.chains.some((c) => c.id === chain.id)) {
    throw new RuleError("链条 ID 已存在");
  }
  const errors = validateChain(chain);
  if (errors.length > 0) throw new RuleError(errors.join("；"));
  return {
    ...state,
    chains: [chain, ...state.chains],
    activeId: chain.id,
  };
}

export type ChainPatch = Partial<
  Pick<
    Chain,
    | "title"
    | "event"
    | "mechanism"
    | "variable"
    | "projection"
    | "counterfactual"
    | "confidence"
    | "dueAt"
    | "signposts"
    | "sources"
    | "impacts"
    | "exposure"
    | "tags"
  >
>;

export function editChain(
  state: StateV2,
  chainId: string,
  patch: ChainPatch,
  now: Date,
): StateV2 {
  const chain = state.chains.find((c) => c.id === chainId);
  if (!chain) throw new RuleError("找不到这条链");
  if (chain.settledAt || chain.outcome) throw new RuleError("已结算的链不能再改");

  if (
    patch.confidence !== undefined &&
    patch.confidence !== chain.confidence &&
    !canEditConfidence(chain, now)
  ) {
    throw new RuleError("到期前 72 小时起，置信度已冻结");
  }

  const next: Chain = {
    ...chain,
    ...patch,
    id: chain.id,
    origin: chain.origin,
    openedAt: chain.openedAt,
    createdAt: chain.createdAt,
    updatedAt: now.toISOString(),
  };
  const errors = validateChain(next);
  if (errors.length > 0) throw new RuleError(errors.join("；"));

  return {
    ...state,
    chains: state.chains.map((c) => (c.id === chainId ? next : c)),
  };
}

/**
 * 手工更新先行指标：旧值进 history，新值成为当前值。
 * 结算时快照取当前数组，history 保留证据链。
 */
export function updateSignpost(
  state: StateV2,
  chainId: string,
  signpostId: string,
  patch: Partial<Omit<Signpost, "id" | "history">>,
  now: Date,
): StateV2 {
  const chain = state.chains.find((c) => c.id === chainId);
  if (!chain) throw new RuleError("找不到这条链");
  if (chain.settledAt || chain.outcome) throw new RuleError("已结算的链不能再改");

  const current = chain.signposts.find((s) => s.id === signpostId);
  if (!current) throw new RuleError("找不到这个先行指标");

  const previous = {
    id: current.id,
    label: current.label,
    value: current.value,
    target: current.target,
    state: current.state,
    source: current.source,
    at: current.at,
  };
  const next: Signpost = {
    ...current,
    ...patch,
    id: current.id,
    at: patch.at ?? formatDateOnly(now),
    history: [previous, ...(current.history ?? []).filter((h) => h.at !== previous.at)],
  };

  return editChain(
    state,
    chainId,
    {
      signposts: chain.signposts.map((s) => (s.id === signpostId ? next : s)),
    },
    now,
  );
}

export function setHousehold(state: StateV2, household: Household): StateV2 {
  const keys: (keyof Household)[] = [
    "income",
    "fixed",
    "mortgage",
    "liquid",
    "debt",
    "dependents",
  ];
  for (const k of keys) {
    const v = household[k];
    if (!Number.isFinite(v) || v < 0) {
      throw new RuleError("家庭数字必须是非负数");
    }
  }
  if (!Number.isInteger(household.dependents)) {
    throw new RuleError("赡养 / 子女必须是整数");
  }
  return { ...state, household: { ...household } };
}

export function setActive(state: StateV2, activeId: string): StateV2 {
  if (!state.chains.some((c) => c.id === activeId)) return state;
  return { ...state, activeId };
}

/** 清空用户链条与记录；演示数据按需由调用方单独载入。 */
export function resetUserData(state: StateV2, household: Household): StateV2 {
  return {
    ...state,
    chains: [],
    records: [],
    activeId: "",
    household: { ...household },
  };
}
