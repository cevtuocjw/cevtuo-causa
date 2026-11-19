import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  DatabaseZap,
  Download,
  LogOut,
  ShieldX,
} from "lucide-react";
import {
  destroyLocalData,
  isDesktop,
  quitApp,
  type DestroyReport,
} from "../lib/desktop";

const PHRASE = "销毁全部数据";

/**
 * 加密擦除的确认流程。三道门槛：
 * 1. 必须先导出 JSON（导出失败不会解锁按钮）；
 * 2. 必须输入完整短语；
 * 3. Rust 侧再次校验同一短语。
 * 备份与数据库共用 Keychain 密钥，所以“删库”必须连备份和密钥一起删。
 */
export function DestroyDataDialog({
  open,
  onClose,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  onExport: () => Promise<string | null>;
}) {
  const [exported, setExported] = useState<string | null>(null);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DestroyReport | null>(null);

  useEffect(() => {
    if (open) {
      setExported(null);
      setPhrase("");
      setBusy(false);
      setError(null);
      setReport(null);
    }
  }, [open]);

  async function exportFirst() {
    setBusy(true);
    setError(null);
    try {
      const path = await onExport();
      if (!path) {
        setError("导出没有完成，销毁按钮保持锁定。");
      } else {
        setExported(path);
      }
    } catch (err) {
      setError(`导出失败：${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    setBusy(true);
    setError(null);
    try {
      const result = await destroyLocalData(phrase.trim());
      setReport(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  const ready = exported != null && phrase.trim() === PHRASE && !busy;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => {
            if (!busy && !report) onClose();
          }}
        >
          <motion.div
            className="dialog glass destroy-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="销毁本地数据"
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            {report ? (
              <>
                <div className="dialog-head">
                  <h2>
                    <ShieldX size={16} /> 已销毁
                  </h2>
                  <span className="pill stale">不可恢复</span>
                </div>
                <p className="dialog-lead">
                  数据库、备份目录与 Keychain 密钥的删除结果如下。旧数据无法再解密。
                </p>
                <div className="dialog-rows">
                  <div>
                    <span>数据库文件</span>
                    <b>{report.db_removed ? "已删除" : "未完全删除"}</b>
                  </div>
                  <div>
                    <span>备份目录</span>
                    <b>{report.backups_removed ? "已删除" : "未完全删除"}</b>
                  </div>
                  <div>
                    <span>Keychain 密钥</span>
                    <b>{report.key_removed ? "已删除" : "删除失败"}</b>
                  </div>
                </div>
                {report.errors.length > 0 ? (
                  <ul className="destroy-errors">
                    {report.errors.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ul>
                ) : null}
                {!report.key_removed ? (
                  <p className="dialog-lead destroy-warn">
                    <AlertTriangle size={12} /> Keychain 密钥可能仍然存在；请先在“钥匙串访问”
                    中手动删除 com.cevtuo.causa / db-key，再退出。
                  </p>
                ) : null}
                <p className="dialog-lead">
                  请退出应用。下次打开时没有密钥和数据库，会进入首次启动。
                </p>
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void quitApp()}
                  >
                    <LogOut size={14} /> 退出应用
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="dialog-head">
                  <h2>
                    <DatabaseZap size={16} /> 销毁本地数据
                  </h2>
                  <span className="pill stale">加密擦除</span>
                </div>
                <p className="dialog-lead">
                  这不是“重置”：会删除数据库文件、全部加密备份，以及 macOS Keychain
                  中的数据库密钥。备份和数据库共用同一把密钥，所以三步都必须完成。
                  删除后无法恢复。
                </p>
                <ul className="dialog-list">
                  <li>下载目录里的 JSON / Markdown 导出文件不会被删除</li>
                  <li>审计记录随数据库一起删除</li>
                  <li>没有“新建密钥覆盖旧库”这类捷径</li>
                </ul>

                <div className="destroy-export">
                  <div>
                    <span>第 1 步 · 先导出</span>
                    <b>
                      {exported
                        ? `已导出：${exported}`
                        : "未导出时销毁按钮保持锁定"}
                    </b>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => void exportFirst()}
                  >
                    {exported ? <Check size={14} /> : <Download size={14} />}
                    {exported ? "重新导出 JSON" : "导出 JSON"}
                  </button>
                </div>

                <label className="destroy-phrase">
                  <span>
                    第 2 步 · 输入短语 <code>{PHRASE}</code>
                  </span>
                  <input
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    placeholder={PHRASE}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>

                {error ? (
                  <p className="dialog-lead destroy-warn">
                    <AlertTriangle size={12} /> {error}
                  </p>
                ) : null}

                <div className="dialog-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={onClose}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-destructive"
                    disabled={!ready || !isDesktop()}
                    onClick={() => void destroy()}
                  >
                    <DatabaseZap size={14} /> {busy ? "正在删除…" : "永久销毁"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
