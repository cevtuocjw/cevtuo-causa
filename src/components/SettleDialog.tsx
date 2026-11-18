import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Chain, Outcome } from "../core/types";
import { canSettle, daysUntilDue, deriveStatus } from "../core/status";

const OUTCOMES: { value: Outcome; label: string; hint: string }[] = [
  { value: "hit", label: "成立", hint: "反事实没有发生，传导按预期出现" },
  { value: "miss", label: "不成立", hint: "出现了反事实，或关键传导断了" },
  { value: "insufficient", label: "证据不足", hint: "证据仍不够，诚实记为未判定" },
];

const STATE_LABEL: Record<string, string> = {
  "on-track": "正常",
  reversed: "反向",
  pending: "待定",
};

export function SettleDialog({
  open,
  chain,
  now,
  initialOutcome,
  onClose,
  onConfirm,
}: {
  open: boolean;
  chain: Chain | null;
  now: Date;
  initialOutcome?: Outcome;
  onClose: () => void;
  onConfirm: (outcome: Outcome, reason: string) => void;
}) {
  const [outcome, setOutcome] = useState<Outcome | undefined>(initialOutcome);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setOutcome(initialOutcome);
      setReason("");
    }
  }, [open, initialOutcome, chain?.id]);

  const status = chain ? deriveStatus(chain, now) : null;
  const settleable = chain ? canSettle(chain, now) : false;
  const days = chain ? daysUntilDue(chain, now) : 0;

  const reasonRequired = outcome === "miss" || outcome === "insufficient";
  const canConfirm =
    settleable &&
    outcome !== undefined &&
    (!reasonRequired || reason.trim().length > 0);

  const dueText = useMemo(() => {
    if (!chain) return "";
    if (status === "overdue") return `已逾期 ${Math.abs(days)} 天`;
    if (status === "due") return days === 0 ? "今天到期" : `到期 ${days} 天`;
    if (status === "locked") return `还有 ${days} 天到期 · 置信度已锁定`;
    return `还有 ${days} 天到期`;
  }, [chain, days, status]);

  return (
    <AnimatePresence>
      {open && chain ? (
        <motion.div
          className="overlay"
          role="presentation"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="dialog glass settle-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="结算链条"
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <div className="dialog-head">
              <h2>结算 · {chain.title}</h2>
              <span className={`pill ${status === "overdue" ? "stale" : ""}`}>
                {dueText}
              </span>
            </div>

            <div className="settle-counterfactual">
              <span>先看反事实</span>
              <p>{chain.counterfactual}</p>
            </div>

            <div className="settle-snapshot">
              <div className="settle-snapshot-head">
                <span>结算时的指标快照</span>
                <span>{chain.signposts.length} 个</span>
              </div>
              {chain.signposts.map((s) => (
                <div className="settle-sp" key={s.id}>
                  <span>{s.label}</span>
                  <b className="num">{s.value}</b>
                  <span className="num">{s.target}</span>
                  <span className={`sp-state ${s.state}`}>
                    {STATE_LABEL[s.state]}
                  </span>
                </div>
              ))}
              <p className="settle-note">
                确认后会把这组指标与理由一起封存；撤销只作废记录，不删除审计。
              </p>
            </div>

            <div className="settle-outcomes" role="group" aria-label="判定结果">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`settle-choice ${outcome === o.value ? "active" : ""}`}
                  onClick={() => setOutcome(o.value)}
                >
                  <b>{o.label}</b>
                  <span>{o.hint}</span>
                </button>
              ))}
            </div>

            <label className="settle-reason">
              <span>
                一句理由
                {reasonRequired ? "（必填）" : "（建议填写）"}
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={
                  reasonRequired
                    ? "哪条传导断了？反事实出现了吗？"
                    : "当时为什么这样判断？"
                }
              />
            </label>

            {!settleable ? (
              <p className="household-error">
                这条链还没有到期，不能提前结算。
              </p>
            ) : null}

            <div className="dialog-actions">
              <button type="button" className="btn" onClick={onClose}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canConfirm}
                onClick={() => outcome && onConfirm(outcome, reason.trim())}
              >
                确认结算
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
