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

export async function loadState<T>(): Promise<T | null> {
  if (!isDesktop()) return null;
  try {
    return await invoke<T | null>("load_state");
  } catch (err) {
    console.error("load_state failed", err);
    return null;
  }
}

export async function saveState(state: unknown): Promise<void> {
  if (!isDesktop()) return;
  try {
    await invoke("save_state", { state });
  } catch (err) {
    console.error("save_state failed", err);
  }
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
