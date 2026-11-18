import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import type {
  Chain,
  ExposureTarget,
  Signpost,
  SignpostState,
  Source,
} from "../core/types";
import { validateChain } from "../core/validate";
import { canEditConfidence } from "../core/status";
import { addDays, formatDateOnly } from "../core/time";

const IMPACT_LABELS = ["城市", "行业", "住房", "家庭"] as const;
const EXPOSURE_LABELS: Record<ExposureTarget, string> = {
  income: "月收入",
  fixed: "固定支出",
  mortgage: "房贷",
  liquid: "流动现金",
  debt: "总负债",
};

interface Draft {
  title: string;
  event: string;
  mechanism: string;
  variable: string;
  projection: string;
  summary: string;
  counterfactual: string;
  confidence: string;
  openedAt: string;
  dueAt: string;
  signposts: Signpost[];
  sources: Source[];
  impacts: [string, string, string, string];
  exposureEnabled: boolean;
  exposureTarget: ExposureTarget;
  deltaPct: string;
  tags: string;
}

function newId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? Math.random().toString(36).slice(2)}`;
}

function blankSource(now: Date): Source {
  return { name: "", state: "ok", at: formatDateOnly(now) };
}

function blankSignpost(now: Date): Signpost {
  return {
    id: newId("sp"),
    label: "",
    value: "",
    target: "",
    state: "pending",
    source: "",
    at: formatDateOnly(now),
    history: [],
  };
}

function draftFrom(chain: Chain): Draft {
  return {
    title: chain.title,
    event: chain.event,
    mechanism: chain.mechanism.join("\n"),
    variable: chain.variable,
    projection: chain.projection,
    summary: chain.summary ?? "",
    counterfactual: chain.counterfactual,
    confidence: String(Math.round(chain.confidence * 100)),
    openedAt: chain.openedAt,
    dueAt: chain.dueAt,
    signposts: chain.signposts.map((s) => ({ ...s, history: s.history ?? [] })),
    sources: chain.sources.map((s) => ({ ...s })),
    impacts: chain.impacts.map((v) => String(v)) as Draft["impacts"],
    exposureEnabled: !!chain.exposure,
    exposureTarget: chain.exposure?.target ?? "income",
    deltaPct: chain.exposure ? String(chain.exposure.deltaPct) : "5",
    tags: chain.tags.join(" · "),
  };
}

function blankDraft(now: Date, id: string): Draft {
  const openedAt = formatDateOnly(now);
  return {
    title: "",
    event: "",
    mechanism: "",
    variable: "",
    projection: "",
    summary: "",
    counterfactual: "",
    confidence: "60",
    openedAt,
    dueAt: formatDateOnly(addDays(now, 30)),
    signposts: [blankSignpost(now)],
    sources: [blankSource(now)],
    impacts: ["0", "0", "0", "0"],
    exposureEnabled: false,
    exposureTarget: "income",
    deltaPct: "5",
    tags: "",
  };
}

export function ChainEditor({
  open,
  initial,
  now,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: Chain;
  now: Date;
  onClose: () => void;
  onSave: (chain: Chain, mode: "create" | "edit") => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => blankDraft(now, newId("chain")));
  const [chainId, setChainId] = useState(() => newId("chain"));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDraft(draftFrom(initial));
      setChainId(initial.id);
    } else {
      const id = newId("chain");
      setChainId(id);
      setDraft(blankDraft(now, id));
    }
    setErrors([]);
    // 只按“打开/切换链条”重置；now 每分钟变化，不能作为依赖，否则会清掉正在输入的内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const confidenceLocked =
    !!initial && !canEditConfidence(initial, now) && !initial.settledAt;

  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function updateSignpost(id: string, next: Partial<Signpost>) {
    setDraft((d) => ({
      ...d,
      signposts: d.signposts.map((s) => (s.id === id ? { ...s, ...next } : s)),
    }));
  }

  function updateSource(index: number, next: Partial<Source>) {
    setDraft((d) => ({
      ...d,
      sources: d.sources.map((s, i) => (i === index ? { ...s, ...next } : s)),
    }));
  }

  const mechanisms = useMemo(
    () => draft.mechanism.split("\n").map((s) => s.trim()).filter(Boolean),
    [draft.mechanism],
  );

  function buildChain(): Chain {
    const confidence = Number(draft.confidence) / 100;
    const impacts = draft.impacts.map((v) => Number(v)) as [
      number,
      number,
      number,
      number,
    ];
    const timestamp = now.toISOString();
    return {
      id: chainId,
      title: draft.title.trim(),
      event: draft.event.trim(),
      mechanism: mechanisms,
      variable: draft.variable.trim(),
      projection: draft.projection.trim(),
      summary: draft.summary.trim() || mechanisms.join(" → "),
      counterfactual: draft.counterfactual.trim(),
      confidence: Number.isFinite(confidence) ? confidence : NaN,
      openedAt: draft.openedAt,
      dueAt: draft.dueAt,
      signposts: draft.signposts.map((s) => ({
        ...s,
        label: s.label.trim(),
        value: s.value.trim(),
        target: s.target.trim(),
        source: s.source.trim(),
      })),
      sources: draft.sources.map((s) => ({ ...s, name: s.name.trim() })),
      impacts,
      exposure: draft.exposureEnabled
        ? {
            target: draft.exposureTarget,
            deltaPct: Number(draft.deltaPct),
          }
        : undefined,
      tags: draft.tags
        .split(/[·,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      origin: initial?.origin ?? "user",
      createdAt: initial?.createdAt ?? timestamp,
      updatedAt: timestamp,
      settledAt: initial?.settledAt,
      outcome: initial?.outcome,
      settleReason: initial?.settleReason,
    };
  }

  function submit() {
    const chain = buildChain();
    const found = validateChain(chain);
    setErrors(found);
    if (found.length === 0) onSave(chain, initial ? "edit" : "create");
  }

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
        >
          <motion.div
            className="dialog glass chain-editor"
            role="dialog"
            aria-modal="true"
            aria-label={initial ? "编辑链条" : "新建链条"}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <div className="dialog-head">
              <h2>{initial ? "编辑链条" : "新建链条"}</h2>
              <span className="pill">{initial ? "修改" : "本机"}</span>
            </div>

            <div className="chain-form">
              <section className="chain-section">
                <h3>1 · 主张</h3>
                <div className="form-grid">
                  <label className="form-wide">
                    <span>标题</span>
                    <input
                      value={draft.title}
                      onChange={(e) => patch("title", e.target.value)}
                      placeholder="一句话，两行内"
                    />
                  </label>
                  <label className="form-wide">
                    <span>触发事件</span>
                    <input
                      value={draft.event}
                      onChange={(e) => patch("event", e.target.value)}
                      placeholder="什么发生了"
                    />
                  </label>
                  <label className="form-wide">
                    <span>传导机制（每行一段，最多 3 段）</span>
                    <textarea
                      rows={3}
                      value={draft.mechanism}
                      onChange={(e) => patch("mechanism", e.target.value)}
                      placeholder="出口利润回升&#10;扩产决策滞后两个季度"
                    />
                  </label>
                  <label>
                    <span>被改变的变量</span>
                    <input
                      value={draft.variable}
                      onChange={(e) => patch("variable", e.target.value)}
                      placeholder="制造业招聘岗位"
                    />
                  </label>
                  <label>
                    <span>对你生活的投影</span>
                    <input
                      value={draft.projection}
                      onChange={(e) => patch("projection", e.target.value)}
                      placeholder="你的行业收入与跳槽窗口"
                    />
                  </label>
                  <label className="form-wide">
                    <span>一句话说明（可选）</span>
                    <input
                      value={draft.summary}
                      onChange={(e) => patch("summary", e.target.value)}
                      placeholder="留空则用传导机制拼接"
                    />
                  </label>
                </div>
              </section>

              <section className="chain-section">
                <h3>2 · 证据与到期</h3>
                <div className="form-grid">
                  <label className="form-wide">
                    <span>反事实（必填：什么情况下这条链不成立）</span>
                    <textarea
                      rows={3}
                      value={draft.counterfactual}
                      onChange={(e) => patch("counterfactual", e.target.value)}
                      placeholder="如果 12 月 PMI 新出口订单跌回 50 以下，这条链不成立"
                    />
                  </label>
                  <label>
                    <span>到期日</span>
                    <input
                      type="date"
                      value={draft.dueAt}
                      min={draft.openedAt}
                      onChange={(e) => patch("dueAt", e.target.value)}
                    />
                  </label>
                  <label>
                    <span>标签（用逗号分隔）</span>
                    <input
                      value={draft.tags}
                      onChange={(e) => patch("tags", e.target.value)}
                      placeholder="宏观 · 行业"
                    />
                  </label>
                </div>

                <div className="form-subhead">
                  <span>先行指标 1–3 个</span>
                  <button
                    type="button"
                    className="btn btn-mini"
                    disabled={draft.signposts.length >= 3}
                    onClick={() =>
                      patch("signposts", [...draft.signposts, blankSignpost(now)])
                    }
                  >
                    <Plus size={12} /> 加一个
                  </button>
                </div>
                {draft.signposts.map((s, index) => (
                  <div className="sp-card" key={s.id}>
                    <div className="sp-card-head">
                      <span>指标 {index + 1}</span>
                      <button
                        type="button"
                        className="icon-mini"
                        aria-label="删除指标"
                        disabled={draft.signposts.length <= 1}
                        onClick={() =>
                          patch(
                            "signposts",
                            draft.signposts.filter((x) => x.id !== s.id),
                          )
                        }
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="form-grid form-grid-3">
                      <label>
                        <span>名称</span>
                        <input
                          value={s.label}
                          onChange={(e) =>
                            updateSignpost(s.id, { label: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>当前值</span>
                        <input
                          value={s.value}
                          onChange={(e) =>
                            updateSignpost(s.id, { value: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>目标</span>
                        <input
                          value={s.target}
                          onChange={(e) =>
                            updateSignpost(s.id, { target: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>来源</span>
                        <input
                          value={s.source}
                          onChange={(e) =>
                            updateSignpost(s.id, { source: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>时间</span>
                        <input
                          type="date"
                          value={s.at}
                          onChange={(e) =>
                            updateSignpost(s.id, { at: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>状态</span>
                        <select
                          value={s.state}
                          onChange={(e) =>
                            updateSignpost(s.id, {
                              state: e.target.value as SignpostState,
                            })
                          }
                        >
                          <option value="on-track">正常</option>
                          <option value="reversed">反向</option>
                          <option value="pending">待定</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}

                <div className="form-subhead">
                  <span>来源 1–3 个</span>
                  <button
                    type="button"
                    className="btn btn-mini"
                    disabled={draft.sources.length >= 3}
                    onClick={() => patch("sources", [...draft.sources, blankSource(now)])}
                  >
                    <Plus size={12} /> 加一个
                  </button>
                </div>
                {draft.sources.map((s, index) => (
                  <div className="source-edit" key={index}>
                    <input
                      value={s.name}
                      onChange={(e) => updateSource(index, { name: e.target.value })}
                      placeholder="来源名称"
                      aria-label={`来源 ${index + 1}`}
                    />
                    <input
                      type="date"
                      value={s.at.slice(0, 10)}
                      onChange={(e) => updateSource(index, { at: e.target.value })}
                      aria-label={`来源 ${index + 1} 时间`}
                    />
                    <select
                      value={s.state}
                      onChange={(e) =>
                        updateSource(index, {
                          state: e.target.value === "stale" ? "stale" : "ok",
                        })
                      }
                      aria-label={`来源 ${index + 1} 状态`}
                    >
                      <option value="ok">正常</option>
                      <option value="stale">滞后</option>
                    </select>
                    <button
                      type="button"
                      className="icon-mini"
                      aria-label="删除来源"
                      disabled={draft.sources.length <= 1}
                      onClick={() =>
                        patch(
                          "sources",
                          draft.sources.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </section>

              <section className="chain-section">
                <h3>3 · 量化</h3>
                <div className="range-row">
                  <label>
                    <span>
                      置信度 <b className="num">{draft.confidence}%</b>
                      {confidenceLocked ? "（已锁定）" : ""}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={draft.confidence}
                      disabled={confidenceLocked}
                      onChange={(e) => patch("confidence", e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-grid form-grid-4">
                  {IMPACT_LABELS.map((label, i) => (
                    <label key={label}>
                      <span>{label}</span>
                      <input
                        type="number"
                        min={-2}
                        max={2}
                        step={0.5}
                        value={draft.impacts[i]}
                        onChange={(e) => {
                          const next = [...draft.impacts] as Draft["impacts"];
                          next[i] = e.target.value;
                          patch("impacts", next);
                        }}
                      />
                    </label>
                  ))}
                </div>

                <div className="exposure-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.exposureEnabled}
                      onChange={(e) => patch("exposureEnabled", e.target.checked)}
                    />
                    <span>这条链成立时，直接影响家庭的某个数</span>
                  </label>
                  {draft.exposureEnabled ? (
                    <>
                      <select
                        value={draft.exposureTarget}
                        onChange={(e) =>
                          patch("exposureTarget", e.target.value as ExposureTarget)
                        }
                        aria-label="家庭暴露目标"
                      >
                        {(Object.keys(EXPOSURE_LABELS) as ExposureTarget[]).map(
                          (key) => (
                            <option key={key} value={key}>
                              {EXPOSURE_LABELS[key]}
                            </option>
                          ),
                        )}
                      </select>
                      <label className="exposure-delta">
                        <span>变化 %</span>
                        <input
                          type="number"
                          min={-50}
                          max={50}
                          step={1}
                          value={draft.deltaPct}
                          onChange={(e) => patch("deltaPct", e.target.value)}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
                <p className="settle-note">
                  暴露是可选的。没有暴露时，优先级里的“个人相关度”会标为未设置，不编造数字。
                </p>
              </section>

              {errors.length ? (
                <ul className="form-error" role="alert">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn" onClick={onClose}>
                取消
              </button>
              <button type="button" className="btn btn-primary" onClick={submit}>
                {initial ? "保存修改" : "登记这条链"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
