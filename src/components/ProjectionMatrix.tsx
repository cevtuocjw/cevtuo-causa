import type { Chain } from "../data/chains";
import { impactLabels } from "../data/chains";
import { signed, truncate } from "../lib/format";

function shortName(chain: Chain): string {
  if (chain.id === "cny-export-hiring") return "人民币";
  if (chain.id === "eu-cbam-fastener") return "CBAM";
  if (chain.id === "fed-cut-mortgage") return "降息";
  return truncate(chain.title, 5);
}

export function ProjectionMatrix({
  chains,
  activeId,
  onSelect,
}: {
  chains: Chain[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col">坐标</th>
            {chains.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={c.id === activeId ? "active" : ""}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-pressed={c.id === activeId}
                >
                  {shortName(c)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {impactLabels.map((label, row) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {chains.map((c) => {
                const value = c.impacts[row];
                const width = (Math.abs(value) / 2) * 50;
                return (
                  <td key={`${c.id}-${label}`} className={value < 0 ? "neg" : ""}>
                    {signed(value)}
                    <span className="cell-bar" aria-hidden="true">
                      <i
                        style={{
                          left: value >= 0 ? "50%" : `${50 - width}%`,
                          width: `${width}%`,
                        }}
                      />
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="matrix-note">
        影响强度 −2…+2，不是收益预测。选中一列会把主画布切换过去。
      </p>
    </div>
  );
}
