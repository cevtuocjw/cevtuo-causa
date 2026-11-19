use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::{Manager, State};

/// payload 的 schemaVersion 是数据合同的版本；这里记的是 SQLite 文件结构版本。
/// 两者不能互相替代：payload 迁移可以在同一套表结构里完成。
const DB_SCHEMA_VERSION: i64 = 2;

/// 销毁不可只靠前端确认：Rust 侧也校验同一个短语。
const DESTROY_PHRASE: &str = "销毁全部数据";

struct Vault {
  conn: Mutex<Option<Connection>>,
  failure: Mutex<Option<VaultFailure>>,
}

impl Vault {
  fn new() -> Self {
    Self {
      conn: Mutex::new(None),
      failure: Mutex::new(None),
    }
  }

  fn set_failure(&self, failure: VaultFailure) {
    if let Ok(mut guard) = self.failure.lock() {
      *guard = Some(failure);
    }
  }

  fn clear_failure(&self) {
    if let Ok(mut guard) = self.failure.lock() {
      *guard = None;
    }
  }

  fn failure_snapshot(&self) -> Option<VaultFailure> {
    self.failure.lock().ok().and_then(|guard| guard.clone())
  }

  fn unavailable_message(&self) -> String {
    self
      .failure_snapshot()
      .map(|failure| failure.message)
      .unwrap_or_else(|| "本地数据库尚未就绪。".into())
  }
}

#[derive(Clone, Serialize)]
struct VaultFailure {
  /// missing_key / keychain_locked / keychain_denied / key_mismatch /
  /// plaintext / sqlcipher / io / path / destroyed
  kind: String,
  message: String,
  detail: String,
  db_path: String,
  backup_dir: String,
  db_exists: bool,
}

#[derive(Serialize)]
struct VaultStatus {
  sqlcipher: bool,
  encrypted: bool,
  key_location: String,
  db_path: String,
  schema_version: i64,
}

#[derive(Serialize)]
struct BackupInfo {
  name: String,
  path: String,
  bytes: u64,
  modified: u64,
}

#[derive(Serialize)]
struct DestroyReport {
  db_removed: bool,
  backups_removed: bool,
  key_removed: bool,
  errors: Vec<String>,
}

struct DataPaths {
  data_dir: PathBuf,
  db: PathBuf,
  backups: PathBuf,
}

fn data_paths(app: &tauri::AppHandle) -> Result<DataPaths, String> {
  let data_dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("找不到应用数据目录：{e}"))?;
  Ok(DataPaths {
    db: data_dir.join("causa.db"),
    backups: data_dir.join("backups"),
    data_dir,
  })
}

/// 明文 SQLite 的文件头；出现它就拒绝启动，避免把“链接了 SQLCipher”当成“已加密”。
fn is_plaintext_sqlite(path: &Path) -> bool {
  const HEADER: &[u8; 16] = b"SQLite format 3\0";
  let Ok(mut file) = File::open(path) else {
    return false;
  };
  let mut buf = [0u8; 16];
  matches!(file.read_exact(&mut buf), Ok(())) && &buf == HEADER
}

fn key_entry() -> Result<keyring::Entry, keyring::Error> {
  keyring::Entry::new("com.cevtuo.causa", "db-key")
}

fn keychain_kind(err: &keyring::Error) -> &'static str {
  match err {
    keyring::Error::NoStorageAccess(_) => "keychain_locked",
    keyring::Error::PlatformFailure(_) => "keychain_denied",
    keyring::Error::Ambiguous(_) => "keychain_ambiguous",
    keyring::Error::BadEncoding(_) => "keychain_bad_encoding",
    _ => "keychain_error",
  }
}

fn keychain_message(kind: &str) -> &'static str {
  match kind {
    "keychain_locked" => {
      "无法访问 macOS 钥匙串（可能已锁定）。请先解锁“钥匙串访问”，再重试。"
    }
    "keychain_denied" => {
      "钥匙串拒绝读取（可能在系统弹窗里点了“拒绝”）。请重试并在弹窗中允许访问。"
    }
    "keychain_ambiguous" => {
      "钥匙串里有多条同名条目，无法确定该用哪一把密钥。请先在“钥匙串访问”中清理重复项。"
    }
    "keychain_bad_encoding" => {
      "钥匙串里的密钥不是有效的 UTF-8 文本，无法用于解密。请从备份恢复或检查该条目。"
    }
    _ => "读取钥匙串失败，无法取得数据库密钥。",
  }
}

