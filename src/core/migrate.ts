import type {
  Chain,
  Household,
  Outcome,
  PredictionRecord,
  Signpost,
  SignpostSnapshot,
  Source,
  StateV2,
} from "./types";
import { DEFAULT_HOUSEHOLD } from "./types";
import { addDays, diffDays, formatDateOnly, parseDateOnly } from "./time";

/** 0.2 演示数据的日期锚点；迁移时按相对天数平移到当前日期。 */
const V1_ANCHOR = "2026-11-18";

interface V1Chain {
  id?: unknown;
  title?: unknown;
  event?: unknown;
  mechanism?: unknown;
  variable?: unknown;
  projection?: unknown;
  counterfactual?: unknown;
  summary?: unknown;
  confidence?: unknown;
  opened?: unknown;
  due?: unknown;
  status?: unknown;
  outcome?: unknown;
  signposts?: unknown;
  sources?: unknown;
  impacts?: unknown;
}

interface V1Payload {
  chains?: unknown;
  records?: unknown;
  activeId?: unknown;
  household?: unknown;
}

export interface MigrationResult {
  state: StateV2;
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function clamp01(value: unknown, fallback = 0.5): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(1, Math.max(0, n));
}

function validOutcome(value: unknown): Outcome | undefined {
  return value === "hit" || value === "miss" || value === "insufficient"
    ? value
    : undefined;
}

function toSignpost(raw: unknown, chainId: string, index: number): Signpost | null {
  if (!isRecord(raw)) return null;
  const snapshot: SignpostSnapshot = {
    id: asString(raw.id, `${chainId}-sp-${index + 1}`),
    label: asString(raw.label, `指标 ${index + 1}`),
    value: asString(raw.value, "—"),
    target: asString(raw.target, "—"),
    state:
      raw.state === "on-track" || raw.state === "reversed" || raw.state === "pending"
        ? raw.state
        : "pending",
    source: asString(raw.source, "来源未记录"),
    at: asString(raw.at, ""),
  };
  return { ...snapshot, history: [snapshot] };
}

function toSource(raw: unknown, index: number): Source | null {
  if (!isRecord(raw)) return null;
  const name = asString(raw.name);
  if (!name) return null;
  return {
    name,
    state: raw.state === "stale" ? "stale" : "ok",
    at: asString(raw.at, ""),
  };
}

