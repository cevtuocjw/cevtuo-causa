import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Chain, Signpost } from "../data/chains";
import { datePos, pct, shortDate, TODAY, truncate } from "../lib/format";

const W = 720;
const H = 330;
const X = [56, 206, 356, 506, 656];
const Y = [180, 160, 180, 160, 180];

interface Point {
  x: number;
  y: number;
}

function smoothPath(points: Point[]): string {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i - 1];
    const c = points[i];
    const dx = (c.x - p.x) * 0.42;
    d += ` C ${p.x + dx} ${p.y}, ${c.x - dx} ${c.y}, ${c.x} ${c.y}`;
  }
  return d;
}

interface Hover {
  x: number;
  y: number;
  title: string;
  meta: string;
  value?: string;
}

function stateColor(state: Signpost["state"]): string {
  if (state === "on-track") return "var(--positive)";
  if (state === "reversed") return "var(--negative)";
  return "var(--warning)";
}

function shortEvent(chain: Chain): string {
  if (chain.event.includes("人民币")) return "汇率 7.35";
  if (chain.event.includes("CBAM")) return "CBAM 第二年";
  if (chain.event.includes("降息")) return "降息 25bp";
  if (chain.event.includes("消费券")) return "服务消费券";
  if (chain.event.includes("关税")) return "关税审查";
  if (chain.event.includes("资本开支")) return "AI 资本开支";
  if (chain.event.includes("数据法案")) return "数据法案";
  return truncate(chain.event, 6);
}

function shortProjection(chain: Chain): string {
  if (chain.projection.includes("收入")) return "你的收入";
  if (chain.projection.includes("订单")) return "你的订单";
  if (chain.projection.includes("现金流")) return "你的月供";
  if (chain.projection.includes("续租")) return "你的租金";
  if (chain.projection.includes("物流")) return "物流收入";
  if (chain.projection.includes("成本")) return "你的成本";
  if (chain.projection.includes("开支")) return "你的开支";
  return truncate(chain.projection, 6);
}

function stageData(chain: Chain) {
  return [
    {
      name: "事件",
      full: chain.event,
      label: shortEvent(chain),
      value: shortDate(chain.opened),
      meta: `登记于 ${chain.opened} · 置信 ${pct(chain.confidence)}`,
    },
    {
      name: "传导",
      full: chain.mechanism[0] ?? "—",
      label: truncate(chain.mechanism[0] ?? "—", 8),
      value: "机制 1",
      meta: `传导机制 1 / ${chain.mechanism.length}`,
    },
    {
      name: "传导",
      full: chain.mechanism[1] ?? "—",
      label: truncate(chain.mechanism[1] ?? "—", 8),
      value: "机制 2",
      meta: `传导机制 2 / ${chain.mechanism.length}`,
    },
    {
      name: "变量",
      full: chain.variable,
      label: truncate(chain.variable, 6),
      value: "被改变",
      meta: "这条链最终要改变的量",
    },
    {
      name: "投影",
      full: chain.projection,
      label: shortProjection(chain),
      value: "你的坐标",
      meta: chain.coordinates.join(" · "),
    },
  ];
}

