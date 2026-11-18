import { clamp, daysBetween, TODAY } from "../lib/format";

export type Outcome = "hit" | "miss" | "insufficient";
export type ChainStatus = "live" | "due" | "settled";
export type SignpostState = "on-track" | "reversed" | "pending";

export interface Signpost {
  id: string;
  label: string;
  value: string;
  target: string;
  state: SignpostState;
  source: string;
  at: string;
}

export interface Source {
  name: string;
  state: "ok" | "stale";
  at: string;
}

export interface Chain {
  id: string;
  title: string;
  event: string;
  mechanism: string[];
  variable: string;
  projection: string;
  coordinates: string[];
  confidence: number;
  opened: string;
  due: string;
  status: ChainStatus;
  summary: string;
  counterfactual: string;
  signposts: Signpost[];
  sources: Source[];
  impacts: [number, number, number, number];
  outcome?: Outcome;
}

export const impactLabels = ["城市", "行业", "住房", "家庭"] as const;

export interface Household {
  /** 元/月 */
  income: number;
  /** 元/月，不含房贷 */
  fixed: number;
  /** 元/月 */
  mortgage: number;
  /** 元 */
  liquid: number;
  /** 元 */
  debt: number;
  /** 人数 */
  dependents: number;
}

export const initialHousehold: Household = {
  income: 28000,
  fixed: 9400,
  mortgage: 11200,
  liquid: 86000,
  debt: 1260000,
  dependents: 2,
};

