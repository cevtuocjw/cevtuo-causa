/**
 * 支付宝 / 微信账单 CSV 的本地解析。
 *
 * 只做“估算预填”：账单里能稳定拿到的是支出与房贷，收入/现金/负债不在账单里，
 * 所以这里绝不假装知道全部 6 个数。解析结果只用来预填表单，用户确认后才入库。
 */

export type BillKind = "mortgage" | "fixed" | "other";

export interface BillItem {
  month: string;
  amount: number;
  kind: BillKind;
  /** 商户 / 商品，仅用于当场复核，入库时只保留聚合值。 */
  label: string;
}

export interface BillSummary {
  source: "wechat" | "alipay" | "unknown";
  /** 参与统计的最近月份，YYYY-MM */
  months: string[];
  /** 有效支出行数 */
  rows: number;
  /** 被跳过的转账 / 还款 / 理财行数 */
  skipped: number;
  /** 最近几个月的月均支出（含房贷） */
  avgExpense: number;
  /** 月均房贷相关支出 */
  avgMortgage: number;
  /** 月均固定支出（房租、水电、物业、话费、保险等；不含房贷） */
  avgFixed: number;
  /** 逐笔支出，用于复核分类；最多 400 条。 */
  items: BillItem[];
}

const MORTGAGE = /房贷|住房贷款|按揭|公积金贷款/;
const FIXED =
  /房租|租金|物业|水费|电费|燃气|宽带|话费|保险|学费|幼儿园|托育|停车/;
const SKIP_STATUS = /失败|关闭|已撤销|已退款|退款成功/;
/** 转账、还款、理财申赎不是消费，计入月支出会系统性抬高估算。 */
const TRANSFER_TYPE = /转账|还款|理财|基金|证券|余额宝|零钱通|信用卡还款/;

/** 标准 CSV 字段解析，支持引号、逗号与转义引号。 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((s) => s.trim());
}

function money(raw: string): number {
  const cleaned = raw.replace(/[¥￥,，\s元]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function monthOf(raw: string): string | null {
  const m = raw.match(/(\d{4})[-/年](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

function findColumn(header: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const i = header.findIndex((h) => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

/**
 * 解析账单 CSV。没有可识别的表头或没有有效交易时返回 null。
 * 不做任何网络请求，也不读取文件以外的信息。
 */
export function parseBillCsv(text: string): BillSummary | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const headerIndex = lines.findIndex(
    (line) =>
      /交易时间|交易创建时间|交易日期/.test(line) && /金额/.test(line),
  );
  if (headerIndex < 0) return null;

  const header = splitCsvLine(lines[headerIndex]);
  const dateCol = findColumn(header, [/交易时间/, /交易创建时间/, /付款时间/]);
  const amountCol = findColumn(header, [/金额/, /amount/i]);
  const flowCol = findColumn(header, [/收\/支/, /收支/]);
  const statusCol = findColumn(header, [/当前状态/, /交易状态/, /状态/]);
  const typeCol = findColumn(header, [/交易类型/, /^类型$/]);
  const merchantCol = findColumn(header, [/交易对方/, /对方/, /商户/]);
  const productCol = findColumn(header, [/商品名称/, /商品/, /备注/]);
  if (dateCol < 0 || amountCol < 0) return null;

  const source: BillSummary["source"] = /微信/.test(text.slice(0, 500))
    ? "wechat"
    : /支付宝/.test(text.slice(0, 500))
      ? "alipay"
      : "unknown";

  const byMonth = new Map<
    string,
    { expense: number; mortgage: number; fixed: number }
  >();
  const items: BillItem[] = [];
  let rows = 0;
  let skipped = 0;

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw || raw.startsWith("-")) continue;
    const cells = splitCsvLine(raw);
    if (cells.length < Math.max(dateCol, amountCol) + 1) continue;

    const status = statusCol >= 0 ? cells[statusCol] ?? "" : "";
    if (SKIP_STATUS.test(status)) continue;

    const month = monthOf(cells[dateCol] ?? "");
    if (!month) continue;

    // 必须是精确的“支出 / 收入”；“不计收支”不能因为包含“支出”二字被算进去。
    const flow = flowCol >= 0 ? (cells[flowCol] ?? "").trim() : "";
    if (flow && flow !== "支出" && flow !== "收入") continue;
    if (flow === "收入") continue;

    const type = typeCol >= 0 ? (cells[typeCol] ?? "").trim() : "";
    if (TRANSFER_TYPE.test(type)) {
      skipped += 1;
      continue;
    }

    const amount = money(cells[amountCol] ?? "");
    if (amount <= 0) continue;

    const searchable = cells.join(" ");
    const kind: BillKind = MORTGAGE.test(searchable)
      ? "mortgage"
      : FIXED.test(searchable)
        ? "fixed"
        : "other";

    const entry = byMonth.get(month) ?? { expense: 0, mortgage: 0, fixed: 0 };
    entry.expense += amount;
    if (kind === "mortgage") entry.mortgage += amount;
    else if (kind === "fixed") entry.fixed += amount;
    byMonth.set(month, entry);
    rows += 1;

    if (items.length < 400) {
      const merchant = merchantCol >= 0 ? (cells[merchantCol] ?? "").trim() : "";
      const product = productCol >= 0 ? (cells[productCol] ?? "").trim() : "";
      const label = [merchant, product].filter(Boolean).join(" · ").slice(0, 60);
      items.push({ month, amount, kind, label: label || type || "未标注" });
    }
  }

  if (rows === 0) return null;

  const months = [...byMonth.keys()].sort().slice(-3);
  const total = months.reduce(
    (acc, m) => {
      const entry = byMonth.get(m)!;
      return {
        expense: acc.expense + entry.expense,
        mortgage: acc.mortgage + entry.mortgage,
        fixed: acc.fixed + entry.fixed,
      };
    },
    { expense: 0, mortgage: 0, fixed: 0 },
  );

  return {
    source,
    months,
    rows,
    skipped,
    avgExpense: Math.round(total.expense / months.length),
    avgMortgage: Math.round(total.mortgage / months.length),
    avgFixed: Math.round(total.fixed / months.length),
    items,
  };
}

/**
 * 用户在复核页改判分类后重算“月均房贷 / 月均固定支出”。
 * 月均总支出保持不变（它衡量的是消费规模，不随分类变化）。
 */
export function applyBillCategories(
  summary: BillSummary,
  kinds: BillKind[],
): BillSummary {
  const items = summary.items.map((item, index) => ({
    ...item,
    kind: kinds[index] ?? item.kind,
  }));
  const months = summary.months;
  const totals = new Map<string, { mortgage: number; fixed: number }>();
  for (const item of items) {
    const entry = totals.get(item.month) ?? { mortgage: 0, fixed: 0 };
    if (item.kind === "mortgage") entry.mortgage += item.amount;
    else if (item.kind === "fixed") entry.fixed += item.amount;
    totals.set(item.month, entry);
  }
  const sum = months.reduce(
    (acc, m) => {
      const entry = totals.get(m);
      return {
        mortgage: acc.mortgage + (entry?.mortgage ?? 0),
        fixed: acc.fixed + (entry?.fixed ?? 0),
      };
    },
    { mortgage: 0, fixed: 0 },
  );
  return {
    ...summary,
    items,
    avgMortgage: months.length ? Math.round(sum.mortgage / months.length) : 0,
    avgFixed: months.length ? Math.round(sum.fixed / months.length) : 0,
  };
}

/** 把常见编码的账单字节解成文本：UTF-8（含 BOM）优先，失败再按 GBK。 */
export function decodeBill(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("gbk").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}
