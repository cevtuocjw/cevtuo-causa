import { useState } from "react";
import {
  ArrowUpRight,
  Eye,
  GitBranch,
  HelpCircle,
  MapPin,
  Route,
} from "lucide-react";
import {
  CONFIDENCE_LABEL,
  STAGE_LABEL,
  STAGES,
  diffusionCounts,
  hasEvidence,
  sortByConfidence,
  splitSteps,
  stageIndex,
  type Confidence,
  type DiffusionStep,
} from "../core/diffusion";
import { DIFFUSION_CASES } from "../data/diffusion";
import { SOURCE_KIND_LABEL, SOURCE_KIND_HINT } from "../core/source";
import type { Chain } from "../core/types";

const CONFIDENCE_TONE: Record<Confidence, "positive" | "warning" | "negative"> = {
  high: "positive",
  medium: "warning",
  low: "negative",
};

function StepCard({ step }: { step: DiffusionStep }) {
  const evidence = hasEvidence(step);
  return (
    <article className={`diff-card ${step.status} ${evidence ? "" : "missing"}`}>
      <div className="diff-card-head">
        <span className="diff-region">
          <MapPin size={11} /> {step.region}
        </span>
        <span className="region-badges">
          <span
            className={`chip source-kind ${step.urlKind}`}
            title={SOURCE_KIND_HINT[step.urlKind]}
          >
            {SOURCE_KIND_LABEL[step.urlKind]}
          </span>
          <span className={`pill ${CONFIDENCE_TONE[step.confidence]}`}>
            {CONFIDENCE_LABEL[step.confidence]}置信
          </span>
        </span>
      </div>
      <div className="diff-stage">{STAGE_LABEL[step.stage]}</div>
      <div className="diff-window num">{step.window}</div>
      <p className="diff-trigger">{step.trigger}</p>
      <div className="diff-evidence">
        <span>证据</span>
        <p>
          <a href={step.url} target="_blank" rel="noreferrer">
            {step.evidence} ↗
          </a>
        </p>
        {step.docNumber ? (
          <span className="source-meta">{step.docNumber}</span>
        ) : null}
        <span className="source-meta">
          发布 {step.publishedAt ?? "—"} · 抓取 {step.retrievedAt}
        </span>
        {step.note ? <span className="source-meta">{step.note}</span> : null}
      </div>
    </article>
  );
}

