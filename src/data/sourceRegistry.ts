import type { SourceTier } from "../core/alignment";
import type { SourceKind } from "../core/source";
import registry from "./source-registry.json";

/**
 * 单一来源表。口径、扩散、链证据只引用 `id`，不要在各处再抄名字和 URL。
 * 修改来源只改 source-registry.json。
 */
export type Independence =
  | "official"
  | "official-derived"
  | "secondary"
  | "internal"
  | "absence";

export interface RegisteredSource {
  id: string;
  /** 界面上的短名，例如“国家统计局 CPI”。 */
  name: string;
  publisher: string;
  title: string;
  /** 样本类没有公开链接。 */
  url?: string;
  kind: SourceKind;
  tier: SourceTier;
  independence: Independence;
  publishedAt?: string;
  retrievedAt: string;
  /** 数据集代码、表号、文号或活动编号。 */
  dataset: string;
  revision?: string;
  note?: string;
}

export const SOURCE_REGISTRY = registry as RegisteredSource[];

export const SOURCE_BY_ID: Record<string, RegisteredSource> = Object.fromEntries(
  SOURCE_REGISTRY.map((source) => [source.id, source]),
);

/** 返回 undefined 而不是抛异常：界面缺来源时显示占位，测试负责报红。 */
export function getSource(id: string): RegisteredSource | undefined {
  return SOURCE_BY_ID[id];
}