fn make_failure(
  kind: &str,
  message: impl Into<String>,
  detail: impl Into<String>,
  paths: Option<&DataPaths>,
) -> VaultFailure {
  VaultFailure {
    kind: kind.into(),
    message: message.into(),
    detail: detail.into(),
    db_path: paths
      .map(|p| p.db.to_string_lossy().to_string())
      .unwrap_or_else(|| "未知".into()),
    backup_dir: paths
      .map(|p| p.backups.to_string_lossy().to_string())
      .unwrap_or_else(|| "未知".into()),
    db_exists: paths.map(|p| p.db.exists()).unwrap_or(false),
  }
}

fn keychain_failure(err: keyring::Error, paths: &DataPaths, action: &str) -> VaultFailure {
  let kind = keychain_kind(&err);
  make_failure(
    kind,
    format!(
      "{}（{}）。为避免覆盖旧库，应用不会新建密钥。",
      keychain_message(kind),
      action
    ),
    format!("{err}"),
    Some(paths),
  )
}

/// 只有“确实没有条目且数据库也不存在”才创建新密钥。
/// 数据库存在而密钥缺失，说明钥匙串条目丢了或被删了；此时新建密钥只会让旧库永远打不开。
fn obtain_key(paths: &DataPaths) -> Result<String, VaultFailure> {
  let entry = key_entry().map_err(|err| {
    let kind = keychain_kind(&err);
    make_failure(
      kind,
      format!("{}（创建钥匙串条目失败）。", keychain_message(kind)),
      format!("{err}"),
      Some(paths),
    )
  })?;

  match entry.get_password() {
    Ok(key) => Ok(key),
    Err(keyring::Error::NoEntry) => {
      if paths.db.exists() {
        return Err(make_failure(
          "missing_key",
          "数据库文件还在，但 Keychain 里没有对应的密钥。为避免覆盖旧库，应用不会新建密钥。",
          "Keychain 条目 com.cevtuo.causa / db-key 不存在。",
          Some(paths),
        ));
      }
      let mut bytes = [0u8; 32];
      rand::thread_rng().fill_bytes(&mut bytes);
      let key = B64.encode(bytes);
      entry
        .set_password(&key)
        .map_err(|err| keychain_failure(err, paths, "写入新密钥失败"))?;
      Ok(key)
    }
    Err(err) => Err(keychain_failure(err, paths, "读取密钥失败")),
  }
}

fn open_failure(err: impl std::fmt::Display, paths: &DataPaths) -> VaultFailure {
  let raw = err.to_string();
  let lowered = raw.to_lowercase();
  let looks_like_wrong_key = lowered.contains("not a database")
    || lowered.contains("file is encrypted")
    || lowered.contains("malformed")
    || lowered.contains("hmac");
  let (kind, message) = if looks_like_wrong_key {
    (
      "key_mismatch",
      "数据库能打开文件，但密钥不匹配或文件已损坏。请从备份恢复；不要新建密钥。",
    )
  } else {
    ("db_open", "打开数据库失败。请检查文件权限，或从备份恢复。")
  };
  make_failure(kind, message, raw, Some(paths))
}

