function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** dev 测试时钟；生产由当前日期决定，不再写死 2026-11-18。 */
function devNowParam(): unknown {
  if (!import.meta.env.DEV) return undefined;
  const globalNow = (globalThis as { __CAUSA_TEST_NOW__?: unknown })
    .__CAUSA_TEST_NOW__;
  if (typeof globalNow === "string") return globalNow;
  try {
    return new URLSearchParams(window.location.search).get("now") ?? undefined;
  } catch {
    return undefined;
  }
}

const testNow = devNowParam();

export const TODAY =
  typeof testNow === "string" ? testNow.slice(0, 10) : localToday();

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function shortDate(iso: string): string {
  return iso.slice(5).replace("-", "/");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function datePos(date: string, from: string, to: string): number {
  const total = Date.parse(to) - Date.parse(from);
  if (total <= 0) return 1;
  return clamp((Date.parse(date) - Date.parse(from)) / total, 0, 1);
}

export function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
