import type { Chain } from "../data/chains";

export function Sources({ chain }: { chain: Chain }) {
  return (
    <>
      {chain.sources.map((s) => (
        <div className="source-row" key={s.name}>
          <div>
            <div className="source-name">{s.name}</div>
            <div className="source-time">{s.at}</div>
          </div>
          <span className={`pill ${s.state === "stale" ? "stale" : ""}`}>
            {s.state === "stale" ? "滞后" : "正常"}
          </span>
        </div>
      ))}
    </>
  );
}
