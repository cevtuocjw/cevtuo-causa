#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/src-tauri/target/release/bundle/macos/Cevtuo Causa.app"
if [ ! -d "$APP" ]; then
  APP="$ROOT/src-tauri/target/debug/bundle/macos/Cevtuo Causa.app"
fi
DB="$HOME/Library/Application Support/com.cevtuo.causa/causa.db"

echo "app: $APP"
if [ -d "$APP" ]; then echo "  OK: bundle exists"; else echo "  MISSING: run npm run desktop:build"; fi

echo "db: $DB"
if [ -f "$DB" ]; then
  echo -n "  header: "; xxd -l 16 "$DB"
  if xxd -l 16 "$DB" | grep -q "SQLite format 3"; then
    echo "  WARN: plaintext SQLite header — SQLCipher not linked"
  else
    echo "  OK: no plaintext SQLite header"
  fi
else
  echo "  MISSING: launch the app once"
fi

echo "keychain:"
if security find-generic-password -s com.cevtuo.causa -a db-key >/dev/null 2>&1; then
  echo "  OK: com.cevtuo.causa / db-key"
else
  echo "  not found (app may not have run, or access was denied)"
fi
