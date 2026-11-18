/** 日期只在本地日历意义上使用：到期日是“当天结束”，不引入时区换算。 */

export const DAY_MS = 86_400_000;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value: string): Date | null {
  const m = DATE_ONLY.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function endOfDay(value: string): Date | null {
  const d = parseDateOnly(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

/** 接受日期或完整 ISO 时间；用于迁移数据。 */
export function dueMoment(value: string): Date | null {
  if (DATE_ONLY.test(value)) return endOfDay(value);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function diffDays(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
