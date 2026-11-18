import { describe, expect, it } from "vitest";
import {
  canEditConfidence,
  canSettle,
  daysUntilDue,
  deriveStatus,
} from "./status";
import { makeChain } from "./fixtures";

const chain = makeChain({ dueAt: "2026-12-10" });

describe("deriveStatus", () => {
  it("到期前 72 小时以外是 live", () => {
    const now = new Date(2026, 11, 5, 12, 0, 0);
    expect(deriveStatus(chain, now)).toBe("live");
    expect(canEditConfidence(chain, now)).toBe(true);
    expect(canSettle(chain, now)).toBe(false);
  });

  it("进入到期前 72 小时锁定置信度", () => {
    const now = new Date(2026, 11, 8, 12, 0, 0);
    expect(deriveStatus(chain, now)).toBe("locked");
    expect(canEditConfidence(chain, now)).toBe(false);
    expect(canSettle(chain, now)).toBe(false);
  });

  it("到期当天 23:59:59 后算 due", () => {
    const now = new Date(2026, 11, 11, 0, 0, 0);
    expect(deriveStatus(chain, now)).toBe("due");
    expect(canSettle(chain, now)).toBe(true);
  });

  it("到期 7 天后算 overdue，仍可结算", () => {
    const now = new Date(2026, 11, 18, 0, 0, 0);
    expect(deriveStatus(chain, now)).toBe("overdue");
    expect(canSettle(chain, now)).toBe(true);
  });

  it("有结算时间就是 settled", () => {
    const settled = makeChain({
      settledAt: "2026-12-11T01:00:00.000Z",
      outcome: "hit",
    });
    expect(deriveStatus(settled, new Date(2026, 11, 12))).toBe("settled");
  });

  it("daysUntilDue 今天为 0，过期可为负", () => {
    expect(daysUntilDue(chain, new Date(2026, 11, 10, 9))).toBe(0);
    expect(daysUntilDue(chain, new Date(2026, 11, 12, 9))).toBe(-2);
  });
});
