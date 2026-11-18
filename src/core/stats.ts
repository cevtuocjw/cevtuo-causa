import type { Outcome } from "./types";

export interface StatRecord {
  confidence: number;
  outcome: Outcome;
  origin?: "user" | "seed" | "legacy";
  settledAt?: string;
  voidedAt?: string;
}

export interface StatsOptions {
  /** 默认 false：只统计 origin=user。演示与迁移记录必须显式打开。 */
  includeSeed?: boolean;
  /** 只统计 settledAt 不早于该时间的记录；迁移记录没有时间，会被排除。 */
  since?: Date;
}

export interface Bucket {
  label: string;
  min: number;
  max: number;
  mid: number;
  count: number;
  decided: number;
  hitRate: number | null;
}

export const CALIBRATION_BUCKETS = Array.from({ length: 10 }, (_, i) => {
  const min = i / 10;
  const max = (i + 1) / 10;
  return {
    label: `${i * 10}–${i * 10 + 10}`,
    min,
    max,
    mid: (min + max) / 2,
  };
});

/**
 * 统计口径：作废记录一律排除；默认只算用户自己的判断。
 * 缺 origin 的旧数据视为非用户，避免演示数据混进个人校准。
 */
export function eligibleRecords(
  records: readonly StatRecord[],
  options: StatsOptions = {},
): StatRecord[] {
  return records.filter((r) => {
    if (r.voidedAt) return false;
    if (!Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1) {
      return false;
    }
    if (!options.includeSeed && r.origin !== "user") return false;
    if (options.since) {
      const at = Date.parse(r.settledAt ?? "");
      if (!Number.isFinite(at) || at < options.since.getTime()) return false;
    }
    return true;
  });
}

export function calibration(
  records: readonly StatRecord[],
  options: StatsOptions = {},
): Bucket[] {
  const rows = eligibleRecords(records, options);
  const last = CALIBRATION_BUCKETS.length - 1;

  return CALIBRATION_BUCKETS.map((b, index) => {
    const inBucket = rows.filter((r) =>
      index === last
        ? r.confidence >= b.min && r.confidence <= b.max
        : r.confidence >= b.min && r.confidence < b.max,
    );
    const decided = inBucket.filter((r) => r.outcome !== "insufficient");
    const hits = decided.filter((r) => r.outcome === "hit").length;
    return {
      ...b,
      count: inBucket.length,
      decided: decided.length,
      hitRate: decided.length === 0 ? null : hits / decided.length,
    };
  });
}

/** 命中率：证据不足不进分母。没有可判定样本时返回 null，而不是 0。 */
export function hitRate(records: readonly StatRecord[]): number | null {
  const decided = records.filter((r) => r.outcome !== "insufficient");
  if (decided.length === 0) return null;
  return decided.filter((r) => r.outcome === "hit").length / decided.length;
}

/** Brier 分数：只算可判定样本；无样本返回 null。 */
export function brier(records: readonly StatRecord[]): number | null {
  const decided = records.filter((r) => r.outcome !== "insufficient");
  if (decided.length === 0) return null;
  const sum = decided.reduce((n, r) => {
    const actual = r.outcome === "hit" ? 1 : 0;
    return n + (r.confidence - actual) ** 2;
  }, 0);
  return sum / decided.length;
}

/**
 * ECE：按分桶加权的 |实际命中率 − 桶中点|；只算可判定样本。
 * 与 hitRate / brier 一样，传入的记录必须已经过 eligibleRecords 过滤；
 * 这里不再二次过滤，否则会把调用方明确要求包含的演示记录又排除掉。
 */
export function ece(records: readonly StatRecord[]): number | null {
  const decided = records.filter((r) => r.outcome !== "insufficient");
  if (decided.length === 0) return null;
  const last = CALIBRATION_BUCKETS.length - 1;

  const sum = CALIBRATION_BUCKETS.reduce((acc, b, index) => {
    const rows = decided.filter((r) =>
      index === last
        ? r.confidence >= b.min && r.confidence <= b.max
        : r.confidence >= b.min && r.confidence < b.max,
    );
    if (rows.length === 0) return acc;
    const hits = rows.filter((r) => r.outcome === "hit").length;
    const rate = hits / rows.length;
    return acc + (rows.length / decided.length) * Math.abs(rate - b.mid);
  }, 0);

  return sum;
}

export interface Integrity {
  total: number;
  bucketed: number;
  ok: boolean;
}

/**
 * 0.2 的问题：分桶只到 0.4–0.9，低于 0.4 的记录被静默丢弃，
 * 而命中率/Brier 又用了全部记录。这里把它变成显式断言。
 */
export function calibrationIntegrity(
  records: readonly StatRecord[],
  options: StatsOptions = {},
): Integrity {
  const rows = eligibleRecords(records, options);
  const bucketed = calibration(records, options).reduce(
    (n, b) => n + b.count,
    0,
  );
  return { total: rows.length, bucketed, ok: rows.length === bucketed };
}
