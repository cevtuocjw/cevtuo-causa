> **0.4 的安全与恢复细节仍有效；0.5 的功能与发布状态见 `HANDOFF-6.md`。**

# Cevtuo Causa 交接（0.4 完成，2026-11-19）

本文件取代 `HANDOFF-4.md` 的状态；0.3 的历史细节仍可读 `HANDOFF-4.md` / `ROADMAP-0.3.md`。
项目根：`/Users/cjw/Documents/Codex/cevtuo-causa`

---

## 0. 一句话状态

**0.4.0 已完成并打包**：设置里可以真正加密擦除（删备份 / 数据库 / Keychain 密钥），
Keychain 缺失或异常时进入恢复页而不是覆盖旧库，校准可以按链条标签筛选。
两条浏览器 E2E 全绿，Rust 7 个测试全过，原生加密擦除与首启已实测；
universal 包已重建，x86_64 切片在 Rosetta 下启动通过。
**Intel 真机与 Gatekeeper 真实拦截仍未验证**。

⚠️ 另有一件与 0.4 无关但必须知道的事：**旧账本的 Keychain 密钥在本轮开始前就已经丢失**，
11 月 18 日的数据库和备份目前无法解密。原件已完整保留，位置见第 9 节。

---

## 1. 版本、提交与工作区

- 版本：**0.4.0**（`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、设置页 pill）
- 0.4 提交：`beeca3b feat(security): crypto erase, keychain recovery, and 0.4.0 release`
- tag：`v0.4.0`（已推送 GitHub）
- 远程：`https://github.com/cevtuocjw/cevtuo-causa`（public）
- Release：`https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.4.0`
- 分发页：`https://apps.cevtuogrnd.com/causa/`
- 工作区应是干净的；以下为 0.4 的改动清单（已提交）：
  - 修改：`src-tauri/src/lib.rs`、`src/App.tsx`、`src/core/stats.ts`、`src/core/stats.test.ts`、
    `src/lib/desktop.ts`、`src/styles/app.css`、`src/data/demo.ts`、`vitest.config.ts`、
    `package.json`、`src-tauri/Cargo.toml`、`Cargo.lock`、`tauri.conf.json`、`scripts/release.sh`、
    `README.md`、`FEATURES.md`、`DISTRIBUTION.md`
  - 新增：`src/components/VaultRecovery.tsx`、`src/components/DestroyDataDialog.tsx`、
    `src/data/demo.test.ts`、`HANDOFF-4.md`、`HANDOFF-5.md`

提交前请先看 `git diff`；不要把 `causa-local-data-2026-11-19/` 或任何 `keychain-key.txt` 提交进去。

---

## 2. 环境与启动

### 2.1 本机

- macOS（Darwin 27.0.0），Apple Silicon
- Node 22 / npm；Rust stable；`aarch64-apple-darwin`、`x86_64-apple-darwin` 已装
- Swift / swiftc 可用（`scripts/ax-tool.swift`）
- Chrome 157（headless CDP）

### 2.2 开发与预览

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa
npm run dev -- --port 5173 --strictPort
```

```bash
cd /Users/cjw/Documents/Codex
python3 -m http.server 8131
# http://127.0.0.1:8131/cevtuo-causa/dist/
```

### 2.3 测试

```bash
npm test                                         # 8 files / 65 tests
node --experimental-strip-types scripts/test-bills.mjs
cargo test --manifest-path src-tauri/Cargo.toml  # 7 tests
npm run build                                    # tsc + vite
```

### 2.4 浏览器 E2E

前置（与本轮实际使用的一致）：

```bash
npm run dev -- --port 5173 --strictPort
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9224 \
  --user-data-dir=/tmp/causa-e2e-profile \
  --no-first-run --disable-gpu \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows about:blank