function toHousehold(raw: unknown): Household {
  if (!isRecord(raw)) return { ...DEFAULT_HOUSEHOLD };
  const keys: (keyof Household)[] = [
    "income",
    "fixed",
    "mortgage",
    "liquid",
    "debt",
    "dependents",
  ];
  const out = { ...DEFAULT_HOUSEHOLD };
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

function shiftDate(value: unknown, anchor: Date, now: Date, fallbackDays: number): string {
  const raw = asString(value);
  const date = parseDateOnly(raw);
  if (!date) return formatDateOnly(addDays(now, fallbackDays));
  const offset = diffDays(anchor, date);
  return formatDateOnly(addDays(now, offset));
}

function toChain(raw: V1Chain, index: number, now: Date, warnings: string[]): Chain {
  const id = asString(raw.id, `migrated-chain-${index + 1}`);
  const anchor = parseDateOnly(V1_ANCHOR) ?? now;
  const mechanismRaw = Array.isArray(raw.mechanism)
    ? raw.mechanism.filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    : [];
  const mechanism = mechanismRaw.slice(0, 3);
  if (mechanism.length === 0) {
    mechanism.push(asString(raw.summary, "未记录传导机制"));
    warnings.push(`${id}：没有传导机制，已用摘要代替`);
  }

  const signposts = Array.isArray(raw.signposts)
    ? raw.signposts
        .slice(0, 3)
        .map((s, i) => toSignpost(s, id, i))
        .filter((s): s is Signpost => s !== null)
    : [];
  if (signposts.length === 0) {
    warnings.push(`${id}：没有先行指标，迁移后需要补录`);
  }

  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .slice(0, 3)
        .map((s, i) => toSource(s, i))
        .filter((s): s is Source => s !== null)
    : [];
  if (sources.length === 0) {
    warnings.push(`${id}：没有来源，迁移后需要补录`);
  }

  const impactsRaw = Array.isArray(raw.impacts) ? raw.impacts : [];
  const impacts = [0, 1, 2, 3].map((i) => {
    const v = impactsRaw[i];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  }) as [number, number, number, number];

  const outcome = validOutcome(raw.outcome);
  const settled = raw.status === "settled" || outcome !== undefined;
  const dueAt = shiftDate(raw.due, anchor, now, 7);
  const openedAt = shiftDate(raw.opened, anchor, now, -30);

  return {
    id,
    title: asString(raw.title, `迁移链条 ${index + 1}`),
    event: asString(raw.event, "事件未记录"),
    mechanism,
    variable: asString(raw.variable, "变量未记录"),
    projection: asString(raw.projection, "投影未记录"),
    summary: asString(raw.summary) || undefined,
    counterfactual: asString(raw.counterfactual),
    confidence: clamp01(raw.confidence),
    openedAt: openedAt < dueAt ? openedAt : formatDateOnly(addDays(now, -1)),
    dueAt,
    settledAt: settled ? now.toISOString() : undefined,
    outcome,
    settleReason: settled ? "v1 迁移" : undefined,
    signposts,
    sources,
    impacts,
    tags: ["演示", "迁移"],
    origin: "seed",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function toRecord(raw: unknown, index: number, now: Date): PredictionRecord {
  const r = isRecord(raw) ? raw : {};
  return {
    id: `legacy-${index + 1}`,
    chainId: "",
    confidence: clamp01(r.confidence),
    outcome: validOutcome(r.outcome) ?? "insufficient",
    settledAt: "",
    reason: "v1 迁移：当时没有记录时间、理由与快照",
    snapshot: { capturedAt: "", signposts: [] },
    origin: "seed",
    voidedAt: undefined,
    // now 未使用；保留参数是为了将来迁移 v1 的时间字段。
  };
}

export function isStateV2(value: unknown): value is StateV2 {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    Array.isArray(value.chains) &&
    Array.isArray(value.records)
  );
}

/**
 * v1 → v2。失败时抛错，调用方必须保留原 payload，不得写入默认值。
 * 演示链的日期按相对天数平移，保证迁移后仍能演示“到期”。
 */
export function migrateV1(payload: unknown, now: Date): MigrationResult {
  if (isStateV2(payload)) {
    // 0.3 早期开发态可能缺 settings/household；补齐而不覆盖数据。
    const ids = new Set(payload.chains.map((c) => c.id));
    return {
      state: {
        schemaVersion: 2,
        chains: payload.chains,
        records: payload.records,
        household: toHousehold(payload.household),
        activeId:
          typeof payload.activeId === "string" && ids.has(payload.activeId)
            ? payload.activeId
            : payload.chains[0]?.id ?? "",
        settings: {
          showSeedInStats: Boolean(
            (payload as Partial<StateV2>).settings?.showSeedInStats,
          ),
        },
      },
      warnings: [],
    };
  }
  if (!isRecord(payload)) throw new Error("无法迁移：payload 不是对象");

  const v1 = payload as V1Payload;
  if (!Array.isArray(v1.chains) || !Array.isArray(v1.records)) {
    throw new Error("无法迁移：缺少 chains / records 数组");
  }

  const warnings: string[] = [];
  const chains = (v1.chains as V1Chain[]).map((chain, i) =>
    toChain(chain, i, now, warnings),
  );
  const records = v1.records.map((record, i) => toRecord(record, i, now));

  const ids = new Set(chains.map((c) => c.id));
  const activeId =
    typeof v1.activeId === "string" && ids.has(v1.activeId)
      ? v1.activeId
      : chains[0]?.id ?? "";

  return {
    state: {
      schemaVersion: 2,
      chains,
      records,
      household: toHousehold(v1.household),
      activeId,
      settings: { showSeedInStats: false },
    },
    warnings,
  };
}
