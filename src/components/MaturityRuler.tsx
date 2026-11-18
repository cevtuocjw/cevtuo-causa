import type { Chain } from "../data/chains";
import { daysBetween, pct, TODAY } from "../lib/format";

export function MaturityRuler({ chain }: { chain: Chain }) {
  const total = daysBetween(chain.opened, chain.due);
  const elapsed = daysBetween(chain.opened, TODAY);
  const ratio = Math.min(1, elapsed / total);
  const remaining = Math.max(0, daysBetween(TODAY, chain.due));

  return (
    <div className="ruler">
      <div className="ruler-track" aria-hidden="true">
        <i style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="ruler-labels">
        <span>{chain.opened}</span>
        <span>{chain.due}</span>
      </div>
      <p className="ruler-note">
        {remaining} 天后到期 · 置信 {pct(chain.confidence)} ·{" "}
        {chain.status === "due" ? "等待结算" : "观察中"}
      </p>
    </div>
  );
}
