import { describe, expect, it } from "vitest";
import { RuleError, settle, undoSettle } from "./settle";
import { makeChain, makeState } from "./fixtures";

const dueState = makeState({ chains: [makeChain({ dueAt: "2026-12-10" })] });
const dueNow = new Date(2026, 11, 11, 9, 0, 0);

describe("settle", () => {
  it("未到期不能结算", () => {
    expect(() =>
      settle(dueState, {
        chainId: "chain-test",
        outcome: "hit",
        reason: "",
        now: new Date(2026, 11, 1),
        recordId: "r1",
      }),
    ).toThrow(/未到期/);
  });

  it("不成立与证据不足必须写理由", () => {
    expect(() =>
      settle(dueState, {
        chainId: "chain-test",
        outcome: "miss",
        reason: "  ",
        now: dueNow,
        recordId: "r1",
      }),
    ).toThrow(/理由/);

    expect(() =>
      settle(dueState, {
        chainId: "chain-test",
        outcome: "insufficient",
        reason: "",
        now: dueNow,
        recordId: "r1",
      }),
    ).toThrow(/理由/);
  });

  it("结算写入记录、快照，且不修改原 state", () => {
    const next = settle(dueState, {
      chainId: "chain-test",
      outcome: "hit",
      reason: "指标如期转正",
      now: dueNow,
      recordId: "r1",
    });

    expect(dueState.records).toHaveLength(0);
    expect(dueState.chains[0].outcome).toBeUndefined();

    expect(next.records).toHaveLength(1);
    const record = next.records[0];
    expect(record.chainId).toBe("chain-test");
    expect(record.confidence).toBe(0.6);
    expect(record.reason).toBe("指标如期转正");
    expect(record.snapshot.signposts).toHaveLength(1);
    expect(record.snapshot.signposts[0].value).toBe("50.8");
    expect(record.origin).toBe("user");
    expect(next.chains[0].outcome).toBe("hit");
    expect(next.chains[0].settledAt).toBe(dueNow.toISOString());
  });

  it("同一条链不能结算两次", () => {
    const next = settle(dueState, {
      chainId: "chain-test",
      outcome: "hit",
      reason: "",
      now: dueNow,
      recordId: "r1",
    });
    expect(() =>
      settle(next, {
        chainId: "chain-test",
        outcome: "miss",
        reason: "改了",
        now: dueNow,
        recordId: "r2",
      }),
    ).toThrow(/已经结算/);
  });

  it("seed 链的判定记录 origin 也是 seed", () => {
    const state = makeState({
      chains: [makeChain({ dueAt: "2026-12-10", origin: "seed" })],
    });
    const next = settle(state, {
      chainId: "chain-test",
      outcome: "hit",
      reason: "",
      now: dueNow,
      recordId: "r1",
    });
    expect(next.records[0].origin).toBe("seed");
  });

  it("找不到链时抛 RuleError", () => {
    expect(() =>
      settle(dueState, {
        chainId: "missing",
        outcome: "hit",
        reason: "",
        now: dueNow,
        recordId: "r1",
      }),
    ).toThrow(RuleError);
  });
});

describe("undoSettle", () => {
  const settled = settle(dueState, {
    chainId: "chain-test",
    outcome: "hit",
    reason: "指标如期转正",
    now: dueNow,
    recordId: "r1",
  });

  it("10 秒内撤销：记录作废、链条回到未结算", () => {
    const next = undoSettle(settled, {
      recordId: "r1",
      now: new Date(2026, 11, 11, 9, 0, 5),
    });
    expect(next.records[0].voidedAt).toBeDefined();
    expect(next.chains[0].outcome).toBeUndefined();
    expect(next.chains[0].settledAt).toBeUndefined();
    expect(settled.chains[0].outcome).toBe("hit");
  });

  it("超过窗口不能撤销", () => {
    expect(() =>
      undoSettle(settled, {
        recordId: "r1",
        now: new Date(2026, 11, 11, 9, 0, 11),
      }),
    ).toThrow(/窗口/);
  });

  it("不能重复撤销", () => {
    const once = undoSettle(settled, {
      recordId: "r1",
      now: new Date(2026, 11, 11, 9, 0, 5),
    });
    expect(() =>
      undoSettle(once, {
        recordId: "r1",
        now: new Date(2026, 11, 11, 9, 0, 6),
      }),
    ).toThrow(/作废/);
  });
});
