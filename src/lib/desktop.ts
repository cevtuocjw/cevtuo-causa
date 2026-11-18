import { invoke } from "@tauri-apps/api/core";

export interface VaultStatus {
  sqlcipher: boolean;
  encrypted: boolean;
  key_location: string;
  db_path: string;
  network_requests: number;
  schema_version: number;
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * 读取失败必须冒泡：调用方要显示恢复界面。
 * 0.2 把错误吞成 null，随后又写入默认值，等于静默覆盖用户的库。
 */
export async function loadState<T>(): Promise<T | null> {
  if (!isDesktop()) return null;
  return await invoke<T | null>("load_state");
}

/** 写入失败也必须冒泡，由 UI 显示常驻错误，而不是只写 console。 */
export async function saveState(state: unknown): Promise<void> {
  if (!isDesktop()) return;
  await invoke("save_state", { state });
}

export interface AuditRow {
  action: string;
  detail: string;
  at: string;
}

/** 审计只写本地；浏览器预览没有数据库，直接忽略。 */
export async function appendAudit(action: string, detail: string): Promise<void> {
  if (!isDesktop()) return;
  try {
    await invoke("append_audit", { action, detail });
  } catch (err) {
    console.error("append_audit failed", err);
  }
}

export async function listAudit(limit = 20): Promise<AuditRow[]> {
  if (!isDesktop()) return [];
  try {
    return await invoke<AuditRow[]>("list_audit", { limit });
  } catch (err) {
    console.error("list_audit failed", err);
    return [];
  }
}

export async function clearState(): Promise<void> {
  if (!isDesktop()) return;
  await invoke("clear_state");
}

/** 桌面版写入“下载”目录并返回完整路径；浏览器版用 Blob 触发下载。 */
export async function saveExport(name: string, contents: string): Promise<string> {
  if (isDesktop()) {
    return await invoke<string>("save_export", { name, contents });
  }
  const type = name.endsWith(".json") ? "application/json" : "text/markdown";
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return name;
}

export async function vaultStatus(): Promise<VaultStatus | null> {
  if (!isDesktop()) return null;
  try {
    return await invoke<VaultStatus>("vault_status");
  } catch (err) {
    console.error("vault_status failed", err);
    return null;
  }
}
