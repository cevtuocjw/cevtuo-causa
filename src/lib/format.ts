export const TODAY = "2026-11-18";

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
