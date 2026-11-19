import type { AlignmentSeries } from "../core/alignment";

/**
 * 2026-11-19 核对过的公开数据快照，不是实时抓取。
 *
 * 来源的名称、URL、发布日期、数据集与修订都在 source-registry.json；
 * 这里只写 sourceId、期间与值。改来源去注册表，不要在这里复制 URL。
 *
 * 发布的数字优先于旧演示值：中国 10 月 PMI 是 49.3，不是旧稿里的 50.8；
 * 美国 ISM 10 月是 55.5，旧稿误用了 2025 年 10 月的 48.7。
 */
export const ALIGNMENT_SERIES: AlignmentSeries[] = [
  {
    id: "manufacturing-pmi",
    relatedChainIds: ["cny-export-hiring"],
    metric: "制造业 PMI",
    unit: "指数（50 = 荣枯线）",
    frequency: "月度",
    status: "convert",
    question: "都在说 50，三个 50 是同一个 50 吗？",
    gap:
      "中国是国家统计局约 3200 家制造企业的月度问卷，美国是 ISM 按行业 GDP 加权的采购经理调查，欧盟是 HCOB / S&P Global 覆盖 8 国约 3000 家企业的商业调查；样本、权重和季节调整不同。",
    rule: "只比较方向与连续月份，不把三个指数取平均；水平差异不能当成景气差。",
    sources: [
      {
        region: "CN",
        sourceId: "cn-pmi-nbs-2026-10",
        value: "49.3",
        period: "2026-10",
        definition: "制造业采购经理指数，覆盖制造业 31 个行业大类、约 3200 家调查样本。",
        note: "大型企业 50.2，中型 48.4，小型 47.5；生产 49.8，新订单 49.4。",
      },
      {
        region: "US",
        sourceId: "us-ism-pmi-2026-10",
        value: "55.5",
        period: "2026-10",
        definition: "供应管理协会对制造企业采购经理的月度调查，按行业 GDP 加权。",
        note: "新订单 55.5，生产 59.0；分项权重与 NBS 不同。",
      },
      {
        region: "EU",
        sourceId: "eu-hcob-pmi-2026-10",
        value: "52.7",
        period: "2026-10",
        definition: "欧元区制造业商业调查，按国家制造业增加值加权。",
        note: "覆盖 8 国约 3000 家企业；不含非欧元区欧盟成员。",
      },
    ],
  },
  {
    id: "cpi-yoy",
    relatedChainIds: ["fed-cut-mortgage"],
    metric: "CPI 同比",
    unit: "%（同比）",
    frequency: "月度",
    status: "convert",
    question: "通胀 3%，是同一篮子商品吗？",
    gap:
      "美国 CPI 含自住房等价租金（OER），欧盟 HICP 不含自住房，中国 CPI 的食品权重更高；三者篮子与权重都不一样。美国 2026-10 同比因上一年停摆缺基期未发布，只能用最近可比的 9 月值。",
    rule: "可以比较趋势与方向，不能把三国 CPI 直接平均成一个“全球通胀”。",
    sources: [
      {
        region: "CN",
        sourceId: "cn-cpi-nbs-2026-10",
        value: "+0.7%",
        period: "2026-10",
        definition: "居民消费价格指数，覆盖 8 大类、268 个基本分类。",
        note: "食品 −2.9%，非食品 +1.5%；基期轮换影响平均约 0.06 个百分点。",
      },
      {
        region: "US",
        sourceId: "us-bls-cpi-sep-2026",
        value: "+3.7%",
        period: "2026-09",
        definition: "城市消费者价格指数，含自住房等价租金。",
        note: "2026-10 同比未发布（2025-10 停摆缺数据）；10 月环比为 +0.4%。",
      },
      {
        region: "EU",
        sourceId: "eu-eurostat-hicp-2026-10",
        value: "+4.0%",
        period: "2026-10",
        definition: "调和消费者价格指数，不含自住房，按欧盟统一方法计算。",
        note: "能源同比 21.0%；HICP 与 CPI 不是同一个指数。",
      },
    ],
  },
  {
    id: "unemployment",
    relatedChainIds: ["cny-export-hiring"],
    metric: "失业率",
    unit: "%",
    frequency: "月度",
    status: "not_comparable",
    question: "5% 的失业率，统计的是同一批人吗？",
    gap:
      "中国是城镇调查失业率，美国是 Current Population Survey 的 U-3，欧盟是 Labour Force Survey 的调和失业率；覆盖范围、户口/居留与“正在找工作”的定义不同。",
    rule: "不取平均，也不做排名；只能在同一地区内部看趋势。",
    sources: [
      {
        region: "CN",
        sourceId: "cn-unemployment-nbs-2026-10",
        value: "5.1%",
        period: "2026-10",
        definition: "城镇常住人口中，16 岁及以上、有劳动能力、未工作但找工作的人。",
        note: "比上月下降 0.1 个百分点；30–59 岁主体人群为 3.9%。不含乡村。",
      },
      {
        region: "US",
        sourceId: "us-bls-employment-2026-10",
        value: "4.1%",
        period: "2026-10",
        definition: "civilian labor force 中失业但积极找工作的人。",
        note: "U-3 是媒体最常用口径；2025-10 因停摆缺数据。",
      },
      {
        region: "EU",
        sourceId: "eu-eurostat-unemployment-2026-09",
        value: "6.2%",
        period: "2026-09",
        definition: "按 ILO 定义、经欧盟调和的失业率。",
        note: "欧盟口径；欧元区为 6.5%。覆盖欧盟，不只看欧元区。",
      },
    ],
  },
  {
    id: "policy-rate",
    relatedChainIds: ["fed-cut-mortgage"],
    metric: "政策利率",
    unit: "%",
    frequency: "随会议",
    status: "not_comparable",
    question: "降息 25bp，降的是同一个东西吗？",
    gap:
      "中国自 2026-11-02 起把主要政策利率从 7 天逆回购切换到隔夜逆回购，美国看联邦基金目标区间，欧盟看存款便利利率；工具、期限与传导对象不同。",
    rule: "不把三个利率放进同一张“全球利率”曲线；只比较各自的变化方向。",
    sources: [
      {
        region: "CN",
        sourceId: "cn-pboc-omo",
        value: "1.25%",
        period: "2026-11-02 起",
        definition: "每个工作日固定利率、数量招标的隔夜逆回购操作利率。",
        note: "7 天逆回购 1.40% 改为择时启用的补充工具；LPR 另行公布。",
      },
      {
        region: "US",
        sourceId: "us-fed-fomc-2026-10-28",
        value: "3.75–4.00%",
        period: "2026-10-28",
        definition: "联邦基金利率目标区间。",
        note: "区间，不是一个点。",
      },
      {
        region: "EU",
        sourceId: "eu-ecb-decision-2026-10-29",
        value: "2.50%",
        period: "2026-10-29",
        definition: "欧元体系存款便利利率。",
        note: "不是再融资利率；主要再融资 2.65%，边际贷款 2.90%。",
      },
    ],
  },
  {
    id: "carbon-price",
    relatedChainIds: ["eu-cbam-fastener"],
    metric: "碳价",
    unit: "欧元 / 人民币每吨",
    frequency: "日度 / 月度",
    status: "not_comparable",
    question: "碳价 80 欧元，和 90 元人民币能比吗？",
    gap:
      "EU ETS 是配额市场，覆盖电力、重工业与航空；中国全国碳市场 2026 年起覆盖发电、钢铁、水泥、铝冶炼，价格仍受配额分配与政策区间影响；美国没有联邦碳价。",
    rule: "不直接换算比较；先看覆盖行业、配额松紧与是否允许跨期储存。",
    sources: [
      {
        region: "CN",
        sourceId: "cn-national-ets-daily",
        value: "¥91.31 / t",
        period: "2026-11-18",
        definition: "全国碳市场配额挂牌协议交易综合价格行情的收盘价。",
        note: "上海环境能源交易所发布；当日成交量 96.39 万吨。",
      },
      {
        region: "US",
        sourceId: "us-no-federal-carbon-price",
        value: "—",
        period: "2026-11-19",
        definition: "美国没有联邦层面的碳价；RGGI 与加州体系只覆盖部分州。",
        note: "空白不是 0。",
      },
      {
        region: "EU",
        sourceId: "eu-ets-eex-auction",
        value: "€87.15 / t",
        period: "2026-11-17",
        definition: "欧盟排放交易体系配额现货拍卖清算价。",
        note: "当日拍卖 279.15 万吨；EUA 期货结算价不是同一个数。",
      },
    ],
  },
  {
    id: "house-price",
    relatedChainIds: ["fed-cut-mortgage"],
    metric: "房价",
    unit: "%（环比 / 同比）",
    frequency: "月度 / 季度",
    status: "convert",
    question: "房价跌了，是同一个“房”吗？",
    gap:
      "中国 70 城指数以新建商品住宅为主，美国 Case-Shiller 覆盖现有独栋住宅且滞后两个月，欧盟 House Price Index 是季度、含新旧房；三者房型、频率与基期都不同。",
    rule: "只能比较方向与大致幅度，不能把月度、季度与不同房型混成一个同比。",
    sources: [
      {
        region: "CN",
        sourceId: "cn-70city-2026-10",
        value: "一线 0.0%",
        period: "2026-10 环比",
        definition: "70 个大中城市新建商品住宅销售价格指数，按一二三线拆分。",
        note: "二线 −0.1%、三线 −0.2%；70 城没有单一环比数，这里列一线值。以新房为主。",
      },
      {
        region: "US",
        sourceId: "us-case-shiller-2026-08",
        value: "+0.3%",
        period: "2026-08 环比",
        definition: "20 城现有独栋住宅价格指数，季节调整。",
        note: "同比 +2.7%；全国指数同比 +2.1%。不含新房与公寓。",
      },
      {
        region: "EU",
        sourceId: "eu-eurostat-hpi-2026-q2",
        value: "+1.2%",
        period: "2026-Q2 环比",
        definition: "欧盟房价指数，覆盖新房与现有住宅，未季调。",
        note: "同比 +4.7%；欧元区 +1.1% 环比 / +4.0% 同比。季度值不能当月度用。",
      },
    ],
  },
];