```

运行：

```bash
npm run e2e       # 首启 → 演示 → 结算纪律 → 撤销 → 新建 → 未到期禁用
npm run e2e:m3    # 90 天窗 → JSON 恢复 → 暴露 → CSV 复核
```

本轮结果：两条都全绿，`consoleErrors: []`。

### 2.5 原生构建

debug：

```bash
export PATH="$HOME/.cargo/bin:$PATH"
npx tauri build --debug --bundles app
"src-tauri/target/debug/bundle/macos/Cevtuo Causa.app/Contents/MacOS/cevtuo-causa"
```

release：

```bash
npx tauri build --target universal-apple-darwin --bundles app,dmg
bash scripts/release.sh --skip-build
```

**DMG 坑**：挂载过的 DMG 会让 `bundle_dmg.sh` 报资源忙；先
`hdiutil detach "/Volumes/Cevtuo Causa" -force`。

---

## 3. 0.4 新增：加密擦除

### 3.1 用户流程

设置 → **销毁本地数据**：

1. 阅读警告（数据库、全部备份、Keychain 密钥都会被删）；
2. **必须点“导出 JSON”**，导出成功才解锁下一步；
3. 输入确认短语 `销毁全部数据`；
4. 点“永久销毁”；
5. 结果页逐项显示数据库 / 备份目录 / Keychain 是否删除；
6. 点“退出应用”；下次打开进入首启。

### 3.2 Rust 实现（`src-tauri/src/lib.rs`）

- `destroy_impl(paths, confirm, key_service, key_user)` 是核心：校验短语 → `remove_private_data`。
- `remove_private_data` 顺序：备份目录 → `causa.db` / `-wal` / `-shm` / `-journal` →
  `causa.db.before-restore-*` 副本 → Keychain 条目。
- 命令 `destroy_local_data` 先 `*conn = None` 关闭 SQLCipher 连接，再调用核心。
- 返回 `DestroyReport { db_removed, backups_removed, key_removed, errors }`。
- 短语错误时**一个文件都不动**；Rust 侧与前端各自校验。
- 删除后把 Vault 失败状态设为 `destroyed`，任何后续写命令都会失败并提示重启。

### 3.3 已实测（原生 debug）

- 载入演示 → 设置 → 销毁 → 导出 JSON（写入 `~/Downloads/cevtuo-causa-2026-11-19.json`）
  → 输入短语 → 永久销毁。
- 删除后：
  - `~/Library/Application Support/com.cevtuo.causa` 为空目录；
  - `backups/` 不存在；
  - `security find-generic-password -s com.cevtuo.causa -a db-key` 找不到条目；
  - 结果页三项均显示“已删除”。
- 点“退出应用” → 重新打开 → 出现“先写下第一条判断”（首启）。
- 随后用 `causa-local-data-2026-11-19/pre-destroy-demo-snapshot/` 恢复了演示库与密钥，
  重新启动后 7 条演示链和优先级 80 正常，证明恢复路径可用。

---

## 4. 0.4 新增：Keychain 异常恢复

### 4.1 分类

`VaultFailure.kind`：

| kind | 触发 | 行为 |
|---|---|---|
| `missing_key` | 数据库存在，Keychain 无条目 | **不新建密钥**，恢复页 |
| `keychain_locked` | `NoStorageAccess` | 提示解锁钥匙串后重试 |
| `keychain_denied` | `PlatformFailure` | 提示允许访问后重试 |
| `keychain_ambiguous` | 多条同名条目 | 提示清理重复项 |
| `keychain_bad_encoding` | 密钥不是 UTF-8 | 提示检查条目 |
| `key_mismatch` | 能打开文件但查询报 not a database / malformed | 提示从备份恢复 |
| `plaintext` | 文件头是明文 SQLite | 拒绝启动 |
| `sqlcipher` | `PRAGMA cipher_version` 为空 | 拒绝启动 |
| `destroyed` | 刚完成加密擦除 | 提示退出重开 |

关键保护：`obtain_key` 只有在 **数据库不存在** 且 `NoEntry` 时才创建新密钥。
数据库存在而条目缺失时直接失败，避免用新密钥覆盖旧库。

### 4.2 恢复页（`VaultRecovery.tsx`）

- 标题与说明按 `kind` 变化；
- 显示数据库路径、备份目录，可复制；可“在 Finder 中显示”；
- “重试读取”调用 `retry_vault`，成功后刷新页面；
- 列出 `backups/*.db`（名称、时间、大小），可确认后覆盖恢复；
- 恢复前把当前库另存为 `causa.db.before-restore-<秒>`；
- **没有“新建密钥”按钮**。

### 4.3 已实测

- 本轮开始时旧库就是 `missing_key`；启动后恢复页正确显示：
  “数据库在，但 Keychain 密钥不见了”、路径、两份备份、禁用新建密钥。
- 未创建新密钥（再次检查仍无条目）。
- Rust 测试覆盖：真实 Keychain 测试条目的写入 / 读取 / 删除；
  以及“短语错误不动文件与密钥、短语正确全部删除”。

---

## 5. 0.4 新增：校准按类别

- `src/core/stats.ts` 新增 `recordsForTag(records, chains, tag)`：
  - `null` / `"all"` 不筛选；
  - 通过 `record.chainId` 关联 `chain.tags`；
  - 迁移记录 `chainId=""` 不命中任何类别。
- `App.tsx` 校准页新增类别 chips（全部类别 / 个人 / 宏观 / 行业 / 政策……），
  只影响校准卡片、分桶表与“最近结算”，不影响账本顶栏的全局样本。
- 样本 <10 继续显示“只记录，暂不当作结论”，并标注当前类别。
- `demo.ts`：演示链补上宏观 / 政策 / 行业 / 个人标签；演示的合成记录轮流挂到演示链，
  仅用于让类别筛选可见。**真实迁移仍保持 `chainId=""`，不要照搬。**
- 新增 `src/data/demo.test.ts`；`vitest` include 从 `src/core/**` 放宽到 `src/**`。
- 原生实测：宏观 n=10；个人 n=6，提示“样本不足 10 条（类别：个人）”。

---

## 6. 验证矩阵（0.4）

| 项 | 方式 | 结果 |
|---|---|---|
| 领域逻辑 | `npm test` | 8 files / **65 tests** 通过 |
| Rust | `cargo test` | **7 tests** 通过（含真实 Keychain 删除、完整销毁核心） |
| 前端构建 | `npm run build` | 通过，JS 490.58 KB / gzip 154.19 KB |
| 闭环 E2E | `npm run e2e` | 全绿，console 0 error |
| M3 E2E | `npm run e2e:m3` | 全绿，console 0 error |
| 原生加密擦除 | debug + AX/坐标 | 目录空、备份删、Keychain 无条目、重启首启 |
| 原生恢复快照 | 覆盖 appdata + `security add-generic-password` | 演示链与优先级 80 恢复 |
| Keychain 恢复页 | debug + 截图 | 缺密钥分类、路径、备份列表、无新建密钥按钮 |
| 校准类别 | debug + AX/坐标 | 宏观 n=10；个人 n=6 且提示样本不足 |
| universal | `lipo -archs` | `x86_64 arm64` |
| x86_64 切片 | `arch -x86_64` + `vmmap` | `Code Type: X86-64 (translated)`，0.4.0 界面与数据库正常（Rosetta，不是真机） |
| Gatekeeper | `spctl --assess` | `accepted` 但同时 `override=security disabled`；**不能作为真实验证** |
| 签名 | `codesign -dv` | `Signature=adhoc`，`TeamIdentifier=not set` |
| DMG | `hdiutil attach` | 可挂载，内部 App 版本 0.4.0 |
| 校验和 | `shasum -c` | 两个产物 OK |
| release 冒烟 | universal app（arm64） | 演示库、设置 0.4.0、SQLCipher、手动备份生成 |

---

## 7. 发布产物

`release/`：

```
Cevtuo-Causa-0.4.0-macos-universal.dmg   12,905,193 bytes
Cevtuo-Causa-0.4.0-macos-universal.zip   12,525,045 bytes
RELEASE-NOTES.md
SHA256SUMS.txt

a32f5c15784feb75d89bc70395e628b09a339a83ec81db0624b912b0cba254e8  zip
633d8ab13d554b4a8b4f61cc6823df3908b4ba664e9194fd7d4b0b7747ef6624  dmg
```

- 0.3.0 的旧产物仍在 `release/`，不要误发。
- 0.4.0 的 DMG / ZIP / SHA 已上传到 GitHub Release；下载链接见分发页。
- 未签名、未公证；Gatekeeper 真实首次打开仍未验证。

---

## 8. 关键决定（延续 0.3，不要推翻）

1. 无 Apple 开发者账号：不签名、不公证，只做 ad-hoc；不做自动更新。
2. 演示 / 迁移记录默认不进校准；演示是用户显式选择。
3. 不允许提前结算；逾期 7 天后仍可结算，但标为逾期。
4. 家庭暴露用每条链的 `deltaPct`，单变量平移；不编造多链叠加。
5. 领域逻辑用 TypeScript `src/core`；Rust 只做持久化与安全。
6. 审计只记动作与摘要，不记金额；CSV 商户名只在复核页临时显示。
7. 空页面已从导航移除，不占位。
8. release 包未签名未公证；文档不引导关闭 Gatekeeper。
9. 0.3 的数据库已迁移到 v2；旧 0.2 包不要打开这个库。
10. **数据库存在时绝不新建密钥**；加密擦除必须删 Keychain。

---

## 9. 本机数据状态（重要）

### 9.1 旧账本密钥已丢失（本轮开始前）

- 2026-11-19 开始会话时，`com.cevtuo.causa / db-key` 已不存在；
  应用返回 `NoEntry`，旧 `causa.db` 与两份备份无法解密。
- 这不是 0.4 代码造成的；改动代码前第一次检查就是这样。
- 原件已完整保留，**没有删除**：
  - `~/Documents/Codex/causa-local-data-2026-11-19/old-appdata-missing-key/`
    - `causa.db`（SHA256 `d4c0cbe8…e15d52`）
    - `backups/causa-auto-2026-11-18.db`、`causa-manual-1794989916267.db`
  - `~/Documents/Codex/causa-local-data-2026-11-19/snapshot-at-start/`
    - 同一份密文快照；`key.txt` 为 0 字节（证明当时没有拿到密钥）
- 如果旧密钥能在 Time Machine / iCloud 钥匙串 / 旧机器找回，仍有恢复可能；
  否则只能作为历史留存。详见该目录的 `README.md`。

### 9.2 当前应用数据

- `~/Library/Application Support/com.cevtuo.causa`
- 当前是 2026-11-19 新建的**演示库**（7 条演示链，优先级 80），不是旧账本。
- Keychain 里有新密钥；对应备份在
  `~/Documents/Codex/causa-local-data-2026-11-19/pre-destroy-demo-snapshot/keychain-key.txt`。
- 本轮加密擦除测试导出的 JSON：`~/Downloads/cevtuo-causa-2026-11-19.json`。
- 当前 release 应用可能在运行；设置页显示 0.4.0。

### 9.3 恢复方法

见 `causa-local-data-2026-11-19/README.md`。核心：

```bash
APP="$HOME/Library/Application Support/com.cevtuo.causa"
# 先完全退出 App
mv "$APP" "$APP.before-restore-$(date +%s)"
cp -a "/Users/cjw/Documents/Codex/causa-local-data-2026-11-19/pre-destroy-demo-snapshot/appdata" "$APP"
security add-generic-password -s com.cevtuo.causa -a db-key \
  -w "$(cat /Users/cjw/Documents/Codex/causa-local-data-2026-11-19/pre-destroy-demo-snapshot/keychain-key.txt)" -U
```

恢复旧账本时不要写新密钥；旧密钥已经丢失。

---

## 10. 已知限制（不要当成已完成）

1. **Intel 真机/VM 未验证**；只有 Rosetta 下的 x86_64 切片。
2. **Gatekeeper 开启环境下的真实首次打开未验证**；本机 `spctl` 的 accepted 来自 `security disabled`。
3. 未签名、未公证；无自动更新。
4. 浏览器预览不持久化；桌面才写库。
5. `format.TODAY` 在模块加载时确定；跨午夜需刷新。
6. headless 截图受动画节流影响，必须带后台节流关闭参数。
7. E2E 不在 CI；CI 只跑单测/构建/cargo test。
8. 原生文件对话框（CSV / JSON）未自动化；浏览器用 CDP `setFileInputFiles` 测过。
9. 原生 UI 自动化受窗口最小化/焦点影响；本轮销毁链路是坐标点击 + AX 混合完成，
   不是稳定的 CI 脚本。
10. 旧账本因密钥丢失无法打开；这是数据事件，不是代码缺陷。
11. 加密擦除目前是“删文件 + 删密钥”，不是对磁盘块做覆写；SSD 上依赖密钥删除保证不可解密。
12. 恢复页的“在 Finder 中显示”用 `open` 打开数据目录；未做沙盒权限细分。

---

## 11. 0.5 建议优先级

### P0：真实分发验证

- 在一台 Gatekeeper 开启的 Mac / 干净 VM 上走首次打开，记录实际提示与放行步骤；
- Intel 真机或 x86_64 VM 跑 universal 包，确认启动、SQLCipher、编辑器；
- 用 `xattr -w com.apple.quarantine` 模拟下载包，验证文档步骤。

### P1：数据可恢复性

- 评估“密钥导出 / 恢复码”方案（用户显式保存，避免再次出现密钥丢失即全损）；
- 备份是否应使用独立密钥或包含密钥封装；
- 把 `causa-local-data-2026-11-19/README.md` 的恢复步骤纳入应用内帮助。

### P1：工程

- `App.tsx` 仍然 1763+ 行，建议拆视图、hooks、settings/import/backup 面板；
- 审计表加 `chain_id`，评估 hash 链；
- E2E 进 CI 或迁 Playwright；
- 可访问性：`.audit-time` 仍 10px；只做深色主题；新对话框在部分状态下未暴露到 AX 树，需复查；
- 文档版本一致性检查（0.3/0.4 混用）。

### P2：产品

- 校准类别与标签的编辑引导（现在标签是自由文本）；
- 家庭暴露的多链叠加仍明确不做；
- 生物识别解锁未做。

---

## 12. 检查入口

服务重启：

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa && npm run dev -- --port 5173 --strictPort
cd /Users/cjw/Documents/Codex && python3 -m http.server 8131
```

- 生产构建：http://127.0.0.1:8131/cevtuo-causa/dist/
  - 校准页：全部类别 / 个人 / 宏观 / 行业 / 政策；个人 n=6 的“样本不足”提示。
- 逾期视图：http://localhost:5173/?now=2026-12-20T10:00:00
- 原生 0.4.0：`release/Cevtuo-Causa-0.4.0-macos-universal.dmg`
  - 设置 0.4.0；销毁本地数据；恢复页（可临时移走 Keychain 条目复现，先备份）。
- 调试包：`src-tauri/target/debug/bundle/macos/Cevtuo Causa.app`

---

## 13. 回滚

- 代码：0.4 尚未 commit；要回到 0.3 可 `git checkout -- .` 并删除新增文件，
  或提交后 `git reset --hard v0.3.0`。
- 数据：关闭 App，用 `pre-destroy-demo-snapshot` 或旧目录覆盖；
  旧账本必须保留原 Keychain 密钥，否则备份也打不开。
- 不要删除 `src-tauri/target`（重建 SQLCipher/OpenSSL 很慢）。
- 不要用 0.2 包打开已迁移的 v2 数据库。


---

## 14. GitHub 与分发页（2026-11-19 完成）

### 14.1 仓库与 Release

- 源码：`https://github.com/cevtuocjw/cevtuo-causa`（public）
- 0.4.0 提交：`beeca3b`
- tag：`v0.4.0`
- Release：`https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.4.0`
  - `Cevtuo-Causa-0.4.0-macos-universal.dmg`（12,905,193 bytes）
  - `Cevtuo-Causa-0.4.0-macos-universal.zip`（12,525,045 bytes）
  - `SHA256SUMS.txt`

### 14.2 分发页

- 地址：`https://apps.cevtuogrnd.com/causa/`
- 源文件：GitHub Pages 仓库 `cevtuocjw/cevtuocjw.github.io` 的 `causa/`
- 设计参考：Awwwards SOTD「Grail」（2026-11-04）的固定产品画面 + 章节式排版；
  8 个章节、浅/深色块切换、左侧章节号、右侧“On this screen”、巨幅背景字。
- 页面是纯静态：`index.html` + `causa.css` + `causa.js` + `assets/`；
  没有构建步骤，直接改再 push 即可部署。
- 录屏：`assets/demo.mp4`，1440×900、H.264、约 51 秒、约 1.9 MB；
  由 CDP screencast 录真实浏览器界面，字幕条与光标是录制时注入的。
- 截图：账本、结算、校准、投影、账单、设置、销毁、恢复共 8 组。
- 页面覆盖：记录与编辑、结算纪律、校准、家庭暴露、CSV、保险箱、加密擦除、
  Keychain 恢复、平台与分发、明确不做的限制、安装/Gatekeeper、FAQ、SHA。

### 14.3 更新分发页

```bash
cd /tmp/cevtuo-pages      # sparse clone of cevtuocjw.github.io
# 修改 causa/ 后：
/usr/bin/git add --sparse causa
/usr/bin/git commit -m "update causa page"
GIT_ASKPASS=/tmp/causa-askpass.sh GIT_TERMINAL_PROMPT=0 /usr/bin/git push origin main
```

GitHub Pages 会自动构建；`gh api repos/cevtuocjw/cevtuocjw.github.io/pages/builds/latest`
可看状态。根目录 `index.html` 已加入 Causa 入口。

### 14.4 2026-11-19 二次更新（原始构想 + 首页位置）

- 分发页新增 `#origin`：原始 `SPEC.md` 的一句话、Causa 命名、目标用户、
  “五本账”（01–03 已交付，04–06 未交付/后续）、四条不让步的规则、0.1→0.4 时间线。
- `apps.cevtuogrnd.com` 根页新增 **featured card**：Causa 预览图、0.4.0 徽标、
  一句话说明，位于所有条目之前；列表里仍保留一条。
- 设计检查：按 Grail 版式特征允许 `eyebrow/mono/numbering/...` 后 **0 FAIL**；
  唯一 `contrast` 项是整页截图对 fixed ground 的静态误报，实际滚动时
  ground 为 `#f2f0f0`、章节文字为 `#182124`。

### 14.5 分发页的已知限制

- 页面下载的是 GitHub Release 资产，不是 Pages 上的文件；Release 被删会导致链接失效。
- 视频无音频、无旁白；字幕条在视频内，页面另附逐段文字说明。
- 页面没有中英文切换；当前只有中文。
- 未做 CMS，所有内容手工维护。
