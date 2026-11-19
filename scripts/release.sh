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
- 口径对齐：6 组指标 × 中 / 美 / 欧，逐项列定义、来源与“能否直接比较”；冲突不取平均。
- 政策扩散：3 个政策 × 5 个阶段，区分已发生 / 观察中 / 可能下一站；每一步必须带证据与触发条件。
- 两个研究视图都支持从相关指标跳回对应链条。
- 0.4 的加密擦除、Keychain 恢复、按类别校准、备份恢复继续保留。

数据只在本机：SQLCipher 加密数据库 + macOS Keychain 密钥；应用不发网络请求。
未签名、未公证；首次打开需要手动放行，步骤见 DISTRIBUTION.md。
NOTES

ls -lh "$OUT"
