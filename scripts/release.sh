#!/usr/bin/env bash
# 构建未签名的 universal macOS 产物并生成校验和。
# 没有 Apple Developer 账号时刻意不做签名/公证，详见 DISTRIBUTION.md。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="$HOME/.cargo/bin:$PATH"

VERSION="$(/usr/bin/python3 -I -c 'import json;print(json.load(open("src-tauri/tauri.conf.json"))["version"])')"
NAME="Cevtuo-Causa-${VERSION}-macos-universal"
OUT="$ROOT/release"
TARGET_DIR="$ROOT/src-tauri/target/universal-apple-darwin/release/bundle"

if [ "${1:-}" != "--skip-build" ]; then
  npx tauri build --target universal-apple-darwin --bundles app,dmg
fi

APP="$TARGET_DIR/macos/Cevtuo Causa.app"
if [ ! -d "$APP" ]; then
  echo "missing bundle: $APP" >&2
  exit 1
fi

mkdir -p "$OUT"
rm -f "$OUT/$NAME.zip" "$OUT/$NAME.dmg" "$OUT/SHA256SUMS.txt"

ditto -c -k --keepParent "$APP" "$OUT/$NAME.zip"

DMG="$(find "$TARGET_DIR/dmg" -maxdepth 1 -name '*.dmg' -print -quit 2>/dev/null || true)"
if [ -n "$DMG" ]; then
  cp "$DMG" "$OUT/$NAME.dmg"
fi

(
  cd "$OUT"
  shasum -a 256 "$NAME.zip" > SHA256SUMS.txt
  if [ -f "$NAME.dmg" ]; then
    shasum -a 256 "$NAME.dmg" >> SHA256SUMS.txt
  fi
)

cat > "$OUT/RELEASE-NOTES.md" <<NOTES
# Cevtuo Causa ${VERSION}

未签名、未公证的 universal macOS 构建（Apple Silicon + Intel）。
首次打开需要手动放行，步骤见仓库里的 DISTRIBUTION.md。

- app: \`$NAME.zip\`
- dmg: \`$NAME.dmg\`（如果存在）
- 校验: \`SHA256SUMS.txt\`

本版新增：
- 来源注册表：46 条来源集中到 source-registry.json，口径 / 扩散 / 链证据只引用 sourceId。
- 口径与扩散数字改为 2026-10/11 官方发布值，补精确发布页、发布日期、抓取时间、数据集 / 文号。
- 研究视图显示来源类型、发布日、抓取日与 single-source。
- 来源健康检查：每周检查公开链接，403 / 登录墙逐条白名单，结果写入 SOURCE_HEALTH.md。
- 0.5 的口径对齐、政策扩散与 0.4 的安全 / 恢复继续保留。

数据只在本机：SQLCipher 加密数据库 + macOS Keychain 密钥；应用不发网络请求。
未签名、未公证；首次打开需要手动放行，步骤见 DISTRIBUTION.md。
NOTES

ls -lh "$OUT"