export const initialChains: Chain[] = [
  {
    id: "cny-export-hiring",
    title: "人民币走弱，正在改变珠三角制造业的招聘",
    event: "离岸人民币跌破 7.35",
    mechanism: ["出口订单利润回升", "扩产决策滞后两个季度"],
    variable: "制造业招聘岗位",
    projection: "你的行业收入与跳槽窗口",
    coordinates: ["珠三角", "制造业", "有房贷", "2 孩"],
    confidence: 0.62,
    opened: "2026-08-14",
    due: "2026-11-21",
    status: "due",
    summary:
      "汇率贬值先改善出口利润，再经过一到两个季度的扩产决策，才会传导到招聘。",
    counterfactual: "如果 12 月 PMI 新出口订单跌回 50 以下，这条链不成立。",
    signposts: [
      {
        id: "pmi",
        label: "PMI 新出口订单",
        value: "50.8",
        target: "≥ 50.0",
        state: "on-track",
        source: "国家统计局",
        at: "2026-10-31",
      },
      {
        id: "freight",
        label: "出口集装箱运价",
        value: "−4.2%",
        target: "环比不再下跌",
        state: "reversed",
        source: "上海航交所",
        at: "2026-11-14",
      },
      {
        id: "hiring",
        label: "制造业招聘岗位同比",
        value: "−1.8%",
        target: "转正",
        state: "pending",
        source: "招聘平台样本",
        at: "2026-11-17",
      },
    ],
    sources: [
      { name: "国家统计局", state: "ok", at: "2026-11-17 09:12" },
      { name: "上海航交所", state: "ok", at: "2026-11-17 09:14" },
      { name: "招聘平台样本", state: "stale", at: "2026-11-14 18:02" },
    ],
    impacts: [2, 2, -1, 0],
  },
  {
    id: "eu-cbam-fastener",
    title: "CBAM 过渡期核算，正在进入紧固件的报价",
    event: "欧盟 CBAM 过渡期进入第二年",
    mechanism: ["出口商补齐碳数据", "客户把碳成本压回报价"],
    variable: "紧固件出口毛利率",
    projection: "你所在工厂的订单与加班",
    coordinates: ["宁波", "金属制品", "无房贷", "1 孩"],
    confidence: 0.55,
    opened: "2026-07-02",
    due: "2026-11-19",
    status: "due",
    summary:
      "碳数据从合规文件变成报价项，客户先压价，再决定是否转移订单。",
    counterfactual: "如果欧委会把过渡期核算再延后一年，这条链的时点失效。",
    signposts: [
      {
        id: "ets",
        label: "欧盟碳价",
        value: "78.4 EUR",
        target: "≥ 75",
        state: "on-track",
        source: "EU ETS",
        at: "2026-11-15",
      },
      {
        id: "rfq",
        label: "客户询价次数",
        value: "+11%",
        target: "≥ +8%",
        state: "on-track",
        source: "客户邮件样本",
        at: "2026-11-12",
      },
      {
        id: "customs",
        label: "报关附加成本",
        value: "+2.3%",
        target: "≤ +2.0%",
        state: "reversed",
        source: "海关样本",
        at: "2026-11-10",
      },
    ],
    sources: [
      { name: "EU ETS", state: "ok", at: "2026-11-17 08:40" },
      { name: "海关样本", state: "ok", at: "2026-11-17 08:41" },
      { name: "客户邮件样本", state: "stale", at: "2026-11-12 20:10" },
    ],
    impacts: [0, 2, 1, 0],
  },
  {
    id: "fed-cut-mortgage",
    title: "降息预期，正在改写你的房贷重定价",
    event: "市场定价 12 月降息 25bp",
    mechanism: ["离岸资金成本下行", "银行加点收窄"],
    variable: "你的房贷月供",
    projection: "每月现金流与提前还款窗口",
    coordinates: ["深圳", "互联网", "有房贷", "1 孩"],
    confidence: 0.48,
    opened: "2026-09-20",
    due: "2026-11-22",
    status: "due",
    summary:
      "外部利率先动，LPR 与银行加点随后调整；重定价日决定你何时真正受益。",
    counterfactual: "如果 12 月点阵图显示不降息，加点收窄的窗口会推迟。",
    signposts: [
      {
        id: "ust",
        label: "10Y 美债",
        value: "4.18%",
        target: "≤ 4.20%",
        state: "on-track",
        source: "FRED",
        at: "2026-11-16",
      },
      {
        id: "lpr",
        label: "5Y LPR",
        value: "3.45%",
        target: "下调",
        state: "pending",
        source: "中国人民银行",
        at: "2026-11-20",
      },
      {
        id: "spread",
        label: "银行加点",
        value: "−10bp",
        target: "≤ −8bp",
        state: "on-track",
        source: "银行 App 样本",
        at: "2026-11-13",
      },
    ],
    sources: [
      { name: "FRED", state: "ok", at: "2026-11-17 07:10" },
      { name: "中国人民银行", state: "ok", at: "2026-11-17 07:12" },
      { name: "银行 App 样本", state: "stale", at: "2026-11-13 21:30" },
    ],
    impacts: [1, 0, 2, 1],
  },
  {
    id: "cn-service-vouchers",
    title: "服务消费券，正在抬高本地餐饮的租金",
    event: "三地发放服务消费券",
    mechanism: ["餐饮客流回升", "商铺续租议价变强"],
    variable: "你所在街区的商铺租金",
    projection: "如果你要续租或换店",
    coordinates: ["成都", "餐饮", "租铺", "2 孩"],
    confidence: 0.41,
    opened: "2026-10-08",
    due: "2026-12-15",
    status: "live",
    summary:
      "消费券先抬客流，再抬翻台率，最后才进入房东的续租报价。",
    counterfactual: "如果消费券核销率低于 40%，客流传导不成立。",
    signposts: [
      {
        id: "redemption",
        label: "消费券核销率",
        value: "46%",
        target: "≥ 40%",
        state: "on-track",
        source: "地方商务局",
        at: "2026-11-08",
      },
      {
        id: "traffic",
        label: "餐饮客流指数",
        value: "+6.1%",
        target: "≥ +5%",
        state: "on-track",
        source: "本地样本",
        at: "2026-11-12",
      },
    ],
    sources: [
      { name: "地方商务局", state: "ok", at: "2026-11-16 16:20" },
      { name: "本地样本", state: "ok", at: "2026-11-16 16:22" },
    ],
    impacts: [1, 2, 2, 0],
  },
  {
    id: "us-tariff-transship",
    title: "美国关税审查，正在改变转口贸易的港口就业",
    event: "美国对东南亚转口启动审查",
    mechanism: ["转口订单改道", "堆场与报关岗位波动"],
    variable: "港口相关岗位",
    projection: "你所在城市的物流收入",
    coordinates: ["青岛", "物流", "无房贷", "1 孩"],
    confidence: 0.37,
    opened: "2026-09-01",
    due: "2027-01-15",
    status: "live",
    summary:
      "审查先改变航线，再改变堆场周转，最后才反映到岗位与加班。",
    counterfactual: "如果审查范围只限光伏，转口改道不会外溢到通用货类。",
    signposts: [
      {
        id: "reroute",
        label: "改道船舶数",
        value: "12",
        target: "≥ 10",
        state: "on-track",
        source: "港口挂靠样本",
        at: "2026-11-11",
      },
      {
        id: "yard",
        label: "堆场周转天数",
        value: "4.6",
        target: "≤ 5.0",
        state: "on-track",
        source: "港口样本",
        at: "2026-11-11",
      },
    ],
    sources: [
      { name: "港口挂靠样本", state: "ok", at: "2026-11-16 11:05" },
      { name: "港口样本", state: "stale", at: "2026-11-10 19:44" },
    ],
    impacts: [0, 1, 0, 1],
  },
  {
    id: "ai-capex-grid",
    title: "AI 数据中心资本开支，正在进入本地工业电价",
    event: "两大云厂商上调资本开支",
    mechanism: ["数据中心用电需求", "电网扩容与峰谷价差"],
    variable: "工业电价",
    projection: "你工厂的固定成本",
    coordinates: ["苏州", "电子制造", "有房贷", "2 孩"],
    confidence: 0.44,
    opened: "2026-06-18",
    due: "2027-01-30",
    status: "live",
    summary:
      "资本开支先变成用电报装，再变成峰谷价差；工业电价通常滞后两个季度。",
    counterfactual: "如果地方电网扩容提前完成，峰谷价差不会扩大。",
    signposts: [
      {
        id: "capex",
        label: "云厂商资本开支同比",
        value: "+28%",
        target: "≥ +20%",
        state: "on-track",
        source: "公司财报",
        at: "2026-11-02",
      },
      {
        id: "peak",
        label: "峰谷价差",
        value: "0.31 元",
        target: "≥ 0.30",
        state: "on-track",
        source: "地方电网",
        at: "2026-11-09",
      },
    ],
    sources: [
      { name: "公司财报", state: "ok", at: "2026-11-15 22:10" },
      { name: "地方电网", state: "ok", at: "2026-11-15 22:12" },
    ],
    impacts: [0, 2, 1, 1],
  },
  {
    id: "eu-data-act",
    title: "欧盟数据法案，正在改变云服务的订阅成本",
    event: "欧盟数据法案切换条款生效",
    mechanism: ["云厂商迁移成本上升", "订阅价格重估"],
    variable: "你的软件订阅支出",
    projection: "小团队的固定开支",
    coordinates: ["远程", "设计工作室", "无房贷", "1 孩"],
    confidence: 0.33,
    opened: "2026-08-30",
    due: "2027-02-28",
    status: "live",
    summary:
      "切换条款先抬高迁移成本，再进入企业报价；对小团队的影响通常延迟一年。",
    counterfactual: "如果云厂商选择吸收迁移成本，订阅价格不会变。",
    signposts: [
      {
        id: "egress",
        label: "出网费用变化",
        value: "+3%",
        target: "≥ +2%",
        state: "on-track",
        source: "云厂商价目",
        at: "2026-11-06",
      },
      {
        id: "switch",
        label: "切换条款生效州",
        value: "9 / 27",
        target: "≥ 9",
        state: "on-track",
        source: "欧盟公报",
        at: "2026-11-01",
      },
    ],
    sources: [
      { name: "云厂商价目", state: "ok", at: "2026-11-16 09:30" },
      { name: "欧盟公报", state: "ok", at: "2026-11-16 09:31" },
    ],
    impacts: [0, 0, 0, 1],
  },
];