export function ChainGraph({ chain }: { chain: Chain }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Hover | null>(null);
  const [hoverNode, setHoverNode] = useState<number | null>(null);
  const stages = stageData(chain);
  const path = smoothPath(X.map((x, i) => ({ x, y: Y[i] })));
  const todayX = X[0] + datePos(TODAY, chain.opened, chain.due) * (X[4] - X[0]);

  const start = Date.parse(chain.opened);
  const end = Date.parse(chain.due);
  const dates = [0, 1 / 3, 2 / 3, 1].map((t) =>
    new Date(start + (end - start) * t).toISOString().slice(0, 10),
  );

  const signposts = chain.signposts.slice(0, 3).map((s, i) => ({
    s,
    x: X[0] + [0.22, 0.5, 0.78][i] * (X[4] - X[0]),
    y: i === 1 ? 180 : 166,
  }));

  return (
    <div className="graph-wrap">
      <svg
        className="graph"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`因果链：${chain.event}，经过 ${chain.mechanism.join(
          "、",
        )}，改变 ${chain.variable}，投影到${chain.projection}。`}
      >
        {stages.map((s, i) => (
          <text
            key={`stage-${i}`}
            className="stage-name"
            x={X[i]}
            y={84}
            textAnchor="middle"
          >
            {s.name}
          </text>
        ))}

        {stages.map((s, i) => (
          <text
            key={`label-${i}`}
            className="node-label"
            x={X[i]}
            y={108}
            textAnchor="middle"
          >
            {s.label}
          </text>
        ))}

        {stages.map((s, i) => (
          <text
            key={`value-${i}`}
            className="node-value"
            x={X[i]}
            y={124}
            textAnchor="middle"
          >
            {s.value}
          </text>
        ))}

        <path className="chain-under" d={path} />
        <motion.path
          key={chain.id}
          className="chain-path"
          d={path}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        {stages.map((s, i) => (
          <g key={`node-${i}`}>
            <motion.circle
              className="node-ring"
              cx={X[i]}
              cy={Y[i]}
              initial={reduce ? false : { r: 0, opacity: 0 }}
              animate={{ r: hoverNode === i ? 8 : 6, opacity: 1 }}
              transition={{
                delay: 0.16 + i * 0.09,
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
            />
            <circle
              cx={X[i]}
              cy={Y[i]}
              r={hoverNode === i ? 2.6 : 2}
              fill="var(--accent)"
              style={{ transition: "r 120ms ease" }}
            />
            <circle
              cx={X[i]}
              cy={Y[i]}
              r={17}
              fill="transparent"
              onMouseEnter={() => {
                setHoverNode(i);
                setHover({
                  x: X[i],
                  y: Y[i],
                  title: s.full,
                  meta: s.meta,
                  value: s.value,
                });
              }}
              onMouseLeave={() => {
                setHoverNode(null);
                setHover(null);
              }}
              style={{ cursor: "crosshair" }}
            />
          </g>
        ))}

        {signposts.map(({ s, x, y }) => (
          <g key={s.id}>
            <line
              x1={x}
              y1={y + 5}
              x2={x}
              y2={206}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <circle
              cx={x}
              cy={y}
              r={3}
              fill={stateColor(s.state)}
              onMouseEnter={() =>
                setHover({
                  x,
                  y,
                  title: s.label,
                  meta: `${s.source} · ${s.at} · 目标 ${s.target}`,
                  value: s.value,
                })
              }
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "crosshair" }}
            />
            <text
              className="axis-label"
              x={x}
              y={220}
              textAnchor="middle"
              fill="var(--muted)"
            >
              {truncate(s.label, 7)}
            </text>
            <text
              className="axis-label"
              x={x}
              y={236}
              textAnchor="middle"
              fill={s.state === "reversed" ? "var(--negative)" : "var(--faint)"}
            >
              {s.value}
            </text>
          </g>
        ))}

        <line
          className="axis-line"
          x1={X[0]}
          y1={268}
          x2={X[4]}
          y2={268}
        />
        {dates.map((d, i) => {
          const x = X[0] + (i / 3) * (X[4] - X[0]);
          return (
            <g key={`tick-${i}`}>
              <line
                className="axis-line"
                x1={x}
                y1={268}
                x2={x}
                y2={274}
              />
              <text
                className="axis-label"
                x={x}
                y={290}
                textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"}
              >
                {shortDate(d)}
              </text>
            </g>
          );
        })}

        <line
          className="today-line"
          x1={todayX}
          y1={140}
          x2={todayX}
          y2={268}
        />
        <text
          className="axis-label"
          x={todayX - 4}
          y={308}
          textAnchor="end"
          fill="var(--accent)"
        >
          {`今天 ${shortDate(TODAY)}`}
        </text>

        <line
          className="due-line"
          x1={X[4]}
          y1={140}
          x2={X[4]}
          y2={268}
        />
      </svg>

      {hover ? (
        <div
          className="tooltip"
          style={{
            left: `${(hover.x / W) * 100}%`,
            top: `calc(${(hover.y / H) * 100}% - 10px)`,
          }}
        >
          <p className="tooltip-title">{hover.title}</p>
          {hover.value ? (
            <p className="tooltip-value">{hover.value}</p>
          ) : null}
          <p className="tooltip-meta">{hover.meta}</p>
        </div>
      ) : null}
    </div>
  );
}

export function ChainFlowMobile({ chain }: { chain: Chain }) {
  const reduce = useReducedMotion();
  const stages = stageData(chain);

  return (
    <div className="chain-mobile">
      {stages.map((s, i) => (
        <motion.div
          className="chain-mobile-row"
          key={`${chain.id}-${i}`}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.32 }}
        >
          <span className="chain-mobile-rail" aria-hidden="true">
            <i />
          </span>
          <div>
            <span className="chain-mobile-stage">{s.name}</span>
            <p className="chain-mobile-label">{s.full}</p>
            <span className="chain-mobile-value num">{s.value}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
