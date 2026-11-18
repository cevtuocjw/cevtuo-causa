import { useState } from "react";
import type { Household } from "../data/chains";

const FIELDS: {
  key: keyof Household;
  label: string;
  hint: string;
  integer?: boolean;
}[] = [
  { key: "income", label: "月收入", hint: "元 / 月" },
  { key: "fixed", label: "固定支出", hint: "元 / 月 · 不含房贷" },
  { key: "mortgage", label: "房贷", hint: "元 / 月" },
  { key: "liquid", label: "流动现金", hint: "元" },
  { key: "debt", label: "总负债", hint: "元" },
  { key: "dependents", label: "赡养 / 子女", hint: "人", integer: true },
];

const money = (n: number) => Math.round(n).toLocaleString("en-US");

export function HouseholdForm({
  value,
  billNote,
  onSave,
  onCancel,
}: {
  value: Household;
  billNote?: string;
  onSave: (next: Household) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<keyof Household, string>>({
    income: String(value.income),
    fixed: String(value.fixed),
    mortgage: String(value.mortgage),
    liquid: String(value.liquid),
    debt: String(value.debt),
    dependents: String(value.dependents),
  });
  const [error, setError] = useState<string | null>(null);

  const parsed = (key: keyof Household) => {
    const raw = draft[key].replace(/[,，\s]/g, "");
    if (raw === "") return Number.NaN;
    return Number(raw);
  };

  const numbers = FIELDS.map((f) => parsed(f.key));
  const valid = numbers.every(
    (n, i) =>
      Number.isFinite(n) &&
      n >= 0 &&
      (!FIELDS[i].integer || Number.isInteger(n)),
  );

  const income = parsed("income");
  const fixed = parsed("fixed");
  const mortgage = parsed("mortgage");
  const liquid = parsed("liquid");
  const monthlyOut = (Number.isFinite(fixed) ? fixed : 0) +
    (Number.isFinite(mortgage) ? mortgage : 0);
  const buffer = (Number.isFinite(income) ? income : 0) - monthlyOut;
  const dsr = Number.isFinite(income) && income > 0 ? mortgage / income : 0;
  const debt = parsed("debt");
  const debtToIncome =
    Number.isFinite(income) && income > 0 && Number.isFinite(debt)
      ? debt / (income * 12)
      : 0;
  const months = monthlyOut > 0 && Number.isFinite(liquid) ? liquid / monthlyOut : 0;

  function save() {
    if (!valid) {
      setError("请填写非负数字；“赡养 / 子女”必须是整数。");
      return;
    }
    const next = {} as Household;
    for (const f of FIELDS) next[f.key] = Math.round(parsed(f.key));
    onSave(next);
  }

  return (
    <>
      <p className="dialog-lead">
        {billNote ??
          "只填聚合数，不填逐笔流水。数据只存在本机；月缓冲、负债率与缓冲月数会立即重算。"}
      </p>
      <div className="household-form">
        {FIELDS.map((f) => (
          <label key={f.key}>
            <span>
              {f.label} <i>{f.hint}</i>
            </span>
            <input
              inputMode="decimal"
              value={draft[f.key]}
              onChange={(e) => {
                setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                setError(null);
              }}
              aria-label={f.label}
            />
          </label>
        ))}
      </div>
      <div className="household-preview">
        <div>
          <span>月缓冲</span>
          <b className="num">{money(buffer)}</b>
        </div>
        <div>
          <span>月供收入比</span>
          <b className="num">{(dsr * 100).toFixed(0)}%</b>
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
      {error ? <p className="household-error">{error}</p> : null}
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onCancel}>
          取消
        </button>
        <button type="button" className="btn btn-primary" onClick={save}>
          保存这 6 个数
        </button>
      </div>
    </>
  );
}