export const initialRecords: { confidence: number; outcome: Outcome }[] = [
  { confidence: 0.82, outcome: "hit" },
  { confidence: 0.78, outcome: "hit" },
  { confidence: 0.74, outcome: "hit" },
  { confidence: 0.71, outcome: "hit" },
  { confidence: 0.68, outcome: "hit" },
  { confidence: 0.66, outcome: "miss" },
  { confidence: 0.64, outcome: "hit" },
  { confidence: 0.61, outcome: "hit" },
  { confidence: 0.59, outcome: "hit" },
  { confidence: 0.57, outcome: "miss" },
  { confidence: 0.55, outcome: "hit" },
  { confidence: 0.54, outcome: "insufficient" },
  { confidence: 0.52, outcome: "miss" },
  { confidence: 0.51, outcome: "hit" },
  { confidence: 0.49, outcome: "miss" },
  { confidence: 0.47, outcome: "hit" },
  { confidence: 0.45, outcome: "miss" },
  { confidence: 0.43, outcome: "insufficient" },
  { confidence: 0.41, outcome: "hit" },
  { confidence: 0.38, outcome: "miss" },
  { confidence: 0.35, outcome: "insufficient" },
  { confidence: 0.31, outcome: "hit" },
  { confidence: 0.27, outcome: "miss" },
];