export function DiffusionView({
  chains,
  onOpenChain,
}: {
  chains: Chain[];
  onOpenChain: (id: string) => void;
}) {
  const [selected, setSelected] = useState(DIFFUSION_CASES[0].id);
  const [confidence, setConfidence] = useState<"all" | Confidence>("all");
  const item =
    DIFFUSION_CASES.find((candidate) => candidate.id === selected) ??
    DIFFUSION_CASES[0];
  const counts = diffusionCounts(DIFFUSION_CASES);
  const split = splitSteps(item);
  const filter = (steps: DiffusionStep[]) =>
    confidence === "all"
      ? sortByConfidence(steps)
      : sortByConfidence(steps.filter((step) => step.confidence === confidence));
  const done = filter(split.done);
  const watching = filter(split.watching);
  const candidates = filter(split.candidates);
  const related = item.relatedChainId
    ? chains.find((chain) => chain.id === item.relatedChainId)
    : undefined;
  const current = stageIndex(item.currentStage);

  return (
    <div className="cockpit research">
      <div className="col-main">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Route size={15} /> 政策扩散路径
            </h2>
            <span className="count num">
              {counts.cases} 个政策 · {counts.done} 已发生 · {counts.watching} 观察中
            </span>
          </div>

          <div className="diff-cases" role="tablist" aria-label="选择政策">
            {DIFFUSION_CASES.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={candidate.id === item.id}
                className={candidate.id === item.id ? "active" : ""}
                onClick={() => setSelected(candidate.id)}
              >
                <span>{candidate.policy}</span>
                <em>{candidate.origin}</em>
              </button>
            ))}
          </div>

          <div className="diff-detail">
            <div className="diff-heading">
              <div>
                <span className="mini-label">当前案例</span>
                <h3>{item.policy}</h3>
                <p>{item.summary}</p>
              </div>
              <div className="diff-heading-meta">
                <span className="chip">更新 {item.updatedAt}</span>
                <span className="chip">当前：{STAGE_LABEL[item.currentStage]}</span>
              </div>
            </div>

            <div className="stage-rail" aria-label="政策阶段">
              {STAGES.map((stage, index) => (
                <div
                  key={stage}
                  className={`stage-node ${
                    index < current ? "past" : index === current ? "now" : "future"
                  }`}
                >
                  <span className="stage-index num">0{index + 1}</span>
                  <b>{STAGE_LABEL[stage]}</b>
                  <span className="stage-line" />
                </div>
              ))}
            </div>

            <div className="diff-tools">
              <span className="mini-label">置信度</span>
              <span className="seg" role="group" aria-label="按置信度筛选">
                {(["all", "high", "medium", "low"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={confidence === value ? "active" : ""}
                    onClick={() => setConfidence(value)}
                  >
                    {value === "all" ? "全部" : `${CONFIDENCE_LABEL[value]}置信`}
                  </button>
                ))}
              </span>
            </div>

            <div className="diff-board">
              <div className="diff-col">
                <div className="diff-col-head">
                  <span>已发生</span>
                  <b className="num">{done.length}</b>
                </div>
                {done.length > 0 ? (
                  done.map((step) => (
                    <StepCard key={`${step.region}-${step.stage}-${step.window}`} step={step} />
                  ))
                ) : (
                  <p className="side-empty">当前筛选下没有已发生步骤。</p>
                )}
              </div>
              <div className="diff-col">
                <div className="diff-col-head">
                  <span>观察中</span>
                  <b className="num">{watching.length}</b>
                </div>
                {watching.length > 0 ? (
                  watching.map((step) => (
                    <StepCard key={`${step.region}-${step.stage}-${step.window}`} step={step} />
                  ))
                ) : (
                  <p className="side-empty">当前筛选下没有观察项。</p>
                )}
              </div>
              <div className="diff-col">
                <div className="diff-col-head">
                  <span>可能下一站</span>
                  <b className="num">{candidates.length}</b>
                </div>
                {candidates.length > 0 ? (
                  candidates.map((step) => (
                    <StepCard key={`${step.region}-${step.stage}-${step.window}`} step={step} />
                  ))
                ) : (
                  <p className="side-empty">没有达到“候选”门槛的路径。</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="col-side">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <HelpCircle size={15} /> 判断规则
            </h2>
            <span className="count">情景不是预测</span>
          </div>
          <ol className="rule-list">
            <li>
              <b>01</b>
              <p>先有证据，才有阶段。没有官方文件或公告的路径，不进入观察中。</p>
            </li>
            <li>
              <b>02</b>
              <p>先有触发条件，才有时间窗。窗口是观察区间，不是承诺日期。</p>
            </li>
            <li>
              <b>03</b>
              <p>置信度不是概率。它只表示证据强度；低置信路径不会被当成结论。</p>
            </li>
          </ol>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Eye size={15} /> 观察面板
            </h2>
            <span className="count num">{split.candidates.length} 候选</span>
          </div>
          <div className="diff-summary">
            <div>
              <span>下一步数量</span>
              <b className="num">{split.watching.length + split.candidates.length}</b>
            </div>
            <div>
              <span>有证据 / 有触发</span>
              <b className="num">
                {item.steps.filter((step) => hasEvidence(step)).length} / {item.steps.length}
              </b>
            </div>
            <div>
              <span>关联链</span>
              <b>{related ? "1" : "0"}</b>
            </div>
          </div>
          {related ? (
            <button
              type="button"
              className="related-item"
              onClick={() => onOpenChain(related.id)}
            >
              <span>{related.title}</span>
              <ArrowUpRight size={13} />
            </button>
          ) : (
            <p className="side-empty">这个政策暂时没有关联链。</p>
          )}
          <p className="side-note">
            <GitBranch size={12} /> 扩散路径是本地静态资料，不是实时抓取。每步标出文件号、
            发布日期与抓取日期；“门户”表示精确文件页尚未定位。
          </p>
        </section>
      </div>
    </div>
  );
}