fn try_open(app: &tauri::AppHandle) -> Result<(Connection, PathBuf), VaultFailure> {
  let paths = match data_paths(app) {
    Ok(paths) => paths,
    Err(message) => {
      return Err(make_failure(
        "path",
        message.clone(),
        message,
        None,
      ));
    }
  };

  fs::create_dir_all(&paths.data_dir).map_err(|err| {
    make_failure(
      "io",
      "创建应用数据目录失败，无法初始化本地数据库。",
      format!("{err}"),
      Some(&paths),
    )
  })?;

  if is_plaintext_sqlite(&paths.db) {
    return Err(make_failure(
      "plaintext",
      "数据库文件是明文 SQLite，拒绝启动。请先备份并确认数据来源，再处理。",
      paths.db.to_string_lossy().to_string(),
      Some(&paths),
    ));
  }

  let key = obtain_key(&paths)?;
  let conn = Connection::open(&paths.db)
    .map_err(|err| open_failure(err, &paths))?;
  conn
    .pragma_update(None, "key", key.as_str())
    .map_err(|err| open_failure(err, &paths))?;

  let sqlcipher: Option<String> = conn
    .query_row("PRAGMA cipher_version;", [], |row| row.get(0))
    .ok();
  if sqlcipher.is_none() {
    return Err(make_failure(
      "sqlcipher",
      "SQLCipher 未链接，拒绝以明文模式启动。",
      "PRAGMA cipher_version 返回空。",
      Some(&paths),
    ));
  }

  // 任何一条读查询都能暴露“密钥不对”，不必等到前端 load_state。
  conn
    .query_row("SELECT count(*) FROM sqlite_master;", [], |row| {
      row.get::<_, i64>(0)
    })
    .map_err(|err| open_failure(err, &paths))?;

  conn
    .execute_batch(
      "CREATE TABLE IF NOT EXISTS state (
         id INTEGER PRIMARY KEY CHECK (id = 1),
         payload TEXT NOT NULL,
         updated_at TEXT NOT NULL
       );
       CREATE TABLE IF NOT EXISTS audit (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         action TEXT NOT NULL,
         detail TEXT NOT NULL,
         at TEXT NOT NULL
       );",
    )
    .map_err(|err| open_failure(err, &paths))?;
  conn
    .pragma_update(None, "user_version", DB_SCHEMA_VERSION)
    .map_err(|err| open_failure(err, &paths))?;

  Ok((conn, paths.db))
}

fn status_for(conn: &Connection, db_path: &Path) -> Result<VaultStatus, String> {
  let sqlcipher: Option<String> = conn
    .query_row("PRAGMA cipher_version;", [], |row| row.get(0))
    .ok();
  let schema_version: i64 = conn
    .query_row("PRAGMA user_version;", [], |row| row.get(0))
    .unwrap_or(0);
  let encrypted = sqlcipher.is_some() && !is_plaintext_sqlite(db_path);

  Ok(VaultStatus {
    sqlcipher: sqlcipher.is_some(),
    encrypted,
    key_location: "macOS Keychain · com.cevtuo.causa".into(),
    db_path: db_path.to_string_lossy().to_string(),
    schema_version,
  })
}

fn with_conn<T>(
  vault: &Vault,
  f: impl FnOnce(&Connection) -> Result<T, String>,
) -> Result<T, String> {
  let message = vault.unavailable_message();
  let guard = vault.conn.lock().map_err(|e| e.to_string())?;
  let conn = guard.as_ref().ok_or(message)?;
  f(conn)
}

#[tauri::command]
fn vault_status(vault: State<'_, Vault>, app: tauri::AppHandle) -> Result<VaultStatus, String> {
  let paths = data_paths(&app)?;
  with_conn(&vault, |conn| status_for(conn, &paths.db))
}

#[tauri::command]
fn vault_failure(vault: State<'_, Vault>) -> Option<VaultFailure> {
  vault.failure_snapshot()
}

/// 用户点“重试”时重新走完整初始化；成功则把连接放回状态。
/// 失败时保留新的分类错误，不创建覆盖性密钥。
#[tauri::command]
fn retry_vault(vault: State<'_, Vault>, app: tauri::AppHandle) -> Result<VaultStatus, String> {
  {
    let guard = vault.conn.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = guard.as_ref() {
      let paths = data_paths(&app)?;
      return status_for(conn, &paths.db);
    }
  }

  match try_open(&app) {
    Ok((conn, db_path)) => {
      let status = status_for(&conn, &db_path)?;
      let mut guard = vault.conn.lock().map_err(|e| e.to_string())?;
      *guard = Some(conn);
      vault.clear_failure();
      Ok(status)
    }
    Err(failure) => {
      let message = failure.message.clone();
      vault.set_failure(failure);
      Err(message)
    }
  }
}

#[tauri::command]
fn load_state(vault: State<'_, Vault>) -> Result<Option<serde_json::Value>, String> {
  #[cfg(debug_assertions)]
  eprintln!("[causa] load_state");
  with_conn(&vault, |conn| {
    let mut stmt = conn
      .prepare("SELECT payload FROM state WHERE id = 1")
      .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

    match rows.next().map_err(|e| e.to_string())? {
      Some(row) => {
        let payload: String = row.get(0).map_err(|e| e.to_string())?;
        let value = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
        Ok(Some(value))
      }
      None => Ok(None),
    }
  })
}

