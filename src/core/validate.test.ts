import { describe, expect, it } from "vitest";
import { validateChain } from "./validate";
import { makeChain } from "./fixtures";

describe("validateChain", () => {
  it("合法链条通过", () => {
    expect(validateChain(makeChain())).toEqual([]);
  });

  it("反事实必填", () => {
    const errors = validateChain(makeChain({ counterfactual: "   " }));
    expect(errors.some((e) => e.includes("反事实"))).toBe(true);
  });

  it("至少一个先行指标、最多三个", () => {
    expect(
      validateChain(makeChain({ signposts: [] })).some((e) => e.includes("先行指标")),
    ).toBe(true);

    const base = makeChain().signposts[0];
    const four = [1, 2, 3, 4].map((i) => ({ ...base, id: `sp-${i}` }));
    expect(
      validateChain(makeChain({ signposts: four })).some((e) =>
        e.includes("最多 3 个"),
      ),
    ).toBe(true);
  });

  it("到期日必须晚于登记日", () => {
    const errors = validateChain(
      makeChain({ openedAt: "2026-12-10", dueAt: "2026-12-10" }),
    );
    expect(errors.some((e) => e.includes("晚于"))).toBe(true);
  });

  it("置信度超出范围会报错", () => {
    expect(
      validateChain(makeChain({ confidence: 1.2 })).some((e) =>
        e.includes("置信度"),
      ),
    ).toBe(true);
  });

  it("影响必须是四个 -2..2 的数", () => {
    expect(
      validateChain(
        makeChain({ impacts: [1, 1, 1, 1] as [number, number, number, number] }),
      ),
    ).toEqual([]);
    expect(
      validateChain(
        makeChain({ impacts: [0, 0, 3, 0] as [number, number, number, number] }),
      ).some((e) => e.includes("坐标影响")),
    ).toBe(true);
  });

  it("家庭暴露不能为 0 或超过 50%", () => {
    expect(
      validateChain(makeChain({ exposure: { target: "income", deltaPct: 0 } })).some(
        (e) => e.includes("家庭暴露"),
      ),
    ).toBe(true);
    expect(
      validateChain(
        makeChain({ exposure: { target: "income", deltaPct: 5 } }),
      ),
    ).toEqual([]);
  });

  it("至少一个来源", () => {
    expect(
      validateChain(makeChain({ sources: [] })).some((e) => e.includes("来源")),
    ).toBe(true);
  });
});