export function hitRate(records: { outcome: Outcome }[]): number {
  const hit = records.filter((r) => r.outcome === "hit").length;
  const miss = records.filter((r) => r.outcome === "miss").length;
  return hit + miss === 0 ? 0 : hit / (hit + miss);
}

export const calibrationBuckets = [
  { label: "40–50", min: 0.4, max: 0.5 },
  { label: "50–60", min: 0.5, max: 0.6 },
  { label: "60–70", min: 0.6, max: 0.7 },
  { label: "70–80", min: 0.7, max: 0.8 },
  { label: "80–90", min: 0.8, max: 0.9 },
];

export function calibration(records: { confidence: number; outcome: Outcome }[]) {
  return calibrationBuckets.map((b) => {
    const rows = records.filter(
      (r) => r.confidence >= b.min && r.confidence < b.max,
    );
    const decided = rows.filter((r) => r.outcome !== "insufficient");
    const hits = decided.filter((r) => r.outcome === "hit").length;
    return {
      label: b.label,
      mid: (b.min + b.max) / 2,
      count: rows.length,
      decided: decided.length,
      hitRate: decided.length === 0 ? null : hits / decided.length,
    };
  });
}

// 断言：分桶计数之和必须等于已结算总数
const bucketTotal = calibration(initialRecords).reduce((n, b) => n + b.count, 0);
console.assert(
  bucketTotal === initialRecords.length,
  `calibration buckets sum ${bucketTotal} != records ${initialRecords.length}`,
);

/* ------------------------------------------------------------------ quant */

export const LAG: Record<string, number> = {
  "cny-export-hiring": 2.1,
  "eu-cbam-fastener": 1.4,
  "fed-cut-mortgage": 0.8,
  "cn-service-vouchers": 1.2,
  "us-tariff-transship": 2.4,
  "ai-capex-grid": 2.0,
  "eu-data-act": 3.0,
  "draft-eu-wages": 2.3,
};

export const BASE_RATE: Record<string, number> = {
  "cny-export-hiring": 0.58,
  "eu-cbam-fastener": 0.52,
  "fed-cut-mortgage": 0.47,
  "cn-service-vouchers": 0.44,
  "us-tariff-transship": 0.41,
  "ai-capex-grid": 0.39,
  "eu-data-act": 0.36,
  "draft-eu-wages": 0.45,
};

export const FACTORS: Record<
  string,
  { label: string; value: number; note: string }[]
