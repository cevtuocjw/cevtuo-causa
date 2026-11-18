import { describe, expect, it } from "vitest";
import {
  createChain,
  editChain,
  resetUserData,
  setHousehold,
  updateSignpost,
} from "./commands";
import { makeChain, makeState } from "./fixtures";
import { emptyState } from "./types";

describe("createChain", () => {
  it("合法链条进入 state 并成为 active", () => {
    const next = createChain(emptyState(), makeChain());
    expect(next.chains).toHaveLength(1);
    expect(next.activeId).toBe("chain-test");
  });

  it("重复 ID 或校验失败会拒绝", () => {
    const state = makeState();
    expect(() => createChain(state, makeChain())).toThrow(/已存在/);
    expect(() =>
      createChain(emptyState(), makeChain({ counterfactual: "" })),
    ).toThrow(/反事实/);
  });
});

describe("editChain", () => {
  it("live 阶段可以改置信度", () => {
    const state = makeState();
    const next = editChain(
      state,
      "chain-test",
      { confidence: 0.7 },
      new Date(2026, 11, 5),
    );
    expect(next.chains[0].confidence).toBe(0.7);
  });

  it("锁定后不能改置信度，但可以改标题", () => {
    const state = makeState();
    const lockedNow = new Date(2026, 11, 8, 12);
    expect(() =>
      editChain(state, "chain-test", { confidence: 0.7 }, lockedNow),
    ).toThrow(/冻结/);

    const renamed = editChain(
      state,
      "chain-test",
      { title: "新标题" },
      lockedNow,
    );
    expect(renamed.chains[0].title).toBe("新标题");
  });

  it("已结算的链不能再改", () => {
    const state = makeState({
      chains: [
        makeChain({
          settledAt: "2026-12-11T01:00:00.000Z",
          outcome: "hit",
        }),
      ],
    });
    expect(() =>
      editChain(state, "chain-test", { title: "x" }, new Date(2026, 11, 12)),
    ).toThrow(/已结算/);
  });
});

describe("updateSignpost", () => {
  it("更新指标时把旧值写入 history", () => {
    const state = makeState();
    const next = updateSignpost(
      state,
      "chain-test",
      "sp-1",
      { value: "51.2", state: "on-track", at: "2026-11-20" },
      new Date(2026, 11, 5),
    );
    const sp = next.chains[0].signposts[0];
    expect(sp.value).toBe("51.2");
    expect(sp.history?.[0].value).toBe("50.8");
  });
});

describe("setHousehold / resetUserData", () => {
  it("拒绝负数与非整数人数", () => {
    const state = makeState();
    expect(() => setHousehold(state, { ...state.household, income: -1 })).toThrow(
      /非负/,
    );
    expect(() =>
      setHousehold(state, { ...state.household, dependents: 1.5 }),
    ).toThrow(/整数/);
  });

  it("重置清空链条与记录", () => {
    const state = makeState();
    const next = resetUserData(state, state.household);
    expect(next.chains).toEqual([]);
    expect(next.records).toEqual([]);
    expect(next.activeId).toBe("");
  });
});
