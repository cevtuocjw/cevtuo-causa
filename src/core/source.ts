/**
 * 来源元数据的共同约定。
 *
 * 只有四类“可核对”的来源才允许进入量化汇总：
 *   release  精确发布页（含发布日期）
 *   dataset  数据集/表号页（可取到同一个月度值）
 *   document 法规、公告、文件原文
 *   portal   机构门户；编号指向的文件还没落到可引用页面
 *
 * 第五类 sample 是内部样本或演示占位：没有公开链接，
 * 必须由 note 说明来源与口径，不能标记成 T1/T2。
 *
 * retrievedAt 是“我们最后一次打开并核对这个页面”的日期，
 * 不是数据期间，也不是发布日期。三者分开写，避免把抓取时间当成发布日。
 */
export type SourceKind = "release" | "dataset" | "document" | "portal" | "sample";

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  release: "发布页",
  dataset: "数据集",
  document: "文件",
  portal: "门户",
  sample: "样本",
};

export const SOURCE_KIND_HINT: Record<SourceKind, string> = {
  release: "精确发布页，页面自带发布日期",
  dataset: "数据集或表号页，可复查同一期间的值",
  document: "法规、公告或文件原文",
  portal: "机构门户，精确文件页尚未定位",
  sample: "内部样本或演示占位，无公开链接",
};

/** 精确来源：能落到具体发布页、数据集或文件原文。 */
export function isPreciseKind(kind: SourceKind): boolean {
  return kind === "release" || kind === "dataset" || kind === "document";
}

/** 门户与样本不能算“已核实到数字”。 */
export function isTraceable(kind: SourceKind): boolean {
  return isPreciseKind(kind);
}

/** 单一 T3 来源不进量化汇总。 */
export function isSingleSource(tier: string): boolean {
  return tier === "T3";
}

export function asOfLabel(retrievedAt: string): string {
  return `抓取 ${retrievedAt}`;
}