#[tauri::command]
fn save_state(vault: State<'_, Vault>, state: serde_json::Value) -> Result<(), String> {
  let payload = serde_json::to_string(&state).map_err(|e| e.to_string())?;
  #[cfg(debug_assertions)]
  eprintln!("[causa] save_state {} bytes", payload.len());
  with_conn(&vault, |conn| {
    conn
      .execute(
        "INSERT INTO state (id, payload, updated_at) VALUES (1, ?1, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
        params![payload],
      )
      .map_err(|e| e.to_string())?;
    Ok(())
  })
}

#[derive(Serialize)]
struct AuditRow {
  action: String,
  detail: String,
  at: String,
}

#[tauri::command]
fn append_audit(
  vault: State<'_, Vault>,
  action: String,
  detail: String,
) -> Result<(), String> {
  with_conn(&vault, |conn| {
    conn
      .execute(
        "INSERT INTO audit (action, detail, at) VALUES (?1, ?2, datetime('now'))",
        params![action, detail],
      )
      .map_err(|e| e.to_string())?;
    Ok(())
  })
}

#[tauri::command]
fn list_audit(vault: State<'_, Vault>, limit: u32) -> Result<Vec<AuditRow>, String> {
  with_conn(&vault, |conn| {
    let mut stmt = conn
      .prepare("SELECT action, detail, at FROM audit ORDER BY id DESC LIMIT ?1")
      .map_err(|e| e.to_string())?;
    let rows = stmt
      .query_map(params![limit.clamp(1, 100)], |row| {
        Ok(AuditRow {
          action: row.get(0)?,
          detail: row.get(1)?,
          at: row.get(2)?,
        })
      })
      .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())
  })
}

fn backup_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  Ok(data_paths(app)?.backups)
}

/// 用 SQLCipher 的 VACUUM INTO 生成同样加密的备份；同名备份当天只做一次。
#[tauri::command]
fn backup_db(
  vault: State<'_, Vault>,
  app: tauri::AppHandle,
  label: String,
) -> Result<String, String> {
  let safe: String = label
    .chars()
    .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
    .collect();
  if safe.is_empty() {
    return Err("备份标签无效".into());
  }

  let dir = backup_dir(&app)?;
  std::fs::create_dir_all(&dir).map_err(|e| format!("创建备份目录失败：{e}"))?;
  let path = dir.join(format!("causa-{safe}.db"));
  if path.exists() {
    return Ok(path.to_string_lossy().to_string());
  }

  with_conn(&vault, |conn| {
    conn
      .execute("VACUUM INTO ?1", params![path.to_string_lossy().to_string()])
      .map_err(|e| format!("备份失败：{e}"))?;
    Ok(())
  })?;

  // 只保留最新 7 份。
  let mut backups: Vec<_> = std::fs::read_dir(&dir)
    .map_err(|e| e.to_string())?
    .filter_map(|entry| entry.ok())
    .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "db"))
    .collect();
  backups.sort_by_key(|entry| {
    entry
      .metadata()
      .and_then(|m| m.modified())
      .unwrap_or(SystemTime::UNIX_EPOCH)
  });
  while backups.len() > 7 {
    if let Some(oldest) = backups.first() {
      let _ = std::fs::remove_file(oldest.path());
      backups.remove(0);
    }
  }

  Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn list_backups(app: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
  let dir = backup_dir(&app)?;
  if !dir.exists() {
    return Ok(Vec::new());
  }
  let mut rows: Vec<BackupInfo> = std::fs::read_dir(&dir)
    .map_err(|e| format!("读取备份目录失败：{e}"))?
    .filter_map(|entry| entry.ok())
    .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "db"))
    .filter_map(|entry| {
      let path = entry.path();
      let metadata = entry.metadata().ok()?;
      let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
      Some(BackupInfo {
        name: path.file_name()?.to_string_lossy().to_string(),
        path: path.to_string_lossy().to_string(),
        bytes: metadata.len(),
        modified,
      })
    })
    .collect();
  rows.sort_by(|a, b| b.modified.cmp(&a.modified));
  Ok(rows)
}

fn sanitize_backup_name(name: &str) -> Result<(), String> {
  if !name.ends_with(".db")
    || name.is_empty()
    || !name
      .chars()
      .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
  {
    return Err("备份文件名无效。".into());
  }
  Ok(())
}

