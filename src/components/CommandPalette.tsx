import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Chain } from "../data/chains";
import { pct } from "../lib/format";
import { Icon } from "./Icon";

interface Answer {
  text: string;
  draft?: boolean;
}

export function CommandPalette({
  open,
  seed,
  onClose,
  due,
  visible,
  rate,
  recordsCount,
  onRegisterDraft,
}: {
  open: boolean;
  seed?: string;
  onClose: () => void;
  due: Chain[];
  visible: Chain[];
  rate: number;
  recordsCount: number;
  onRegisterDraft: () => void;
}) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function run(raw: string) {
    const q = raw.trim();
    setQuery(q);

    if (!q) {
      setAnswer({
        text: "问账本：本周到期 / 命中率 / 哪条链最不确定 / 我的投影。",
      });
      return;
    }

    if (q.includes("起草")) {
      setAnswer({
        text:
          "草案：欧元区工资增速 → 服务业通胀 → 你的房租重定价。\n" +
          "来源：Eurostat 协商工资指数、ECB 会议纪要。\n" +
          "未确认，不会入库；登记后到期日 2027-03-31。",
        draft: true,
      });
      return;
    }

    if (q.includes("到期")) {
      setAnswer({
        text:
          due.length === 0
            ? "本周没有到期链条。下一批在 12 月 15 日。"
            : `本周 ${due.length} 条到期：\n${due
                .map(
                  (c, i) =>
                    `${i + 1}. ${c.title}（${c.due}，置信 ${pct(
                      c.confidence,
                    )}）`,
                )
                .join("\n")}`,
      });
      return;
    }

    if (q.includes("命中") || q.includes("校准")) {
      setAnswer({
        text: `90 天命中率 ${pct(
          rate,
          1,
        )}，已结算 ${recordsCount} 条。\n证据不足不计入分母，单独保留。`,
      });
      return;
    }

    if (q.includes("不确定")) {
      const c = [...visible].sort(
        (a, b) =>
          Math.abs(a.confidence - 0.5) - Math.abs(b.confidence - 0.5),
      )[0];
      setAnswer({
        text: c
          ? `最接近抛硬币的是「${c.title}」，置信 ${pct(
              c.confidence,
            )}，到期 ${c.due}。`
          : "没有在链。",
      });
      return;
    }

    if (q.includes("投影")) {
      const c = [...visible].sort(
        (a, b) =>
          b.impacts.reduce((n, v) => n + Math.abs(v), 0) -
          a.impacts.reduce((n, v) => n + Math.abs(v), 0),
      )[0];
      setAnswer({
        text: c
          ? `对当前坐标影响最强的是「${
              c.title
            }」，强度 ${c.impacts.join(
              " / ",
            )}（城市 / 行业 / 住房 / 家庭）。`
          : "没有在链。",
      });
      return;
    }

    setAnswer({
      text: "我只读取本地账本。可以问：本周到期 / 命中率 / 哪条链最不确定 / 我的投影。",
    });
  }

  useEffect(() => {
    if (!open) return;
    setAnswer(null);
    setQuery(seed ?? "");
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      if (seed) run(seed);
    }, 30);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay"
          role="presentation"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="问账本"
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <input
              ref={inputRef}
              className="palette-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") run(query);
              }}
              placeholder="问账本，例如：本周到期"
              aria-label="问账本"
            />

            <div className="palette-suggest">
              {[
                "本周到期",
                "命中率",
                "哪条链最不确定",
                "我的投影",
                "起草一条新链",
              ].map((s) => (
                <button key={s} type="button" onClick={() => run(s)}>
                  {s}
                </button>
              ))}
            </div>

            {answer ? (
              <div className="palette-answer">
                {answer.text}
                {answer.draft ? (
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        onRegisterDraft();
                        onClose();
                      }}
                    >
                      登记这条草案
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="palette-foot">
              <span className="local">
                <Icon name="lock" size={12} />
                只读本地账本 · 0 次网络请求
              </span>
              <span>Esc 关闭</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
