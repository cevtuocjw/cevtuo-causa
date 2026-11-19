import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  Activity,
  ArrowDownRight,
  BarChart3,
  Check,
  Clock,
  Database,
  Gauge,
  HelpCircle,
  Info,
  Lock,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Smartphone,
  Target,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Chain, Household, Outcome } from "../data/chains";
import {
  BASE_RATE,
  FACTORS,
  LAG,
  PROJECTION,
  SOURCE_META,
  gradeFor,
  netImpact,
  priorityScore,
  signpostHit,
  sourceReliability,
} from "../data/chains";
import { SOURCE_KIND_LABEL } from "../core/source";
import { daysBetween, pct, signed, TODAY } from "../lib/format";

export function Tip({
  text,
  children,
  side = "top",
}: {
  text: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom";
}) {
  return (
    <span className={`tip-wrap tip-${side}`} title={text}>
      {children}
      <span className="tip" role="tooltip">
        {text}
      </span>
    </span>
  );
}

/* --------------------------------------------------------------- quant strip */

export function QuantStrip({ chain }: { chain: Chain }) {
  const dueDays = Math.max(0, daysBetween(TODAY, chain.due));
  const metrics = [
    {
      icon: Target,
      label: "置信度",
      value: pct(chain.confidence),
      note: "登记时冻结；到期前 72 小时不可改。",
    },
    {
      icon: Gauge,
      label: "合计影响",
      value: signed(Number(netImpact(chain).toFixed(1))),
      note: "四条坐标的合计强度，范围 −2…+2。",
    },
    {
      icon: Clock,
      label: "传导时滞",
      value: `${(LAG[chain.id] ?? 0).toFixed(1)}Q`,
      note: "同类链的历史中位传导时滞，单位：季度。",
    },
    {
      icon: Database,
      label: "历史基率",
      value: pct(BASE_RATE[chain.id] ?? 0),
      note: "同类链过去 24 个月的实际命中率。",
    },
    {
      icon: Activity,
      label: "先行指标",
      value: `${chain.signposts.filter((s) => s.state === "on-track").length}/${
        chain.signposts.length
      }`,
      note: `正常 / 全部。当前命中率 ${pct(signpostHit(chain))}。`,
    },
    {
      icon: ShieldBadge,
      label: "来源可信度",
      value: String(sourceReliability(chain)),
      note: "按来源层级、历史准确性与延迟加权，0–100。",
    },
    {
      icon: Zap,
      label: "优先级",
      value: String(priorityScore(chain)),
      note: "0.4×影响 + 0.3×置信 + 0.2×紧迫 + 0.1×个人相关。",
    },
    {
      icon: Clock,
      label: "到期",
      value: `${dueDays}d`,
      note: "距离结算日；到期后 7 天内必须判定。",
    },
  ];

  return (
    <div className="qstrip" role="list" aria-label="量化指标">
      {metrics.map((m) => (
        <Tip key={m.label} text={`${m.label} · ${m.note}`}>
          <div
            className="qmetric"
            role="listitem"
            aria-label={`${m.label} ${m.value}`}
          >
            <m.icon size={14} strokeWidth={1.7} />
            <span className="qval num">{m.value}</span>
          </div>
        </Tip>
      ))}
    </div>
  );
}