/// 用备份覆盖当前库；覆盖前先把当前库另存为 causa.db.before-restore-<秒>。
/// 密钥仍然是同一把；如果 Keychain 条目缺失，恢复文件也打不开，这里不会新建密钥。
#[tauri::command]
fn restore_backup(
  vault: State<'_, Vault>,
  app: tauri::AppHandle,
  name: String,
) -> Result<VaultStatus, String> {
  sanitize_backup_name(&name)?;
  let paths = data_paths(&app)?;
  let source = paths.backups.join(&name);
  if !source.exists() {
    return Err(format!("找不到备份：{name}"));
  }

  {
    let mut guard = vault.conn.lock().map_err(|e| e.to_string())?;
    *guard = None; // 先关闭连接，再覆盖文件。
  }

  if paths.db.exists() {
    let stamp = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map(|d| d.as_secs())
      .unwrap_or(0);
    let before = paths.data_dir.join(format!("causa.db.before-restore-{stamp}"));
    fs::copy(&paths.db, &before)
      .map_err(|e| format!("覆盖前保存当前数据库失败：{e}"))?;
  }

  fs::copy(&source, &paths.db).map_err(|e| format!("恢复备份失败：{e}"))?;

  match try_open(&app) {
    Ok((conn, db_path)) => {
      let status = status_for(&conn, &db_path)?;
      let mut guard = vault.conn.lock().map_err(|e| e.to_string())?;
      *guard = Some(conn);
      vault.clear_failure();
      Ok(status)
    }
    Err(failure) => {
      let message = failure.message.clone();
      vault.set_failure(failure);
      Err(message)
    }
  }
}

#[tauri::command]
fn reveal_data_dir(app: tauri::AppHandle) -> Result<(), String> {
  let paths = data_paths(&app)?;
  let status = std::process::Command::new("open")
    .arg(&paths.data_dir)
    .status()
    .map_err(|e| format!("无法打开 Finder：{e}"))?;
  if status.success() {
    Ok(())
  } else {
    Err("Finder 返回了非零状态。".into())
  }
}

fn delete_keychain_entry(service: &str, user: &str) -> Result<(), String> {
  let entry = keyring::Entry::new(service, user)
    .map_err(|err| format!("无法访问 Keychain，密钥可能仍在：{err}"))?;
  match entry.delete_credential() {
    Ok(()) => Ok(()),
    // 条目本来就不存在，结果与删除成功一致。
    Err(keyring::Error::NoEntry) => Ok(()),
    Err(err) => Err(format!("删除 Keychain 密钥失败：{err}")),
  }
}

fn remove_private_data(
  paths: &DataPaths,
  key_service: &str,
  key_user: &str,
) -> DestroyReport {
  let mut report = DestroyReport {
    db_removed: false,
    backups_removed: false,
    key_removed: false,
    errors: Vec::new(),
  };

  // 顺序按交接约定：备份 → 数据库（含 -wal/-shm）→ Keychain。
  match fs::remove_dir_all(&paths.backups) {
    Ok(()) => report.backups_removed = true,
    Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
      report.backups_removed = true;
    }
    Err(err) => report
      .errors
      .push(format!("删除备份目录失败：{err}")),
  }

  let mut db_removed = true;
  for suffix in ["causa.db", "causa.db-wal", "causa.db-shm", "causa.db-journal"] {
    let path = paths.data_dir.join(suffix);
    match fs::remove_file(&path) {
      Ok(()) => {}
      Err(err) if err.kind() == std::io::ErrorKind::NotFound => {}
      Err(err) => {
        db_removed = false;
        report.errors.push(format!("删除 {} 失败：{err}", path.display()));
      }
    }
  }

  // 恢复前留的副本也是同一把密钥下的密文，必须一并清掉。
  if let Ok(entries) = fs::read_dir(&paths.data_dir) {
    for entry in entries.flatten() {
      let name = entry.file_name().to_string_lossy().to_string();
      if name.starts_with("causa.db.before-restore-") {
        match fs::remove_file(entry.path()) {
          Ok(()) => {}
          Err(err) if err.kind() == std::io::ErrorKind::NotFound => {}
          Err(err) => {
            db_removed = false;
            report
              .errors
              .push(format!("删除恢复副本 {name} 失败：{err}"));
          }
        }
      }
    }
  }
  report.db_removed = db_removed;

  match delete_keychain_entry(key_service, key_user) {
    Ok(()) => report.key_removed = true,
    Err(err) => report.errors.push(err),
  }

  report
}

