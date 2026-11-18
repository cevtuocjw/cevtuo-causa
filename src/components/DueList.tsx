import { AnimatePresence, motion } from "motion/react";
import type { Chain, Outcome } from "../data/chains";
import { pct } from "../lib/format";

const labels: Record<Outcome, string> = {
  hit: "成立",
  miss: "不成立",
  insufficient: "证据不足",
};

export function DueList({
  chains,
  activeId,
  onSelect,
  onScore,
}: {
  chains: Chain[];
  activeId: string;
  onSelect: (id: string) => void;
  onScore: (id: string, outcome: Outcome) => void;
}) {
  if (chains.length === 0) {
    return (
      <div className="empty" style={{ margin: 16 }}>
        <strong>本周没有到期链条</strong>
        下一批在 12 月 15 日。
      </div>
    );
  }

  return (
    <ul className="due-list">
      <AnimatePresence initial={false}>
        {chains.map((c) => (
          <motion.li
            key={c.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22 }}
            className={`due-row ${c.id === activeId ? "active" : ""}`}
          >
            <button
              type="button"
              className="due-main"
              onClick={() => onSelect(c.id)}
              aria-pressed={c.id === activeId}
            >
              <span className="due-title">{c.title}</span>
              <span className="due-meta">
                <span className="num">{c.due}</span>
                <span>置信 {pct(c.confidence)}</span>
              </span>
            </button>
            <div className="due-actions">
              {(["hit", "miss", "insufficient"] as Outcome[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  className="score-btn"
                  data-outcome={o}
                  onClick={() => onScore(c.id, o)}
                  aria-label={`将「${c.title}」判定为${labels[o]}`}
                >
                  {labels[o]}
                </button>
              ))}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
