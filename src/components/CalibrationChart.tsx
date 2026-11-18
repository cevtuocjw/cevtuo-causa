import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

export interface Bucket {
  label: string;
  count: number;
  decided: number;
  hitRate: number | null;
}

const W = 680;
const H = 180;
const X0 = 50;
const X1 = 660;
const Y0 = 145;
const Y1 = 20;

export function CalibrationChart({ buckets }: { buckets: Bucket[] }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-8%" });
  const reduce = useReducedMotion();

  const px = (i: number) => X0 + ((i + 0.5) / buckets.length) * (X1 - X0);
  const py = (v: number) => Y0 - v * (Y0 - Y1);

  const points = buckets.map((b, i) => ({
    x: px(i),
    y: b.hitRate == null ? null : py(b.hitRate),
    b,
  }));

  const line = points
    .filter((p) => p.y != null)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg
      ref={ref}
      className="graph"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="校准曲线：登记置信度与实际命中率的对照。"
    >
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line
            x1={X0}
            x2={X1}
            y1={py(v)}
            y2={py(v)}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          <text
            className="axis-label"
            x={X0 - 6}
            y={py(v) + 3}
            textAnchor="end"
          >
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}

      <line
        x1={X0}
        y1={Y0}
        x2={X1}
        y2={Y1}
        stroke="var(--border)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />

      {line ? (
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
      ) : null}

      {points.map((p, i) =>
        p.y == null ? null : (
          <motion.circle
            key={p.b.label}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill="var(--accent)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: inView || reduce ? 1 : 0 }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.24 }}
          />
        ),
      )}

      {points.map((p) => (
        <text
          key={`x-${p.b.label}`}
          className="axis-label"
          x={p.x}
          y={166}
          textAnchor="middle"
        >
          {p.b.label}
        </text>
      ))}
    </svg>
  );
}