/// 加密擦除：删备份、删库（含 WAL）、删 Keychain 密钥，并关闭内存连接。
/// 备份与数据库共用同一把密钥，所以删密钥这一步不能省。
fn destroy_impl(
  paths: &DataPaths,
  confirm: &str,
  key_service: &str,
  key_user: &str,
) -> Result<DestroyReport, String> {
  if confirm.trim() != DESTROY_PHRASE {
    return Err(format!("确认短语不匹配；请输入「{DESTROY_PHRASE}」。"));
  }
  Ok(remove_private_data(paths, key_service, key_user))
}

#[tauri::command]
fn destroy_local_data(
  vault: State<'_, Vault>,
  app: tauri::AppHandle,
  confirm: String,
) -> Result<DestroyReport, String> {
  let paths = data_paths(&app)?;

  {
    let mut guard = vault.conn.lock().map_err(|e| e.to_string())?;
    *guard = None;
  }

  let report = destroy_impl(&paths, &confirm, "com.cevtuo.causa", "db-key")?;
  vault.set_failure(make_failure(
    "destroyed",
    "本地数据已销毁：数据库、备份与 Keychain 密钥都已删除。请退出应用后重新打开。",
    if report.errors.is_empty() {
      "所有删除步骤成功。".to_string()
    } else {
      report.errors.join("；")
    },
    Some(&paths),
  ));

  Ok(report)
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
  app.exit(0);
}

