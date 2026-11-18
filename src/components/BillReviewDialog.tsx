import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { BillKind, BillSummary } from "../lib/bills";
import { applyBillCategories } from "../lib/bills";

const KIND_LABEL: Record<BillKind, string> = {
  mortgage: "房贷",
  fixed: "固定",
  other: "其他",
};

export function BillReviewDialog({
  summary,
  onCancel,
  onConfirm,
}: {
  summary: BillSummary | null;
  onCancel: () => void;
  onConfirm: (adjusted: BillSummary) => void;
}) {
  const [kinds, setKinds] = useState<BillKind[]>([]);
  const [seedId, setSeedId] = useState<string>("");

  const currentId = summary
    ? `${summary.source}-${summary.rows}-${summary.months.join(",")}`
    : "";
  if (summary && seedId !== currentId) {
    setSeedId(currentId);
    setKinds(summary.items.map((i) => i.kind));
  }

  const adjusted = useMemo(
    () => (summary ? applyBillCategories(summary, kinds) : null),
    [summary, kinds],
  );

  if (!summary || !adjusted) return null;

  const sourceLabel =
    summary.source === "wechat"
      ? "微信"
      : summary.source === "alipay"
        ? "支付宝"
        : "未知来源";

  return (
    <AnimatePresence>
      <motion.div
        className="overlay"
        role="presentation"
        onMouseDown={onCancel}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="dialog glass bill-review"
          role="dialog"
          aria-modal="true"
          aria-label="复核账单分类"
          onMouseDown={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: -6, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
        >
          <div className="dialog-head">
            <h2>复核账单分类</h2>
            <span className="pill">{sourceLabel}</span>
          </div>
          <p className="dialog-lead">
            找到 {summary.months.join(" / ")} 共 {summary.rows} 笔支出
            {summary.skipped > 0
              ? `，跳过 ${summary.skipped} 笔转账 / 还款 / 理财`
              : ""}
            。商户名只在本页显示，入库只有聚合数。
          </p>

          <div className="bill-preview">
            <div>
              <span>月均支出</span>
              <b className="num">¥{adjusted.avgExpense.toLocaleString("en-US")}</b>
            </div>
            <div>
              <span>月均房贷</span>
              <b className="num">¥{adjusted.avgMortgage.toLocaleString("en-US")}</b>
            </div>
            <div>
              <span>月均固定</span>
              <b className="num">¥{adjusted.avgFixed.toLocaleString("en-US")}</b>
            </div>
          </div>

          <div className="bill-list">
            {summary.items.map((item, index) => (
              <div className="bill-row" key={`${item.month}-${index}`}>
                <span className="bill-month num">{item.month}</span>
                <span className="bill-label">{item.label}</span>
                <span className="bill-amount num">
                  ¥{item.amount.toLocaleString("en-US")}
                </span>
                <select
                  value={kinds[index] ?? item.kind}
                  aria-label={`${item.label} 的分类`}
                  onChange={(e) =>
                    setKinds((prev) => {
                      const next = [...prev];
                      next[index] = e.target.value as BillKind;
                      return next;
                    })
                  }
                >
                  {(Object.keys(KIND_LABEL) as BillKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {KIND_LABEL[kind]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onCancel}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onConfirm(adjusted)}
            >
              用这些估算
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
