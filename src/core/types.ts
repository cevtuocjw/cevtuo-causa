/**
 * 0.3 领域类型。
 *
 * 与 0.2 的 `src/data/chains.ts` 保持字段可映射，但增加三件事：
 * 1. 真实时间（openedAt / dueAt / settledAt），状态由时间推导；
 * 2. 判定记录带链 ID、理由与指标快照，撤销只作废不删除；
 * 3. origin 区分用户判断与演示/迁移数据，统计默认只算用户。
 */

export type Outcome = "hit" | "miss" | "insufficient";

export type ChainState = "live" | "locked" | "due" | "overdue" | "settled";

export type SignpostState = "on-track" | "reversed" | "pending";

export type ExposureTarget =
  | "income"
  | "fixed"
  | "mortgage"
  | "liquid"
  | "debt";

export interface SignpostSnapshot {
  id: string;
  label: string;
  value: string;
  target: string;
  state: SignpostState;
  source: string;
  /** ISO 日期或日期时间；手工录入时由用户填写。 */
  at: string;
}

export interface Signpost extends SignpostSnapshot {
  /** 每次手工更新指标时追加，结算时取当时快照。 */
  history?: SignpostSnapshot[];
}

export interface Source {
  name: string;
  state: "ok" | "stale";
  at: string;
}

export interface Household {
  /** 元/月 */
  income: number;
  /** 元/月，不含房贷 */
  fixed: number;
  /** 元/月 */
  mortgage: number;
  /** 元 */
  liquid: number;
  /** 元 */
  debt: number;
  /** 人数 */
  dependents: number;
}

export interface Exposure {
  target: ExposureTarget;
  /** 若判断成立，目标变量变化的百分比；-50..50。 */
  deltaPct: number;
}

export interface Chain {
  id: string;
  title: string;
  event: string;
  /** 1–3 段传导机制。 */
  mechanism: string[];
  variable: string;
  projection: string;
  /** 必填：什么情况下这条链不成立。 */
  counterfactual: string;
  /** 登记时冻结，0..1。 */
  confidence: number;
  /** 日期 YYYY-MM-DD */
  openedAt: string;
  /** 日期 YYYY-MM-DD；当天 23:59:59 视为到期。 */
  dueAt: string;
  settledAt?: string;
  outcome?: Outcome;
  settleReason?: string;
  signposts: Signpost[];
  sources: Source[];
  /** 城市 / 行业 / 住房 / 家庭，各 -2..2。 */
  impacts: [number, number, number, number];
  exposure?: Exposure;
  tags: string[];
  origin: "user" | "seed";
  createdAt: string;
  updatedAt: string;
}

export interface Snapshot {
  capturedAt: string;
  signposts: SignpostSnapshot[];
}

export interface PredictionRecord {
  id: string;
  /** 迁移自 0.2 的记录没有链 ID，留空字符串。 */
  chainId: string;
  confidence: number;
  outcome: Outcome;
  /** 空字符串表示迁移数据没有时间。 */
  settledAt: string;
  reason: string;
  snapshot: Snapshot;
  origin: "user" | "seed" | "legacy";
  /** 撤销后只标记，不删除；统计排除。 */
  voidedAt?: string;
}

export interface StateV2 {
  schemaVersion: 2;
  chains: Chain[];
  records: PredictionRecord[];
  household: Household;
  activeId: string;
  settings: {
    /** 默认 false：演示与迁移记录不计入校准。 */
    showSeedInStats: boolean;
  };
}

export const DEFAULT_HOUSEHOLD: Household = {
  income: 28000,
  fixed: 9400,
  mortgage: 11200,
  liquid: 86000,
  debt: 1260000,
  dependents: 2,
};

export function emptyState(household: Household = DEFAULT_HOUSEHOLD): StateV2 {
  return {
    schemaVersion: 2,
    chains: [],
    records: [],
    household: { ...household },
    activeId: "",
    settings: { showSeedInStats: false },
  };
}