/// 把导出文件写到用户的“下载”目录。文件名只允许 ASCII 字母、数字与 -_.，
/// 避免前端传入路径分隔符或上跳目录。
#[tauri::command]
fn save_export(app: tauri::AppHandle, name: String, contents: String) -> Result<String, String> {
  let safe: String = name
    .chars()
    .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
    .collect();
  if safe.is_empty() {
    return Err("导出文件名无效".into());
  }
  let dir = app
    .path()
    .download_dir()
    .map_err(|e| format!("找不到下载目录：{e}"))?;
  let path = dir.join(safe);
  std::fs::write(&path, contents).map_err(|e| format!("写入失败：{e}"))?;
  Ok(path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn detects_plaintext_sqlite_header() {
    let path = std::env::temp_dir().join(format!("causa-header-{}.db", std::process::id()));
    std::fs::write(&path, b"SQLite format 3\0rest").expect("write fixture");
    assert!(is_plaintext_sqlite(&path));
    std::fs::write(&path, b"random salt bytes!").expect("write ciphertext fixture");
    assert!(!is_plaintext_sqlite(&path));
    let _ = std::fs::remove_file(&path);
  }

  #[test]
  fn sqlcipher_is_linked() {
    let conn = Connection::open_in_memory().expect("open in-memory db");
    conn.pragma_update(None, "key", "test-key")
      .expect("set sqlcipher key");
    let version: Option<String> = conn
      .query_row("PRAGMA cipher_version;", [], |row| row.get(0))
      .ok();
    assert!(
      version.is_some_and(|v| !v.is_empty()),
      "SQLCipher is not linked"
    );
  }

  #[test]
  fn destroy_phrase_must_match_exactly() {
    assert_eq!("销毁全部数据", DESTROY_PHRASE);
    assert_ne!("销毁", DESTROY_PHRASE);
    assert_ne!("销毁全部数据 ", DESTROY_PHRASE.trim());
    assert_eq!("销毁全部数据", " 销毁全部数据 ".trim());
  }

  #[test]
  fn backup_names_reject_path_tricks() {
    assert!(sanitize_backup_name("causa-auto-2026-11-18.db").is_ok());
    assert!(sanitize_backup_name("../causa.db").is_err());
    assert!(sanitize_backup_name("causa.db/evil").is_err());
    assert!(sanitize_backup_name("causa.txt").is_err());
    assert!(sanitize_backup_name("").is_err());
  }

  /// 只碰测试专用 service，不碰真实的 com.cevtuo.causa / db-key。
  #[test]
  fn keychain_entry_is_deleted() {
    let service = format!("com.cevtuo.causa.test.{}", std::process::id());
    let entry = keyring::Entry::new(&service, "db-key").expect("entry");
    entry.set_password("causa-test-key").expect("set test key");
    assert_eq!(entry.get_password().expect("read test key"), "causa-test-key");
    delete_keychain_entry(&service, "db-key").expect("delete test key");
    assert!(matches!(
      entry.get_password(),
      Err(keyring::Error::NoEntry)
    ));
  }

  #[test]
  fn destroy_requires_phrase_and_removes_files_and_key() {
    let root = std::env::temp_dir().join(format!("causa-destroy-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    let backups = root.join("backups");
    fs::create_dir_all(&backups).expect("create backups");
    fs::write(root.join("causa.db"), b"ciphertext").expect("db");
    fs::write(backups.join("causa-auto-1.db"), b"backup").expect("backup");

    let service = format!("com.cevtuo.causa.test.destroy.{}", std::process::id());
    let entry = keyring::Entry::new(&service, "db-key").expect("entry");
    entry.set_password("destroy-test-key").expect("set key");

    let paths = DataPaths {
      data_dir: root.clone(),
      db: root.join("causa.db"),
      backups: backups.clone(),
    };

    // 短语不对：一个文件、一把密钥都不能动。
    assert!(destroy_impl(&paths, "销毁", &service, "db-key").is_err());
    assert!(root.join("causa.db").exists());
    assert!(backups.join("causa-auto-1.db").exists());
    assert!(entry.get_password().is_ok());

    let report = destroy_impl(&paths, DESTROY_PHRASE, &service, "db-key")
      .expect("destroy with exact phrase");
    assert!(report.db_removed && report.backups_removed && report.key_removed);
    assert!(report.errors.is_empty(), "{:?}", report.errors);
    assert!(!root.join("causa.db").exists());
    assert!(!backups.exists());
    assert!(matches!(
      entry.get_password(),
      Err(keyring::Error::NoEntry)
    ));

    let _ = fs::remove_dir_all(&root);
  }

  #[test]
  fn private_files_and_backups_are_removed() {
    let root = std::env::temp_dir().join(format!("causa-erase-{}", std::process::id()));
    let _ = fs::remove_dir_all(&root);
    let backups = root.join("backups");
    fs::create_dir_all(&backups).expect("create backups");
    fs::write(root.join("causa.db"), b"ciphertext").expect("db");
    fs::write(root.join("causa.db-wal"), b"wal").expect("wal");
    fs::write(root.join("causa.db.before-restore-1"), b"old").expect("restore copy");
    fs::write(backups.join("causa-auto-1.db"), b"backup").expect("backup");
    fs::write(root.join("keep.txt"), b"unrelated").expect("keep");

    let paths = DataPaths {
      data_dir: root.clone(),
      db: root.join("causa.db"),
      backups: backups.clone(),
    };
    let report = remove_private_data(&paths, "com.cevtuo.causa.test.none", "db-key");

    assert!(report.db_removed);
    assert!(report.backups_removed);
    assert!(!root.join("causa.db").exists());
    assert!(!root.join("causa.db-wal").exists());
    assert!(!root.join("causa.db.before-restore-1").exists());
    assert!(!backups.exists());
    assert!(root.join("keep.txt").exists());
    assert!(report.errors.is_empty(), "{:?}", report.errors);
    let _ = fs::remove_dir_all(&root);
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let vault = Vault::new();
      match try_open(app.handle()) {
        Ok((conn, path)) => {
          if cfg!(debug_assertions) {
            eprintln!("[causa] db={path:?} sqlcipher=true");
          }
          *vault.conn.lock().expect("vault mutex") = Some(conn);
        }
        Err(failure) => {
          eprintln!("[causa] vault init failed: {} ({})", failure.kind, failure.detail);
          vault.set_failure(failure);
        }
      }
      app.manage(vault);
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      vault_status,
      vault_failure,
      retry_vault,
      load_state,
      save_state,
      clear_state,
      save_export,
      append_audit,
      list_audit,
      backup_db,
      list_backups,
      restore_backup,
      reveal_data_dir,
      destroy_local_data,
      quit_app
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}

#[tauri::command]
fn clear_state(vault: State<'_, Vault>) -> Result<(), String> {
  with_conn(&vault, |conn| {
    conn
      .execute("DELETE FROM state", [])
      .map_err(|e| e.to_string())?;
    Ok(())
  })
}
