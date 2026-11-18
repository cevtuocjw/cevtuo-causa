import type {
  Chain,
  Outcome,
  PredictionRecord,
  SignpostSnapshot,
  StateV2,
} from "./types";
import { canSettle } from "./status";

/** 撤销窗口：结算后 10 秒内可撤销，之后只能作废记录（后续版本）。 */
export const UNDO_WINDOW_MS = 10_000;

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

export function snapshotOf(chain: Chain, capturedAt: string): SignpostSnapshot[] {
  return chain.signposts.map((s) => ({
    id: s.id,
    label: s.label,
    value: s.value,
    target: s.target,
    state: s.state,
    source: s.source,
    at: s.at,
  }));
}

export interface SettleInput {
  chainId: string;
  outcome: Outcome;
  reason: string;
  now: Date;
  /** 由调用方生成，便于测试确定性。 */
  recordId: string;
}

/**
 * 结算：只允许在 due / overdue 状态；miss 与 insufficient 必须写理由。
 * 返回新 state，不修改入参。
 */
export function settle(state: StateV2, input: SettleInput): StateV2 {
  const chain = state.chains.find((c) => c.id === input.chainId);
  if (!chain) throw new RuleError("找不到这条链");
  if (chain.settledAt || chain.outcome) throw new RuleError("这条链已经结算");
  if (!canSettle(chain, input.now)) {
    throw new RuleError("未到期，不能提前结算");
  }

  const reason = input.reason.trim();
  if (input.outcome !== "hit" && reason.length === 0) {
    throw new RuleError("不成立或证据不足必须写明理由");
  }

  const settledAt = input.now.toISOString();
  const record: PredictionRecord = {
    id: input.recordId,
    chainId: chain.id,
    confidence: chain.confidence,
    outcome: input.outcome,
    settledAt,
    reason,
    snapshot: {
      capturedAt: settledAt,
      signposts: snapshotOf(chain, settledAt),
    },
    origin: chain.origin,
  };

  const nextChain: Chain = {
    ...chain,
    settledAt,
    outcome: input.outcome,
    settleReason: reason || undefined,
    updatedAt: settledAt,
  };

  return {
    ...state,
    chains: state.chains.map((c) => (c.id === chain.id ? nextChain : c)),
    records: [...state.records, record],
  };
}

/**
 * 撤销：作废记录并回滚链条，审计由调用方追加 settle_undo。
 * 只允许在窗口内撤销最后一条未作废记录。
 */
export function undoSettle(
  state: StateV2,
  input: { recordId: string; now: Date; windowMs?: number },
): StateV2 {
  const windowMs = input.windowMs ?? UNDO_WINDOW_MS;
  const record = state.records.find((r) => r.id === input.recordId);
  if (!record) throw new RuleError("找不到这条判定记录");
  if (record.voidedAt) throw new RuleError("这条记录已经作废");

  const settledMs = Date.parse(record.settledAt);
  if (!Number.isFinite(settledMs)) {
    throw new RuleError("迁移记录没有结算时间，不能撤销");
  }
  if (input.now.getTime() - settledMs > windowMs) {
    throw new RuleError("撤销窗口已过");
  }

  const chain = state.chains.find((c) => c.id === record.chainId);
  if (!chain) throw new RuleError("找不到对应的链");

  const voidedAt = input.now.toISOString();
  const nextChain: Chain = {
    ...chain,
    settledAt: undefined,
    outcome: undefined,
    settleReason: undefined,
    updatedAt: voidedAt,
  };

  return {
    ...state,
    chains: state.chains.map((c) => (c.id === chain.id ? nextChain : c)),
    records: state.records.map((r) =>
      r.id === record.id ? { ...r, voidedAt } : r,
    ),
  };
}
