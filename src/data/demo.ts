import { initialChains, initialHousehold, initialRecords } from "./chains";
import { migrateV1 } from "../core/migrate";
import type { StateV2 } from "../core/types";

/**
 * 演示账本：复用 0.2 的静态数据，走一次 v1→v2 迁移，
 * 因此演示链同样是 origin=seed，并且日期相对“现在”平移。
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
  return { ...state, settings: { showSeedInStats: true } };
}
