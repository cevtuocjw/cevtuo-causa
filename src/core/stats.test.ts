import { describe, expect, it } from "vitest";
import type { StatRecord } from "./stats";
import {
  brier,
  calibration,
  calibrationIntegrity,
  ece,
  eligibleRecords,
  hitRate,
  recordsForTag,
} from "./stats";

const records: StatRecord[] = [
  { confidence: 0.27, outcome: "miss", origin: "user" },
  { confidence: 0.35, outcome: "insufficient", origin: "user" },
  { confidence: 0.55, outcome: "hit", origin: "user" },
  { confidence: 0.55, outcome: "miss", origin: "user" },
  { confidence: 0.95, outcome: "hit", origin: "user" },
  { confidence: 0.65, outcome: "hit", origin: "seed" },
  { confidence: 0.45, outcome: "hit", origin: "user", voidedAt: "2026-11-20" },
];

describe("stats 口径", () => {
  it("默认只统计用户、排除作废记录", () => {
    const rows = eligibleRecords(records);
    expect(rows).toHaveLength(5);
    expect(eligibleRecords(records, { includeSeed: true })).toHaveLength(6);
  });

  it("分桶覆盖全部记录，包括 0.4 以下", () => {
    const integrity = calibrationIntegrity(records);
    expect(integrity).toEqual({ total: 5, bucketed: 5, ok: true });

    const buckets = calibration(records);
    expect(buckets).toHaveLength(10);
    expect(buckets[2].count).toBe(1); // 0.27
    expect(buckets[3].count).toBe(1); // 0.35
    expect(buckets[5].count).toBe(2); // 0.55
    expect(buckets[9].count).toBe(1); // 0.95
  });

  it("命中率与 Brier 排除证据不足", () => {
    const rows = eligibleRecords(records);
    expect(hitRate(rows)).toBe(0.5);
    expect(brier(rows)).toBeCloseTo(0.1451, 4);
  });

  it("ECE 按桶内可判定样本加权", () => {
    expect(ece(eligibleRecords(records))).toBeCloseTo(0.1, 6);
  });

  it("ECE 不再二次过滤：传入含 seed 的记录时应计算而不是返回 null", () => {
    const withSeed = eligibleRecords(records, { includeSeed: true });
    expect(ece(withSeed)).not.toBeNull();
  });

  it("置信度 1.0 落在最后一个桶", () => {
    const buckets = calibration([{ confidence: 1, outcome: "hit", origin: "user" }]);
    expect(buckets[9].count).toBe(1);
  });

  it("没有可判定样本时返回 null 而不是 0", () => {
    const onlyInsufficient: StatRecord[] = [
      { confidence: 0.5, outcome: "insufficient", origin: "user" },
    ];
    expect(hitRate(onlyInsufficient)).toBeNull();
    expect(brier(onlyInsufficient)).toBeNull();
    expect(ece(onlyInsufficient)).toBeNull();
  });

  it("0.2 的 23 条演示记录打开 includeSeed 后应全部落桶", () => {
    const seed: StatRecord[] = [
      0.82, 0.78, 0.74, 0.71, 0.68, 0.66, 0.64, 0.61, 0.59, 0.57, 0.55,
      0.54, 0.52, 0.51, 0.49, 0.47, 0.45, 0.43, 0.41, 0.38, 0.35, 0.31,
      0.27,
    ].map((confidence) => ({
      confidence,
      outcome: "hit" as const,
      origin: "seed" as const,
    }));
    const integrity = calibrationIntegrity(seed, { includeSeed: true });
    expect(integrity).toEqual({ total: 23, bucketed: 23, ok: true });
  });
});

describe("stats 时间窗", () => {
  const dated: StatRecord[] = [
    { confidence: 0.6, outcome: "hit", origin: "user", settledAt: "2026-10-01T00:00:00Z" },
    { confidence: 0.7, outcome: "miss", origin: "user", settledAt: "2026-11-20T00:00:00Z" },
    { confidence: 0.8, outcome: "hit", origin: "user" },
  ];

  it("since 只保留窗口内且有时间的记录", () => {
    const rows = eligibleRecords(dated, { since: new Date("2026-11-01T00:00:00Z") });
    expect(rows).toHaveLength(1);
    expect(rows[0].confidence).toBe(0.7);
  });

  it("不传 since 时保留全部用户记录", () => {
    expect(eligibleRecords(dated)).toHaveLength(3);
  });
});

describe("stats 类别筛选", () => {
  const chains = [
    { id: "macro", tags: ["宏观", "房租"] },
    { id: "policy", tags: ["政策"] },
    { id: "industry", tags: ["行业", "宏观"] },
  ];
  const tagged: StatRecord[] = [
    { confidence: 0.6, outcome: "hit", origin: "user", chainId: "macro" },
    { confidence: 0.7, outcome: "miss", origin: "user", chainId: "policy" },
    { confidence: 0.8, outcome: "hit", origin: "user", chainId: "industry" },
    { confidence: 0.5, outcome: "hit", origin: "user", chainId: "" },
  ];

  it("按标签关联到链条；迁移记录 chainId 为空不命中", () => {
    expect(recordsForTag(tagged, chains, "宏观")).toHaveLength(2);
    expect(recordsForTag(tagged, chains, "政策")).toHaveLength(1);
    expect(recordsForTag(tagged, chains, "个人")).toHaveLength(0);
  });

  it("null / all 不筛选", () => {
    expect(recordsForTag(tagged, chains, null)).toHaveLength(4);
    expect(recordsForTag(tagged, chains, "all")).toHaveLength(4);
  });

  it("类别筛选后仍走 eligibleRecords 的时间窗与作废过滤", () => {
    const rows = recordsForTag(tagged, chains, "宏观");
    const filtered = eligibleRecords(rows, {
      since: new Date("2026-01-01T00:00:00Z"),
    });
    expect(filtered).toHaveLength(0); // 没有 settledAt，时间窗会排除
  });
});
