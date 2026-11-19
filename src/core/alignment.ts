export type AlignmentStatus = "direct" | "convert" | "not_comparable";
export type Region = "CN" | "US" | "EU";
export type SourceTier = "T1" | "T2" | "T3";

export interface AlignmentSource {
  region: Region;
  name: string;
  tier: SourceTier;
  value: string;
  period: string;
  /** 这个地区实际统计的是什么。 */
  definition: string;
  note?: string;
}

export interface AlignmentSeries {
  id: string;
  metric: string;
  unit: string;
  frequency: string;
  status: AlignmentStatus;
  question: string;
  sources: AlignmentSource[];
  /** 一句话说清差异在哪里。 */
  gap: string;
  /** 可否合并成一个数；不能时给替代做法。 */
  rule: string;
  /** 可以跳转过去看的相关链条。 */
  relatedChainIds?: string[];
}

export const REGION_LABEL: Record<Region, string> = {
  CN: "中国",
  US: "美国",
  EU: "欧盟",
};

export const STATUS_LABEL: Record<AlignmentStatus, string> = {
  direct: "可直接比较",
  convert: "方向可比，水平不可直接平均",
  not_comparable: "不可直接比较",
};

export const STATUS_TONE: Record<AlignmentStatus, "positive" | "warning" | "negative"> = {
  direct: "positive",
  convert: "warning",
  not_comparable: "negative",
};

/**
 * 只有定义、口径、基期完全一致的序列才允许取平均。
 * 目前没有一组满足 direct；这个函数故意保留，避免未来把“看起来一样”当成“可以平均”。
 */
export function canAverage(series: AlignmentSeries): boolean {
  return series.status === "direct";
}

export function alignmentVerdict(series: AlignmentSeries): {
  label: string;
  tone: "positive" | "warning" | "negative";
  canAverage: boolean;
} {
  return {
    label: STATUS_LABEL[series.status],
    tone: STATUS_TONE[series.status],
    canAverage: canAverage(series),
  };
}

/** 三个地区都有来源，且地区不重复。 */
export function isFullySourced(series: AlignmentSeries): boolean {
  const regions = new Set(series.sources.map((source) => source.region));
  return series.sources.length === 3 && regions.size === 3;
}

export function alignmentSummary(series: readonly AlignmentSeries[]) {
  return series.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.status === "direct") acc.direct += 1;
      if (item.status === "convert") acc.convert += 1;
      if (item.status === "not_comparable") acc.notComparable += 1;
      return acc;
    },
    { total: 0, direct: 0, convert: 0, notComparable: 0 },
  );
}

/** 把同一指标的地区值排成 CN → US → EU，缺失的地区不补 0。 */
export function orderedSources(series: AlignmentSeries): Array<AlignmentSource | null> {
  return (["CN", "US", "EU"] as const).map(
    (region) => series.sources.find((source) => source.region === region) ?? null,
  );
}