function ShieldBadge({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ waterfall */

export function FactorWaterfall({ chain }: { chain: Chain }) {
  const factors = FACTORS[chain.id] ?? [];
  const net = factors.reduce((n, f) => n + f.value, 0);
  let cum = 0;
  const rows = factors.map((f) => {
    const start = cum;
    cum += f.value;
    return { ...f, start, end: cum };
  });
  const min = Math.min(0, ...rows.map((r) => Math.min(r.start, r.end)));
  const max = Math.max(0, ...rows.map((r) => Math.max(r.start, r.end)));
  const span = max - min || 1;
  const x = (v: number) => ((v - min) / span) * 100;
  const zero = x(0);

  return (
    <div className="wf">
      <div className="panel-head">
        <span className="panel-title">
          <BarChart3 size={14} /> 因子拆解
        </span>
        <span className="panel-meta num">{signed(Number(net.toFixed(1)))}</span>
      </div>
      <div className="wf-body">
        {rows.map((r) => (
          <div className="wf-row" key={r.label}>
            <span className="wf-label">{r.label}</span>
            <div className="wf-track">
              <i className="wf-zero" style={{ left: `${zero}%` }} />
              <i
                className={r.value >= 0 ? "wf-bar pos" : "wf-bar neg"}
                style={{
                  left: `${x(Math.min(r.start, r.end))}%`,
                  width: `${Math.abs(x(r.end) - x(r.start))}%`,
                }}
              />
            </div>
            <Tip text={r.note}>
              <span className="wf-val num">{signed(r.value)}</span>
            </Tip>
          </div>
        ))}
        <div className="wf-row wf-net">
          <span className="wf-label">净影响</span>
          <div className="wf-track">
            <i className="wf-zero" style={{ left: `${zero}%` }} />
            <i
              className="wf-bar net"
              style={{
                left: `${x(Math.min(0, net))}%`,
                width: `${Math.abs(x(net) - zero)}%`,
              }}
            />
          </div>
          <span className="wf-val num">{signed(Number(net.toFixed(1)))}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ fan chart */

export function ProjectionFan({ chain }: { chain: Chain }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-8%" });
  const reduce = useReducedMotion();
  const values = PROJECTION[chain.id] ?? Array.from({ length: 13 }, () => 0);
  const W = 320;
  const H = 172;
  const L = 30;
  const R = 8;
  const T = 14;
  const B = 26;
  const max = Math.max(...values, 1.5) + 0.4;
  const min = Math.min(...values, 0) - 0.3;
  const x = (i: number) => L + (i / (values.length - 1)) * (W - L - R);
  const y = (v: number) => H - B - ((v - min) / (max - min)) * (H - T - B);

  const upper = values.map(
    (v, i) => `${x(i)},${y(v + 0.35 + i * 0.06)}`,
  );
  const lower = values
    .map((v, i) => `${x(i)},${y(v - 0.35 - i * 0.06)}`)
    .reverse();
  const band = `M ${upper.join(" L ")} L ${lower.join(" L ")} Z`;
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
    .join(" ");
  const last = values[values.length - 1];

  return (
    <div className="pf">
      <div className="panel-head">
        <span className="panel-title">
          <TrendingUp size={14} /> 12 个月投影
        </span>
        <span className="panel-meta num">目标 +1.5%</span>
      </div>
      <svg
        ref={ref}
        className="pf-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`12 个月投影，期末 ${last}%`}
      >
        {[0, 1.5].map((v) => (
          <g key={v}>
            <line
              x1={L}
              x2={W - R}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--rule)"
              strokeDasharray={v === 0 ? "0" : "2 3"}
            />
            <text className="axis-label" x={L - 5} y={y(v) + 3} textAnchor="end">
              {v}%
            </text>
          </g>
        ))}
        <path d={band} fill="var(--accent)" opacity={0.12} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: inView || reduce ? 1 : 0 }}
          transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle cx={x(values.length - 1)} cy={y(last)} r={2.5} fill="var(--accent)" />
        <text
          className="axis-label"
          x={x(values.length - 1)}
          y={y(last) - 7}
          textAnchor="end"
          fill="var(--accent)"
        >
          {`+${last}%`}
        </text>
        {[0, 6, 12].map((i) => (
          <text
            key={i}
            className="axis-label"
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === 12 ? "end" : "middle"}
          >
            {i === 0 ? "0" : `${i}M`}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------- priority queue */

export function PriorityQueue({
  chains,
  activeId,
  onSelect,
  onScore,
  canSettle,
  onCreate,
  statusOf,
}: {
  chains: Chain[];
  activeId: string;
  onSelect: (id: string) => void;
  onScore: (id: string, outcome: Outcome) => void;
  canSettle?: (id: string) => boolean;
  onCreate?: () => void;
  statusOf?: (id: string) => "locked" | "due" | "overdue" | null;
}) {
  const sorted = [...chains].sort((a, b) => priorityScore(b) - priorityScore(a));

  if (sorted.length === 0) {
    return (
      <div className="empty" style={{ margin: 16 }}>
        <strong>还没有在链</strong>
        写下第一条你愿意在到期日结算的判断。
        {onCreate ? (
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 12 }}
            onClick={onCreate}
          >
            新建链条
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="queue">
      {sorted.slice(0, 6).map((c, i) => {
        const score = priorityScore(c);
        const grade = gradeFor(score);
        return (
          <div
            className={`qrow ${c.id === activeId ? "active" : ""}`}
            key={c.id}
          >
            <button
              type="button"
              className="qmain"
              onClick={() => onSelect(c.id)}
              aria-pressed={c.id === activeId}
              title={c.title}
            >
              <span className="qrank num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="qtitle">{c.title}</span>
              <span className={`qgrade g-${grade}`}>{grade}</span>
              {statusOf?.(c.id) ? (
                <span className={`qstate ${statusOf(c.id)}`}>
                  {statusOf(c.id) === "overdue"
                    ? "逾期"
                    : statusOf(c.id) === "due"
                      ? "到期"
                      : "锁定"}
                </span>
              ) : null}
              <span className="qscore num">{score}</span>
            </button>
            <div className="qbar" aria-hidden="true">
              <i style={{ width: `${score}%` }} />
            </div>
            <div className="qactions">
              <Tip text={canSettle?.(c.id) === false ? "未到期，不能结算" : "成立"}>
                <button
                  type="button"
                  disabled={canSettle?.(c.id) === false}
                  onClick={() => onScore(c.id, "hit")}
                  aria-label="成立"
                >
                  <Check size={14} />
                </button>
              </Tip>
              <Tip text={canSettle?.(c.id) === false ? "未到期，不能结算" : "不成立"}>
                <button
                  type="button"
                  disabled={canSettle?.(c.id) === false}
                  onClick={() => onScore(c.id, "miss")}
                  aria-label="不成立"
                >
                  <X size={14} />
                </button>
              </Tip>
              <Tip
                text={canSettle?.(c.id) === false ? "未到期，不能结算" : "证据不足"}
              >
                <button
                  type="button"
                  disabled={canSettle?.(c.id) === false}
                  onClick={() => onScore(c.id, "insufficient")}
                  aria-label="证据不足"
                >
                  <HelpCircle size={14} />
                </button>
              </Tip>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- source matrix */

export function SourceMatrix({ chain }: { chain: Chain }) {
  const avg = sourceReliability(chain);
  return (
    <div className="smatrix">
      {chain.sources.map((s) => {
        const meta = SOURCE_META[s.name] ?? {
          tier: 5 as const,
          reliability: 60,
          latency: "—",
          kind: "sample" as const,
        };
        return (
          <div className="srow" key={s.name}>
            <Tip text={`Tier ${meta.tier} · 延迟 ${meta.latency} · ${SOURCE_KIND_LABEL[meta.kind]}`}>
              <span className={`stier t${meta.tier}`}>T{meta.tier}</span>
            </Tip>
            {meta.url ? (
              <a
                className="sname"
                href={meta.url}
                target="_blank"
                rel="noreferrer"
                title={meta.dataset ?? meta.note}
              >
                {s.name} ↗
              </a>
            ) : (
              <span className="sname" title={meta.note}>
                {s.name}
              </span>
            )}
            <div className="sbar" aria-hidden="true">
              <i style={{ width: `${meta.reliability}%` }} />
            </div>
            <span className="sval num">{meta.reliability}</span>
            <span className={`dot ${s.state === "stale" ? "pend" : "on"}`} />
          </div>
        );
      })}
      <div className="savg">
        <span>加权可信度</span>
        <span className="num">{avg}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- household */

function CashMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="cash-metric">
      <Icon size={13} strokeWidth={1.7} />
      <span className="cm-label">{label}</span>
      <b className="cm-value num">{value}</b>
    </div>
  );
}

export function CashflowPanel({
  household,
  onConnect,
  onEdit,
}: {
  household: Household;
  onConnect: () => void;
  onEdit: () => void;
}) {
  const buffer = household.income - household.fixed - household.mortgage;
  const dsr = household.income > 0 ? household.mortgage / household.income : 0;
  const debtToIncome =
    household.income > 0 ? household.debt / (household.income * 12) : 0;
  const months =
    household.fixed + household.mortgage > 0
      ? household.liquid / (household.fixed + household.mortgage)
      : 0;
  const money = (n: number) => Math.round(n).toLocaleString("en-US");

  return (
    <div className="cash">
      <div className="cash-grid">
        <CashMetric icon={Wallet} label="月收入" value={money(household.income)} />
        <CashMetric
          icon={ArrowDownRight}
          label="固定支出"
          value={money(household.fixed)}
        />
        <CashMetric
          icon={ArrowDownRight}
          label="房贷"
          value={money(household.mortgage)}
        />
        <CashMetric
          icon={Database}
          label="流动现金"
          value={money(household.liquid)}
        />
        <CashMetric
          icon={BarChart3}
          label="总负债"
          value={`${(household.debt / 10000).toFixed(0)}万`}
        />
        <CashMetric
          icon={Target}
          label="赡养 / 子女"
          value={String(household.dependents)}
        />
      </div>
      <div className="cash-ratios">
        <div>
          <span>月缓冲</span>
          <b className="num">{money(buffer)}</b>
        </div>
        <div>
          <span>月供收入比</span>
          <b className="num">{pct(dsr)}</b>
        </div>
        <div>
          <span>负债 / 年收入</span>
          <b className="num">{debtToIncome.toFixed(1)}×</b>
        </div>
        <div>
          <span>缓冲月数</span>
          <b className="num">{months.toFixed(1)}</b>
        </div>
      </div>
      <button type="button" className="pay-row" onClick={onConnect}>
        <Smartphone size={15} />
        <span>支付宝 / 微信支付</span>
        <span className="pill">未连接</span>
        <Lock size={13} className="lock" />
      </button>
      <button type="button" className="pay-row" onClick={onEdit}>
        <SlidersHorizontal size={15} />
        <span>手动校准 6 个数</span>
        <span className="pill">本地</span>
        <Lock size={13} className="lock" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- briefing */

export function BriefingStrip({
  due,
  reversed,
  rate,
  topScore,
}: {
  due: number;
  reversed: number;
  rate: number | null;
  topScore: number;
}) {
  return (
    <div className="brief">
      <span className="brief-item">
        <span className="dot on" />
        <b className="num">{due}</b> 到期
      </span>
      <span className="brief-item">
        <span className="dot rev" />
        <b className="num">{reversed}</b> 反向
      </span>
      <span className="brief-item">
        <Target size={12} />
        <b className="num">{rate == null ? "—" : pct(rate, 1)}</b> 命中
      </span>
      <span className="brief-item">
        <Zap size={12} />
        <b className="num">{topScore}</b> 最高
      </span>
      <Tip text="本周简报：先结算优先级最高的链条；长解释已收起，点击节点或悬停指标查看。">
        <button type="button" className="brief-info" aria-label="查看简报">
          <Info size={13} />
        </button>
      </Tip>
    </div>
  );
}

/* --------------------------------------------------------------- refresh panel */

export function RefreshPanel({
  cadence,
  lastRefresh,
  onRefresh,
  onClose,
}: {
  cadence: { label: string; value: string; note: string }[];
  lastRefresh: string;
  onRefresh: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="refresh-pop glass"
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      role="dialog"
      aria-label="更新节奏"
    >
      <div className="rp-head">
        <Clock size={14} />
        <span>更新节奏</span>
        <span className="rp-fresh num">{lastRefresh}</span>
      </div>
      {cadence.map((c) => (
        <div className="rp-row" key={c.label}>
          <span className="rp-label">{c.label}</span>
          <span className="rp-value num">{c.value}</span>
          <Tip text={c.note}>
            <Info size={12} />
          </Tip>
        </div>
      ))}
      <button type="button" className="rp-btn" onClick={onRefresh}>
        立即刷新
      </button>
      <button type="button" className="rp-close" onClick={onClose} aria-label="关闭">
        <X size={14} />
      </button>
    </motion.div>
  );
}

/* --------------------------------------------------------------- method card */

export function MethodCard({
  brier,
  eceValue,
  cover,
}: {
  brier: number | null;
  eceValue: number | null;
  cover: number;
}) {
  const rows: [string, string][] = [
    ["优先级", "0.4I+0.3C+0.2U+0.1R"],
    ["影响等级", "L1–L5 · 0–8"],
    ["Brier", brier == null ? "—" : brier.toFixed(3)],
    ["校准误差", eceValue == null ? "—" : eceValue.toFixed(3)],
    ["覆盖", pct(cover, 0)],
    ["事件流", "15 min"],
    ["统计", "T+31d"],
    ["校准日", "1M"],
    ["来源健康", "1h"],
  ];

  return (
    <div className="method">
      {rows.map(([k, v]) => (
        <div className="mrow" key={k}>
          <span>{k}</span>
          <b className="num">{v}</b>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- command bar */

export function CommandBar({
  onOpen,
  onRefresh,
  onFilter,
  onDraft,
}: {
  onOpen: () => void;
  onRefresh: () => void;
  onFilter: () => void;
  onDraft: () => void;
}) {
  return (
    <div className="cmdbar glass">
      <button type="button" className="cmd-main" onClick={onOpen} aria-label="问账本">
        <Search size={15} />
        <span className="cmd-hint">⌘K</span>
      </button>
      <span className="cmd-sep" />
      <Tip text="刷新">
        <button type="button" className="cmd-icon" onClick={onRefresh} aria-label="刷新">
          <RefreshCw size={15} />
        </button>
      </Tip>
      <Tip text="过滤">
        <button type="button" className="cmd-icon" onClick={onFilter} aria-label="过滤">
          <SlidersHorizontal size={15} />
        </button>
      </Tip>
      <Tip text="新增链条">
        <button type="button" className="cmd-icon" onClick={onDraft} aria-label="新增链条">
          <Plus size={15} />
        </button>
      </Tip>
    </div>
  );
}