> = {
  "cny-export-hiring": [
    { label: "汇率", value: 1.8, note: "离岸人民币 −2.1%，出口利润弹性 0.86" },
    { label: "订单", value: 0.9, note: "新出口订单 50.8，连续两月高于荣枯线" },
    { label: "扩产", value: -0.3, note: "企业扩产决策滞后 2.1 个季度" },
    { label: "招聘", value: -0.2, note: "招聘岗位同比仍为 −1.8%" },
  ],
  "eu-cbam-fastener": [
    { label: "碳价", value: 0.6, note: "EU ETS 78.4 欧元，高于触发线 75" },
    { label: "询价", value: 0.8, note: "客户询价 +11%，碳数据成为报价项" },
    { label: "报关", value: -0.7, note: "报关附加成本 +2.3%，高于目标 2.0%" },
    { label: "毛利", value: -0.4, note: "碳成本被客户压回，毛利率承压" },
  ],
  "fed-cut-mortgage": [
    { label: "美债", value: 0.5, note: "10Y 美债 4.18%，低于触发线 4.20%" },
    { label: "LPR", value: 0.2, note: "5Y LPR 3.45%，尚未下调" },
    { label: "加点", value: 0.4, note: "银行加点 −10bp，低于目标 −8bp" },
    { label: "重定价", value: -0.1, note: "重定价日未到，月供暂不变" },
  ],
  "cn-service-vouchers": [
    { label: "核销", value: 0.7, note: "消费券核销率 46%，高于目标 40%" },
    { label: "客流", value: 0.5, note: "餐饮客流 +6.1%，连续三周为正" },
    { label: "续租", value: 0.4, note: "续租议价周期缩短至 21 天" },
    { label: "空置", value: -0.2, note: "街区空置率仍为 8.4%" },
  ],
  "us-tariff-transship": [
    { label: "改道", value: 0.6, note: "改道船舶 12 艘，高于触发线 10" },
    { label: "堆场", value: 0.3, note: "堆场周转 4.6 天，低于目标 5.0" },
    { label: "报关", value: -0.2, note: "报关岗位尚未放量" },
    { label: "岗位", value: 0.1, note: "港口岗位同比 +0.1%" },
  ],
  "ai-capex-grid": [
    { label: "资本", value: 0.9, note: "云厂商资本开支同比 +28%" },
    { label: "报装", value: 0.5, note: "数据中心用电报装 +19%" },
    { label: "扩容", value: -0.4, note: "地方电网扩容提前一个季度" },
    { label: "电价", value: 0.3, note: "峰谷价差 0.31 元，高于触发线 0.30" },
  ],
  "eu-data-act": [
    { label: "迁移", value: 0.4, note: "出网费用 +3%，高于触发线 2%" },
    { label: "订阅", value: 0.3, note: "企业订阅报价重估中" },
    { label: "竞争", value: -0.2, note: "云厂商选择吸收部分迁移成本" },
    { label: "成本", value: 0.1, note: "小团队固定开支 +0.1%" },
  ],
  "draft-eu-wages": [
    { label: "工资", value: 0.6, note: "协商工资同比 4.1%" },
    { label: "服务", value: 0.4, note: "服务业通胀黏性 3.2%" },
    { label: "续租", value: 0.3, note: "续租周期 2.3 个季度" },
    { label: "需求", value: -0.2, note: "实际收入增速仍为负" },
  ],
};

export const PROJECTION: Record<string, number[]> = {
  "cny-export-hiring": [0, -0.4, -0.6, -0.3, 0.1, 0.6, 1.0, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9],
  "eu-cbam-fastener": [0, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4, 0.4, 0.5, 0.5, 0.6, 0.6, 0.7],
  "fed-cut-mortgage": [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 1.1, 1.2],
  "cn-service-vouchers": [0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.2, 1.3, 1.4],
  "us-tariff-transship": [0, 0.1, 0.2, 0.2, 0.3, 0.3, 0.4, 0.5, 0.5, 0.6, 0.6, 0.7, 0.8],
  "ai-capex-grid": [0, 0.1, 0.3, 0.5, 0.7, 0.8, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
  "eu-data-act": [0, 0.0, 0.1, 0.1, 0.2, 0.3, 0.3, 0.4, 0.5, 0.5, 0.6, 0.6, 0.7],
  "draft-eu-wages": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2],
};

export interface SourceMeta {
  tier: 1 | 2 | 3 | 4 | 5;
  reliability: number;
  latency: string;
}

