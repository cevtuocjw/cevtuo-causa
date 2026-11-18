import type { Chain } from "../data/chains";

const stateLabel = {
  "on-track": "正常",
  reversed: "反向",
  pending: "待定",
} as const;

const stateClass = {
  "on-track": "on",
  reversed: "rev",
  pending: "pend",
} as const;

export function Signals({ chain }: { chain: Chain }) {
  return (
    <>
      {chain.signposts.map((s) => (
        <div className="signal-row" key={s.id}>
          <div>
            <div className="signal-label">{s.label}</div>
            <div className="signal-meta">
              目标 {s.target} · {s.source} · {s.at}
            </div>
          </div>
          <div className="signal-right">
            <div className="signal-value num">{s.value}</div>
            <div className="signal-state">
              <span className={`dot ${stateClass[s.state]}`} />
              {stateLabel[s.state]}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
