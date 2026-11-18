import type { Chain, ChainState } from "./types";
import { dueMoment, DAY_MS } from "./time";

/** 到期前 72 小时冻结置信度。 */
export const LOCK_MS = 72 * 60 * 60 * 1000;
/** 到期后 7 天内仍算“到期”；之后标为逾期。 */
export const OVERDUE_MS = 7 * DAY_MS;

/**
 * 状态不落库：每次由 dueAt 与 now 推导，避免 0.2 里
 * “status 是手写字段、日期过了也不变”的问题。
 */
export function deriveStatus(chain: Chain, now: Date): ChainState {
  if (chain.settledAt || chain.outcome) return "settled";

  const due = dueMoment(chain.dueAt);
  if (!due) return "live";

  const dueMs = due.getTime();
  const nowMs = now.getTime();
  if (nowMs >= dueMs + OVERDUE_MS) return "overdue";
  if (nowMs >= dueMs) return "due";
  if (nowMs >= dueMs - LOCK_MS) return "locked";
  return "live";
}

export function canSettle(chain: Chain, now: Date): boolean {
  const status = deriveStatus(chain, now);
  return status === "due" || status === "overdue";
}

/** 只有 live 阶段可以改置信度；locked 起冻结。 */
export function canEditConfidence(chain: Chain, now: Date): boolean {
  return deriveStatus(chain, now) === "live";
}

/** 正数=还剩几天；0=今天到期；负数=已过期。 */
export function daysUntilDue(chain: Chain, now: Date): number {
  const due = dueMoment(chain.dueAt);
  if (!due) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);
}
