import { useState } from "react";
import {
  ArrowUpRight,
  Database,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import {
  alignmentSummary,
  alignmentVerdict,
  orderedSources,
  REGION_LABEL,
  type AlignmentSeries,
  type AlignmentSource,
} from "../core/alignment";
import { ALIGNMENT_SERIES } from "../data/alignment";
import { getSource } from "../data/sourceRegistry";
import {
  SOURCE_KIND_LABEL,
  SOURCE_KIND_HINT,
  isSingleSource,
} from "../core/source";
import type { Chain } from "../core/types";

function RegionCard({ source, unit }: { source: AlignmentSource; unit: string }) {
  const meta = getSource(source.sourceId);
  if (!meta) {
    return (
      <article className="region-card empty">
        <div className="region-head">
          <b>{REGION_LABEL[source.region]}</b>
          <span className="chip source-single">来源未登记</span>
        </div>
        <span className="region-note">{source.sourceId}</span>
      </article>
    );
  }

  return (
    <article className="region-card">
      <div className="region-head">
        <b>{REGION_LABEL[source.region]}</b>
        <span className="region-badges">
          <span className="chip">{meta.tier}</span>
          <span
            className={`chip source-kind ${meta.kind}`}
            title={SOURCE_KIND_HINT[meta.kind]}
          >
            {SOURCE_KIND_LABEL[meta.kind]}
          </span>
          {isSingleSource(meta.tier) ? (
            <span className="chip source-single">single-source</span>
          ) : null}
        </span>
      </div>
      <strong className="region-value num">{source.value}</strong>
      <span className="region-period">
        {source.period} · {unit}
      </span>
      <p>{source.definition}</p>
      {meta.url ? (
        <a className="region-source" href={meta.url} target="_blank" rel="noreferrer">
          <Database size={11} /> {meta.name}
        </a>
      ) : (
        <span className="region-source">
          <Database size={11} /> {meta.name}（样本，无公开链接）
        </span>
      )}
      <span className="source-meta">
        {meta.dataset}
        {meta.revision ? ` · ${meta.revision}` : ""}
      </span>
      <span className="source-meta">
        发布 {meta.publishedAt ?? "—"} · 抓取 {meta.retrievedAt}
      </span>
      {source.note ? <span className="region-note">{source.note}</span> : null}
    </article>
  );
}

export function AlignmentView({
  chains,
  onOpenChain,
}: {
  chains: Chain[];
  onOpenChain: (id: string) => void;
}) {
  const [selected, setSelected] = useState(ALIGNMENT_SERIES[0].id);
  const series: AlignmentSeries =
    ALIGNMENT_SERIES.find((item) => item.id === selected) ?? ALIGNMENT_SERIES[0];
  const verdict = alignmentVerdict(series);
  const summary = alignmentSummary(ALIGNMENT_SERIES);
  const sources = orderedSources(series);
  const related = (series.relatedChainIds ?? [])
    .map((id) => chains.find((chain) => chain.id === id))
    .filter((chain): chain is Chain => chain !== undefined);

  return (
    <div className="cockpit research">
      <div className="col-main">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Ruler size={15} /> 同一指标，三种口径
            </h2>
            <span className="count num">
              {summary.total} 组 · 快照 2026-11
            </span>
          </div>

          <div className="align-tabs" role="tablist" aria-label="选择指标">
            {ALIGNMENT_SERIES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === series.id}
                className={item.id === series.id ? "active" : ""}
                onClick={() => setSelected(item.id)}
              >
                <span className={`dot ${item.status === "direct" ? "positive" : item.status === "convert" ? "warning" : "negative"}`} />
                {item.metric}
              </button>
            ))}
          </div>

          <div className="align-detail">
            <div className="align-question">
              <div>
                <span className="mini-label">问题</span>
                <h3>{series.question}</h3>
              </div>
              <span className={`pill ${verdict.tone}`}>{verdict.label}</span>
            </div>

            <div className="align-regions">
              {sources.map((source, index) =>
                source ? (
                  <RegionCard key={source.region} source={source} unit={series.unit} />
                ) : (
                  <article className="region-card empty" key={`empty-${index}`}>
                    <b>{REGION_LABEL[(["CN", "US", "EU"] as const)[index]]}</b>
                    <span className="region-note">没有可用来源，不补 0。</span>
                  </article>
                ),
              )}
            </div>

            <div className="align-gap">
              <div>
                <span className="mini-label">差异在哪里</span>
                <p>{series.gap}</p>
              </div>
              <div>
                <span className="mini-label">怎么处理</span>
                <p>{series.rule}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <Database size={15} /> 全部指标
            </h2>
            <span className="count num">{summary.total} 组</span>
          </div>
          <div className="align-index">
            {ALIGNMENT_SERIES.map((item) => {
              const itemVerdict = alignmentVerdict(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === series.id ? "active" : ""}
                  onClick={() => setSelected(item.id)}
                >
                  <span className="align-index-metric">{item.metric}</span>
                  <span className={`pill ${itemVerdict.tone}`}>{itemVerdict.label}</span>
                  <span className="align-index-question">{item.question}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="col-side">
        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <ShieldCheck size={15} /> 三条规则
            </h2>
            <span className="count num">
              {summary.convert} 组需换算 · {summary.notComparable} 组不可比
            </span>
          </div>
          <ol className="rule-list">
            <li>
              <b>01</b>
              <p>不取平均。名称相同，不代表定义、样本、权重与基期相同。</p>
            </li>
            <li>
              <b>02</b>
              <p>冲突保留两个值。跨语言对齐后仍冲突的数字，不取平均。</p>
            </li>
            <li>
              <b>03</b>
              <p>数字只认 T1 / T2；单一 T3 来源标为 single-source，不进量化汇总。</p>
            </li>
          </ol>
          <p className="side-note">
            每张来源卡都标出发布页 / 数据集 / 门户 / 样本。门户只表示机构入口，
            没有精确文件页时不当作已核实到数字；抓取日期与发布日分开写。
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2 className="card-title">
              <ArrowUpRight size={15} /> 相关链
            </h2>
            <span className="count">{related.length}</span>
          </div>
          <div className="related-list">
            {related.length > 0 ? (
              related.map((chain) => (
                <button
                  key={chain.id}
                  type="button"
                  className="related-item"
                  onClick={() => onOpenChain(chain.id)}
                >
                  <span>{chain.title}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))
            ) : (
              <p className="side-empty">这条口径暂时没有关联链。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
