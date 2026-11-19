import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Copy,
  DatabaseBackup,
  FolderOpen,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  isDesktop,
  listBackups,
  restoreBackup,
  retryVault,
  revealDataDir,
  type BackupInfo,
  type VaultFailure,
  type VaultStatus,
} from "../lib/desktop";

const KIND_TITLE: Record<string, string> = {
  missing_key: "数据库在，但 Keychain 密钥不见了",
  keychain_locked: "Keychain 已锁定",
  keychain_denied: "Keychain 访问被拒绝",
  keychain_ambiguous: "Keychain 里有多条同名密钥",
  keychain_bad_encoding: "Keychain 里的密钥格式不对",
  key_mismatch: "密钥不匹配，或数据库文件已损坏",
  plaintext: "数据库是明文 SQLite",
  destroyed: "本地数据已销毁",
};

interface Props {
  loadError: string;
  failure: VaultFailure | null;
  status: VaultStatus | null;
}

/**
 * 初始化失败时的自助恢复页。
 * 关键约束：不提供“新建密钥”。数据库存在时覆盖密钥等于把旧库永久锁死。
 */
export function VaultRecovery({ loadError, failure, status }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [confirmName, setConfirmName] = useState<string | null>(null);

  const dbPath = failure?.db_path ?? status?.db_path ?? "未知";
  const backupDir = failure?.backup_dir ?? "未知";
  const title = failure
    ? (KIND_TITLE[failure.kind] ?? "无法读取本地账本")
    : "数据库已打开，但账本内容无法解析";

  useEffect(() => {
    if (!isDesktop()) return;
    let alive = true;
    listBackups()
      .then((rows) => {
        if (alive) setBackups(rows);
      })
      .catch(() => {
        if (alive) setBackups([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("已复制路径。");
    } catch {
      setMessage("复制失败；请手动选择路径。");
    }
  }

  async function retry() {
    setBusy(true);
    setMessage(null);
    try {
      await retryVault();
      window.location.reload();
    } catch (err) {
      setMessage(String(err));
      setBusy(false);
    }
  }

  async function restore(name: string) {
    setBusy(true);
    setMessage(null);
    try {
      await restoreBackup(name);
      window.location.reload();
    } catch (err) {
      setMessage(`恢复失败：${String(err)}`);
      setBusy(false);
    }
  }

  return (
    <div className="fatal-overlay" role="alertdialog" aria-label="本地账本恢复">
      <div className="dialog glass recovery-panel">
        <div className="dialog-head">
          <h2>
            <ShieldAlert size={16} /> {title}
          </h2>
          <span className="pill stale">只读保护</span>
        </div>

        <p className="dialog-lead">
          {failure?.message ??
            "数据库可以用当前密钥打开，但保存的账本不是有效 JSON。恢复失败时应用不会写入默认值。"}
        </p>
        {failure?.detail ? (
          <p className="dialog-lead recovery-detail">
            <code>{failure.detail}</code>
          </p>
        ) : (
          <p className="dialog-lead recovery-detail">
            <code>{loadError}</code>
          </p>
        )}

        <div className="dialog-rows recovery-paths">
          <div>
            <span>数据库</span>
            <b className="mono-path">{dbPath}</b>
            <button
              type="button"
              className="btn-mini"
              onClick={() => void copy(dbPath)}
              aria-label="复制数据库路径"
            >
              <Copy size={12} />
            </button>
          </div>
          <div>
            <span>备份目录</span>
            <b className="mono-path">{backupDir}</b>
            <button
              type="button"
              className="btn-mini"
              onClick={() => void copy(backupDir)}
              aria-label="复制备份目录路径"
            >
              <Copy size={12} />
            </button>
          </div>
          <div>
            <span>状态</span>
            <b>
              {failure?.db_exists ? "数据库文件存在" : "未发现数据库文件"}
              {failure?.kind === "missing_key" ? " · 禁用新建密钥" : ""}
            </b>
          </div>
        </div>

        <p className="dialog-lead">
          这里不会新建密钥来覆盖旧库。请先解锁并重试；仍失败时从下面的加密备份恢复
          （备份与数据库使用同一把 Keychain 密钥）。
        </p>

        <div className="recovery-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void retry()}
          >
            <RefreshCw size={14} /> 重试读取
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy || !isDesktop()}
            onClick={() => {
              revealDataDir().catch((err) =>
                setMessage(`无法打开 Finder：${String(err)}`),
              );
            }}
          >
            <FolderOpen size={14} /> 在 Finder 中显示
          </button>
        </div>

        <div className="backup-block">
          <div className="audit-head">
            <span>
              <DatabaseBackup size={12} /> 加密备份
            </span>
            <span>{backups == null ? "读取中" : `${backups.length} 份`}</span>
          </div>
          {backups && backups.length > 0 ? (
            <ul className="backup-list">
              {backups.map((b) => (
                <li key={b.name}>
                  <span className="backup-name">{b.name}</span>
                  <span className="audit-time num">
                    {new Date(b.modified * 1000).toLocaleString("zh-CN")}
                  </span>
                  <span className="num">{formatBytes(b.bytes)}</span>
                  {confirmName === b.name ? (
                    <span className="backup-confirm">
                      <button
                        type="button"
                        className="btn-mini"
                        onClick={() => setConfirmName(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="btn-mini danger"
                        disabled={busy}
                        onClick={() => void restore(b.name)}
                      >
                        确认覆盖
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-mini"
                      disabled={busy}
                      onClick={() => setConfirmName(b.name)}
                    >
                      恢复
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="audit-empty">
              {backups == null
                ? "正在读取备份目录…"
                : "备份目录里没有 .db 文件。"}
            </p>
          )}
        </div>

        {message ? (
          <p className="dialog-lead recovery-message">
            <AlertTriangle size={12} /> {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