export const SOURCE_META: Record<string, SourceMeta> = {
  国家统计局: { tier: 1, reliability: 98, latency: "T+31d" },
  上海航交所: { tier: 1, reliability: 95, latency: "T+1d" },
  招聘平台样本: { tier: 5, reliability: 62, latency: "T+1d" },
  "EU ETS": { tier: 1, reliability: 97, latency: "T+1d" },
  海关样本: { tier: 1, reliability: 96, latency: "T+1d" },
  客户邮件样本: { tier: 5, reliability: 55, latency: "T+7d" },
  FRED: { tier: 1, reliability: 99, latency: "T+1d" },
  中国人民银行: { tier: 1, reliability: 98, latency: "T+0d" },
  "银行 App 样本": { tier: 4, reliability: 70, latency: "T+3d" },
  地方商务局: { tier: 1, reliability: 95, latency: "T+7d" },
  本地样本: { tier: 5, reliability: 60, latency: "T+3d" },
  港口挂靠样本: { tier: 5, reliability: 65, latency: "T+2d" },
  港口样本: { tier: 4, reliability: 72, latency: "T+2d" },
  公司财报: { tier: 2, reliability: 94, latency: "T+45d" },
  地方电网: { tier: 1, reliability: 92, latency: "T+7d" },
  云厂商价目: { tier: 2, reliability: 90, latency: "T+1d" },
  欧盟公报: { tier: 1, reliability: 98, latency: "T+0d" },
  Eurostat: { tier: 1, reliability: 98, latency: "T+30d" },
};

export const CADENCE = [
  { label: "事件流", value: "15 min", note: "只在先行指标变化时通知" },
  { label: "官方统计", value: "发布日历 + 2h", note: "发布后两小时复查修订" },
  { label: "链条复核", value: "每日 06:00", note: "置信度冻结，仅更新证据" },
  { label: "校准", value: "每月 1 日", note: "重算 Brier / ECE" },
  { label: "全量重建", value: "每日 03:00", note: "离线快照，不阻塞界面" },
  { label: "来源健康", value: "每小时", note: "延迟、失败、修订" },
];

export function netImpact(chain: Chain): number {
  return (FACTORS[chain.id] ?? []).reduce((n, f) => n + f.value, 0);
}

export function priorityScore(chain: Chain): number {
  const impact = Math.min(
    1,
    chain.impacts.reduce((n, v) => n + Math.abs(v), 0) / 4,
  );
  const urgency = clamp(1 - daysBetween(TODAY, chain.due) / 30, 0, 1);
  const relevance = 0.8;
  const score =
    100 *
    (0.4 * impact + 0.3 * chain.confidence + 0.2 * urgency + 0.1 * relevance);
  return Math.round(clamp(score, 0, 100));
}

export function gradeFor(score: number): "S" | "A" | "B" | "C" {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  return "C";
}

export function impactLevel(chain: Chain): 1 | 2 | 3 | 4 | 5 {
  const sum = chain.impacts.reduce((n, v) => n + Math.abs(v), 0);
  if (sum >= 6) return 5;
  if (sum >= 4) return 4;
  if (sum >= 3) return 3;
  if (sum >= 2) return 2;
  return 1;
}

export function signpostHit(chain: Chain): number {
  if (chain.signposts.length === 0) return 0;
  return (
    chain.signposts.filter((s) => s.state === "on-track").length /
    chain.signposts.length
  );
}

export function sourceReliability(chain: Chain): number {
  if (chain.sources.length === 0) return 0;
  const total = chain.sources.reduce(
    (n, s) => n + (SOURCE_META[s.name]?.reliability ?? 60),
    0,
  );
  return Math.round(total / chain.sources.length);
}

export function brierScore(records: { confidence: number; outcome: Outcome }[]): number {
  const decided = records.filter((r) => r.outcome !== "insufficient");
  if (decided.length === 0) return 0;
  return (
    decided.reduce(
      (n, r) =>
        n + Math.pow(r.confidence - (r.outcome === "hit" ? 1 : 0), 2),
      0,
    ) / decided.length
  );
}

export function ece(records: { confidence: number; outcome: Outcome }[]): number {
  const buckets = calibration(records);
  const total = buckets.reduce((n, b) => n + b.decided, 0);
  if (total === 0) return 0;
  return buckets.reduce((n, b) => {
    if (b.decided === 0 || b.hitRate == null) return n;
    return n + (b.decided / total) * Math.abs(b.hitRate - b.mid);
  }, 0);
}

export function coverage(chains: Chain[]): number {
  if (chains.length === 0) return 0;
  const covered = chains.filter((c) =>
    c.sources.some((s) => (SOURCE_META[s.name]?.tier ?? 5) <= 2),
  ).length;
  return covered / chains.length;
}
