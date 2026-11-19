import { invoke } from "@tauri-apps/api/core";

export interface VaultStatus {
  sqlcipher: boolean;
  encrypted: boolean;
  key_location: string;
  db_path: string;
  schema_version: number;
}

export interface VaultFailure {
  kind: string;
  message: string;
  detail: string;
  db_path: string;
  backup_dir: string;
  db_exists: boolean;
}

export interface BackupInfo {
  name: string;
  path: string;
  bytes: number;
  modified: number;
}

export interface DestroyReport {
  db_removed: boolean;
  backups_removed: boolean;
  key_removed: boolean;
  errors: string[];
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

/** 生成加密备份；浏览器预览没有数据库，返回空字符串。 */
export async function backupDb(label: string): Promise<string> {
  if (!isDesktop()) return "";
  return await invoke<string>("backup_db", { label });
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

/** 初始化失败时的分类信息；成功启动返回 null。 */
export async function vaultFailure(): Promise<VaultFailure | null> {
  if (!isDesktop()) return null;
  try {
    return await invoke<VaultFailure | null>("vault_failure");
  } catch (err) {
    console.error("vault_failure failed", err);
    return null;
  }
}

/** 重新走完整初始化；不会在数据库存在时新建密钥。 */
export async function retryVault(): Promise<VaultStatus> {
  return await invoke<VaultStatus>("retry_vault");
}

export async function listBackups(): Promise<BackupInfo[]> {
  if (!isDesktop()) return [];
  return await invoke<BackupInfo[]>("list_backups");
}

export async function restoreBackup(name: string): Promise<VaultStatus> {
  return await invoke<VaultStatus>("restore_backup", { name });
}

export async function revealDataDir(): Promise<void> {
  if (!isDesktop()) return;
  await invoke("reveal_data_dir");
}

/** 加密擦除：删备份、数据库与 Keychain 密钥。短语由 Rust 侧再次校验。 */
export async function destroyLocalData(confirm: string): Promise<DestroyReport> {
  if (!isDesktop()) {
    throw new Error("浏览器预览没有本地数据库可销毁。");
  }
  return await invoke<DestroyReport>("destroy_local_data", { confirm });
}

export async function quitApp(): Promise<void> {
  if (!isDesktop()) return;
  await invoke("quit_app");
}
