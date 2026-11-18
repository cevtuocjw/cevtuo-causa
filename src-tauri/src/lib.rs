use std::error::Error;
use std::sync::Mutex;

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use rusqlite::{params, Connection};
use serde::Serialize;
use tauri::{Manager, State};

struct Db(Mutex<Connection>);

#[derive(Serialize)]
struct VaultStatus {
  sqlcipher: bool,
  encrypted: bool,
  key_location: String,
  db_path: String,
  network_requests: u32,
  schema_version: u32,
}

fn key_entry() -> Result<keyring::Entry, keyring::Error> {
  keyring::Entry::new("com.cevtuo.causa", "db-key")
}

fn load_or_create_key() -> Result<String, Box<dyn Error>> {
  let entry = key_entry()?;
  match entry.get_password() {
    Ok(key) => Ok(key),
    Err(_) => {
      let mut bytes = [0u8; 32];
      rand::thread_rng().fill_bytes(&mut bytes);
      let key = B64.encode(bytes);
      entry.set_password(&key)?;
      Ok(key)
    }
  }
}

fn init_db(app: &tauri::AppHandle) -> Result<(Connection, String, bool), Box<dyn Error>> {
  let dir = app.path().app_data_dir()?;
  std::fs::create_dir_all(&dir)?;
  let db_path = dir.join("causa.db");
  let key = load_or_create_key()?;

  let conn = Connection::open(&db_path)?;
  conn.pragma_update(None, "key", key.as_str())?;

  let sqlcipher: Option<String> = conn
    .query_row("PRAGMA cipher_version;", [], |row| row.get(0))
    .ok();

  conn.execute_batch(
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
  )?;

  Ok((conn, db_path.to_string_lossy().to_string(), sqlcipher.is_some()))
}

#[tauri::command]
fn vault_status(db: State<'_, Db>, app: tauri::AppHandle) -> Result<VaultStatus, String> {
  let conn = db.0.lock().map_err(|e| e.to_string())?;
  let sqlcipher: Option<String> = conn
    .query_row("PRAGMA cipher_version;", [], |row| row.get(0))
    .ok();
  let db_path = app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())?
    .join("causa.db")
    .to_string_lossy()
    .to_string();

  Ok(VaultStatus {
    sqlcipher: sqlcipher.is_some(),
    encrypted: sqlcipher.is_some(),
    key_location: "macOS Keychain · com.cevtuo.causa".into(),
    db_path,
    network_requests: 0,
    schema_version: 1,
  })
}

#[tauri::command]
fn load_state(db: State<'_, Db>) -> Result<Option<serde_json::Value>, String> {
  #[cfg(debug_assertions)]
  eprintln!("[causa] load_state");
  let conn = db.0.lock().map_err(|e| e.to_string())?;
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
}

#[tauri::command]
fn save_state(db: State<'_, Db>, state: serde_json::Value) -> Result<(), String> {
  let payload = serde_json::to_string(&state).map_err(|e| e.to_string())?;
  #[cfg(debug_assertions)]
  eprintln!("[causa] save_state {} bytes", payload.len());
  let conn = db.0.lock().map_err(|e| e.to_string())?;
  conn.execute(
    "INSERT INTO state (id, payload, updated_at) VALUES (1, ?1, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
    params![payload],
  )
  .map_err(|e| e.to_string())?;
  Ok(())
}

#[derive(Serialize)]
struct AuditRow {
  action: String,
  detail: String,
  at: String,
}

#[tauri::command]
fn append_audit(db: State<'_, Db>, action: String, detail: String) -> Result<(), String> {
  let conn = db.0.lock().map_err(|e| e.to_string())?;
  conn.execute(
    "INSERT INTO audit (action, detail, at) VALUES (?1, ?2, datetime('now'))",
    params![action, detail],
  )
  .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn list_audit(db: State<'_, Db>, limit: u32) -> Result<Vec<AuditRow>, String> {
  let conn = db.0.lock().map_err(|e| e.to_string())?;
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
  rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_state(db: State<'_, Db>) -> Result<(), String> {
  let conn = db.0.lock().map_err(|e| e.to_string())?;
  conn.execute("DELETE FROM state", []).map_err(|e| e.to_string())?;
  Ok(())
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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let (conn, path, sqlcipher) = init_db(app.handle())?;
      if cfg!(debug_assertions) {
        eprintln!("[causa] db={path} sqlcipher={sqlcipher}");
      }
      app.manage(Db(Mutex::new(conn)));
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      vault_status,
      load_state,
      save_state,
      clear_state,
      save_export,
      append_audit,
      list_audit
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
