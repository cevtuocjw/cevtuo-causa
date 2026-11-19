# 分发：没有 Apple Developer 账号怎么发

更新时间：2026-11-19 · 版本 0.4.0

## 决定

没有付费的 Apple Developer Program 账号，就**不做 Developer ID 签名，也不做公证（notarization）**。
分发路线定为：

1. 源码放 GitHub（可审、可自行构建）；
2. Release 里放**未公证的 universal `.dmg` + `.zip`**；
3. 同时提供 `SHA256SUMS.txt`；
4. 安装说明写清楚 Gatekeeper 的放行步骤。

这是在没有开发者账号的前提下唯一诚实的做法：**不假装已签名，也不引导用户关闭 Gatekeeper**。

## 对用户意味着什么

- 首次打开会被 Gatekeeper 拦下，显示“Apple 无法验证此 App”。
  **没有付费账号就无法消除这一步**，任何声称能消除的做法都是骗人的。
- 应用是 **ad-hoc 签名**（`codesign -dv` 显示 `Signature=adhoc`，`codesign --verify --deep --strict` 通过）：
  它能保证包没被随手改坏，但**不能证明发布者身份**。用户需要自己核对 SHA256 或直接读源码构建。
- ⚠️ 构建机的 Gatekeeper 是关闭的（`spctl --status` = `assessments disabled`），
  所以“在这里能双击打开”不能说明下载用户也能。未公证的包在正常 Mac 上一定会被拦。
- 第一次启动会请求访问 Keychain（保存数据库密钥），选“允许”。
- 没有自动更新。升级 = 下载新版本替换 `/Applications/Cevtuo Causa.app`。

## 用户安装（macOS）

### 方式 A：DMG（推荐）

1. 下载 `Cevtuo-Causa-0.4.0-macos-universal.dmg`；
2. 打开，把 `Cevtuo Causa` 拖进 `Applications`；
3. 第一次打开被拦下后：
   - **macOS 15 Sequoia 及更新**：系统设置 → 隐私与安全性 → 拉到底 → “仍要打开”；
   - **macOS 13–14**：在 Finder 里右键 App → 打开 → 再点“打开”。
4. 或者在终端里去掉隔离标记（效果相同）：
   ```bash
   xattr -dr com.apple.quarantine "/Applications/Cevtuo Causa.app"
   open "/Applications/Cevtuo Causa.app"
   ```

### 方式 B：ZIP

解压后把 `Cevtuo Causa.app` 拖进 `Applications`，放行步骤同上。

### 校验下载

```bash
shasum -a 256 Cevtuo-Causa-0.4.0-macos-universal.dmg
# 与 release 页里的 SHA256SUMS.txt 对照
```

### 数据与卸载

- 数据：`~/Library/Application Support/com.cevtuo.causa/causa.db`（SQLCipher 加密）
- 密钥：钥匙串条目 `com.cevtuo.causa / db-key`
- 卸载：先在设置里点“销毁本地数据”（会删数据库、备份和钥匙串密钥），再删 App。
  如果 App 已删、只剩数据，可手动清理：
  ```bash
  rm -rf "$HOME/Library/Application Support/com.cevtuo.causa"
  security delete-generic-password -s com.cevtuo.causa -a db-key
  ```

## 开发者发布步骤

本机（Apple Silicon）构建 universal 产物：

```bash
cd ~/Documents/Codex/cevtuo-causa
export PATH="$HOME/.cargo/bin:$PATH"
# 第一次需要 x86_64 target；官方源慢时用镜像
# export RUSTUP_DIST_SERVER="https://rsproxy.cn"
# rustup target add x86_64-apple-darwin
bash scripts/release.sh
```

产物在 `release/`：

```
Cevtuo-Causa-0.4.0-macos-universal.dmg   12,905,193 bytes
Cevtuo-Causa-0.4.0-macos-universal.zip   12,525,045 bytes
SHA256SUMS.txt
```

### 当前产物的校验和（2026-11-19 10:15 重建）

0.4.0 包含：0.3 的全部功能，加上加密擦除（删数据库 / 备份 / Keychain 密钥）、
Keychain 异常恢复（缺密钥 / 锁定 / 权限拒绝 / 密钥不匹配）、备份恢复、
校准按标签筛选、SQLite `user_version` 结构版本。

验证记录（2026-11-19）：
- Apple Silicon：release 包启动、演示库加载、设置页 0.4.0、手动加密备份通过。
- x86_64 slice：用 `arch -x86_64` 在 Rosetta 下启动，`vmmap` 显示
  `Code Type: X86-64 (translated)`，界面与数据库读取正常。**不是 Intel 真机**。
- Gatekeeper：`spctl --assess` 显示 `accepted`，但同时打印
  `override=security disabled`；本机 Gatekeeper 关闭，**不能**证明下载用户能打开。
- 签名：`Signature=adhoc`，`TeamIdentifier=not set`。

```
a32f5c15784feb75d89bc70395e628b09a339a83ec81db0624b912b0cba254e8  Cevtuo-Causa-0.4.0-macos-universal.zip
633d8ab13d554b4a8b4f61cc6823df3908b4ba664e9194fd7d4b0b7747ef6624  Cevtuo-Causa-0.4.0-macos-universal.dmg
```

验证方式：`shasum -a 256 -c SHA256SUMS.txt`（在 `release/` 目录内执行）。

仓库已推送到 GitHub：`https://github.com/cevtuocjw/cevtuo-causa`（public，tag `v0.4.0`）。

```bash
cd ~/Documents/Codex/cevtuo-causa
gh repo create cevtuo-causa --public --source=. --remote=origin --push
```

发布到 GitHub：

```bash
gh release create v0.4.0 release/* \
  --title "Cevtuo Causa 0.4.0" \
  --notes-file release/RELEASE-NOTES.md
```

> 不要把这些命令直接自动化执行：仓库可见性与 Release 是对外发布动作，应由你本人确认。

`.github/workflows/release.yml` 也能在推 `v*` tag 时自动构建未签名的 universal 包并挂到 Release；
它同样不做签名/公证。

## 什么时候值得买开发者账号

- 想让普通用户双击就能开，不碰系统设置；
- 想消除“未验证开发者”的信任成本；
- 想用 Tauri 自动更新（更新包也要求签名）。

在那之前，保持现在的路线：源码 + 校验和 + 清楚的安装说明。
