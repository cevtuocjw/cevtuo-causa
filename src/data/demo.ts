import { initialChains, initialHousehold, initialRecords } from "./chains";
import { migrateV1 } from "../core/migrate";
import type { StateV2 } from "../core/types";

/** 演示链的类别标签；真实用户链由编辑器自行填写。 */
const DEMO_TAGS: Record<string, string[]> = {
  "cny-export-hiring": ["宏观", "行业"],
  "eu-cbam-fastener": ["政策", "行业"],
  "fed-cut-mortgage": ["宏观", "个人"],
  "cn-service-vouchers": ["政策", "个人"],
  "us-tariff-transship": ["政策", "行业"],
  "ai-capex-grid": ["行业", "宏观"],
  "eu-data-act": ["政策", "行业"],
};

/**
 * 演示账本：复用 0.2 的静态数据，走一次 v1→v2 迁移，
 * 因此演示链同样是 origin=seed，并且日期相对“现在”平移。
 *
 * 迁移后的旧记录没有 chainId，真实数据里应保持为空（不能硬塞类别）。
 * 演示数据是合成的，这里按顺序轮流挂到演示链上，只为了让“按类别校准”
 * 在演示里看得见；不要把这个做法带进真实迁移。
 */
export function demoState(now: Date): StateV2 {
  const { state } = migrateV1(
    {
      chains: initialChains,
      records: initialRecords,
      activeId: initialChains[0].id,
      household: initialHousehold,
    },
    now,
  );
  const chains = state.chains.map((chain) => ({
    ...chain,
    tags: DEMO_TAGS[chain.id] ?? chain.tags,
  }));
  const records = state.records.map((record, index) => ({
    ...record,
    chainId: record.chainId || chains[index % chains.length]?.id || "",
  }));
  return {
    ...state,
    chains,
    records,
    settings: { showSeedInStats: true },
  };
}
