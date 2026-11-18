# Cevtuo Causa 交接文档

更新时间：2026-11-18
项目根目录：`/Users/cjw/Documents/Codex/cevtuo-causa`

---

## 1. 一句话状态

共享前端已完成两轮（0.1 数据终端 → 0.2 Fey 风格 + 50 项参考能力 + 量化体系）；macOS 原生壳 **debug `.app` 已构建并实际运行**：SQLCipher 单元测试通过、数据库文件头是密文、Keychain 条目已创建、判定在退出重开后仍然保留，**当前 CSP 下 Tauri IPC 正常**（第 7 步的 CSP 故障预案未触发）。

第二轮做了功能审计与发布准备：死按钮已删除、保险箱导出（JSON/Markdown）真正实现、设置页（导出 + 二次确认重置）已可用、品牌图标已替换。
**没有 Apple Developer 账号 ⇒ 决定不签名、不公证**，用未签名的 universal `.dmg`/`.zip` + SHA256 + 源码分发，见 `DISTRIBUTION.md`。

---

## 2. 现在到底完成了什么

### 2.1 产品与规格

- 产品名：**Cevtuo Causa / 因果簿**
- 核心：本地优先的因果账本——记录经济推断，到期结算，再投影到家庭坐标
- `SPEC.md`：5038 个中文字，0.1 规格（数据模型、评分、AI 管线、安全威胁模型、双端架构、路线图）
- `SPEC-2.md`：3000 个中文字，0.2 增补（支付接入决策、五级来源、更新节奏、量化体系、宏观/个人三层、Fey 复刻）
- `REFERENCES.md`：10 个站点 × 5 项能力 = 50 项，逐项落点；Fey 主参考的设计系统对照
- `README.md`：运行说明、已实现/未接入、文档索引
- `DESKTOP.md`：Tauri / SQLCipher / Keychain 的构建与验证说明
- `scripts/verify-desktop.sh`：检查 bundle、数据库头、Keychain

### 2.2 前端（已可运行）

技术栈：React 19 + TypeScript + Vite 6 + `motion` + `lucide-react` + `@fontsource-variable/inter-tight` + `@fontsource/ibm-plex-mono`

已实现：

- 64px 图标轨（移动端变底部栏），标签只在 hover 提示
- 玻璃顶栏、玻璃命令胶囊（⌘K）、玻璃 tooltip / 刷新面板 / 支付与保险箱弹窗
- 顶部 briefing：`3 到期 · 2 反向 · 65.0% 命中 · 85 最高`
- 因果带（事件 → 传导 ×2 → 变量 → 投影）、今天/到期标尺、节点悬停、路径绘制
- 8 项量化条：置信 62%、影响 +2.2、时滞 2.1Q、基率 58%、指标 1/3、来源 85、优先级 85、到期 3d
- 因子拆解：汇率 +1.8、订单 +0.9、扩产 −0.3、招聘 −0.2，净 +2.2
- 12 个月扇形投影 + 目标线
- 优先级队列：S/A/B/C、0–100 分、六条在链、图标判定（✓ / ✕ / ?）
- 来源矩阵：T1–T5、可信度条、延迟、正常/滞后
- 家庭现金流：收入 28,000、固定 9,400、房贷 11,200、现金 86,000、负债 126 万、赡养 2；月缓冲 7,400、负债率 40%、缓冲 4.2 个月
- 模型 · 更新：优先级公式、影响等级、Brier、ECE、覆盖、事件流、统计、校准日、来源健康
- 校准：5 个分桶、HIT 65.0%、Brier 0.201、ECE 0.103、n=23、覆盖 100%
- 刷新面板：六档更新频率、立即刷新、差异 toast、数字解码
- 支付弹窗：不直连支付宝/微信的三条理由；手动 6 数 / 本地账单导入
- 浏览器端命令面板：本周到期 / 命中率 / 哪条链最不确定 / 我的投影 / 起草一条新链
- 移动端：≤980px 图标轨变底部栏、队列前置；≤680px 单列、因果带纵向、零横向溢出

### 2.3 原生后端（代码完成，编译通过）

已完成的文件：

- `src-tauri/Cargo.toml`
  - `tauri = "2"`（实际 2.12.6）
  - `rusqlite = { version = "0.32", features = ["bundled-sqlcipher-vendored-openssl"] }`
  - `keyring = { version = "3", features = ["apple-native"] }`
  - `rand`、`base64`、`serde`、`serde_json`
- `src-tauri/src/lib.rs`
  - `Db(Mutex<Connection>)`
  - `init_db`：`~/Library/Application Support/com.cevtuo.causa/causa.db`
  - 密钥：32 字节随机，base64，服务 `com.cevtuo.causa`，账户 `db-key`，存 macOS Keychain
  - `PRAGMA key` + `PRAGMA cipher_version`
  - 表：`state(id, payload, updated_at)`、`audit(id, action, detail, at)`
  - 命令：`vault_status`、`load_state`、`save_state`、`clear_state`
  - `#[cfg(test)] sqlcipher_is_linked` 单元测试（还没跑）
  - `#[cfg(debug_assertions)]` 启动日志：`[causa] db=... sqlcipher=...`、`[causa] load_state`、`[causa] save_state N bytes`
- `src-tauri/src/main.rs`：调用 `cevtuo_causa_lib::run()`
- `src-tauri/tauri.conf.json`
  - identifier `com.cevtuo.causa`
  - 窗口 1440×920，最小 1100×720
  - `frontendDist: "../dist"`，`devUrl: http://localhost:5173`
  - CSP：`default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost`
  - bundle targets `["app"]`，macOS minimum 13.0
- `src-tauri/capabilities/default.json`：`core:default`
- `src/lib/desktop.ts`
  - `isDesktop()` 检测 `__TAURI_INTERNALS__`
  - `loadState<T>()` / `saveState(state)` / `vaultStatus()`
  - 浏览器下全部 no-op / 返回 null
- `src/App.tsx`
  - 启动时 `loadState` 恢复 `{ chains, records, activeId }`
  - 350ms 防抖 `saveState`
  - 保险箱弹窗读取真实 `vaultStatus()`：SQLCipher / Keychain / causa.db / 0 请求 / 遥测关闭
  - 浏览器预览显示「未启用 / 浏览器预览」，不假装已加密

### 2.4 已经验证过的

- `npm run build` 通过（tsc + vite）
- 浏览器端 `h1 = 账本`，无运行时异常
- 浏览器端保险箱弹窗显示「浏览器预览 / 未启用」
- `inspect.mjs --app`：1440 / 768 / 390 三档 **0 FAIL，1 WARN**
  - 唯一 WARN：`tiny-text`（75% 文本低于 13px），已决定保留并辩护：数值 13–22px，标签 11–12px，轴刻度 11px
- 交互实测（浏览器）：
  - 刷新面板 6 行 + 「刷新完成：0 个来源变化，1 个指标待更新」
  - 支付弹窗 3 条理由
  - 判定 + toast + 撤销
  - ⌘K 返回 65.0% / 23 条
  - 390px 底部图标栏、队列前置、无横向溢出
- **`cargo check` 通过**：`Finished dev profile [unoptimized + debuginfo] target(s) in 4m 11s`，无错误

### 2.5 2026-11-18 桌面运行时验证（本轮完成）

证据都来自实际运行，不是推断：

- `cargo test sqlcipher_is_linked -- --nocapture` → `test tests::sqlcipher_is_linked ... ok`（1 passed）
- `npx tauri build --debug --bundles app` 成功，产物 36.16 MiB：
  `src-tauri/target/debug/bundle/macos/Cevtuo Causa.app`
- **注意可执行文件名是 `cevtuo-causa`，不是 `Cevtuo Causa`**（Tauri 用 crate 名）：
  `.../Contents/MacOS/cevtuo-causa`
- 首次启动日志：
  ```
  [causa] db=/Users/cjw/Library/Application Support/com.cevtuo.causa/causa.db sqlcipher=true
  [causa] load_state
  [causa] save_state 9016 bytes
  ```
  ⇒ 当前 CSP 下 IPC 正常，保险箱不需要降级 CSP。
- 数据库文件头是密文（`fc00 23ad 02ef …`），不含 `SQLite format 3`
- Keychain 条目存在：`com.cevtuo.causa / db-key`（`security find-generic-password` 可查到）
- **持久化实测**：在优先级队列点「成立」→ 队列 7→6，日志 `save_state 9071 bytes` → Cmd+Q 退出 → 重开 →
  `load_state` 后队列仍是 6、人民币链仍不在队列，`save_state 9071 bytes`（不是初始的 9016）⇒ 读回的是改动后的状态，不是默认值
- 启动日志里的 `error messaging the mach port for IMKCFRunLoopWakeUpReliable` 是 macOS 输入法框架的无害告警，可忽略

### 2.6 2026-11-18 第二轮：功能审计 + 发布准备

**审计出的未完成/假装完成项与处理：**

| 问题 | 处理 |
|---|---|
| `设置`、`分享`、顶部与链卡的 `更多`、`固定` 都是死按钮 | 分享/更多/固定删除；设置接上真正的设置弹窗 |
| 保险箱写“导出 全量 JSON + Markdown”但没有实现 | 新增 Rust 命令 `save_export`，写入“下载”目录；保险箱与设置都有导出按钮 |
| 没有导出/重置入口 | 设置页：JSON / Markdown 导出、二次确认“重置数据”（走 `clear_state`） |
| 支付弹窗“已读取文件”会误导 | 改为“已选择 X；解析器尚未实现，未读取文件内容”；弹窗增加关闭按钮 |
| `onlyDue` 过滤逻辑没有 UI 入口 | 删除死状态与处理函数 |
| Tauri 默认图标 | 换成与界面 Mark 一致的品牌图标（`icon.icns` / PNG 全套） |
| 三个空状态页 | 保留，页面明确写“尚未接入” |

**实测：**

- 设置弹窗：导出 JSON → `~/Downloads/cevtuo-causa-2026-11-18.json`（14,215 bytes，JSON 可解析，7 链 / 24 记录）
- 导出 Markdown → `~/Downloads/cevtuo-causa-2026-11-18.md`（1,386 bytes，中文表头与结果）
- 保险箱弹窗的“导出 JSON”单独再测通过（文件时间更新）
- 重置：确认前可取消；确认后队列恢复 7 条、日志 `save_state 9016 bytes`
- 死按钮在崩溃之外不再出现在 AX 树里（只剩“固定支出”这样的正常文案）

**发布决定（无 Apple Developer 账号）：**

- 不签名、不公证；ad-hoc 签名只能证明包未被改坏，不能证明发布者
- 产物：universal `.dmg` + `.zip` + `SHA256SUMS.txt`
- 用户首次打开需系统设置里“仍要打开”或 `xattr -dr com.apple.quarantine`
- 新增 `DISTRIBUTION.md`、`scripts/release.sh`、`.github/workflows/release.yml`、`.gitignore`

**release 产物实测（2026-11-18）：**

- `npx tauri build --target universal-apple-darwin --bundles app,dmg` 成功，release 无警告
- `tauri.conf.json` 增加 `bundle.macOS.signingIdentity: "-"`；Tauri 用 ad-hoc 签名，`codesign --verify --deep --strict` 通过
- `lipo -archs` = `x86_64 arm64`；`CFBundleShortVersionString` = 0.2.0；`icon.icns` 已换成品牌图标
- 产物：`release/Cevtuo-Causa-0.2.0-macos-universal.dmg`（12 MB，可挂载，内含 App 与 Applications 链接）、`.zip`（12 MB）、`SHA256SUMS.txt`
- 在 release 构建上复测：窗口加载 7 条默认数据、保险箱显示 `已加密 / SQLCipher · AES-256 / macOS Keychain / causa.db / 0 次请求`、保险箱导出 JSON 写入 `~/Downloads`（14,126 bytes，7 链 / 23 记录）
- **本机 Gatekeeper 是关闭的（`spctl --status` = assessments disabled）**：所以“本机能打开”不等于“下载用户能直接打开”；未公证的包在正常 Mac 上仍会被拦，必须按 `DISTRIBUTION.md` 放行

---

## 3. 现在没完成的（下一轮要做的）

已全部完成的（2026-11-18，证据见 §2.5）：SQLCipher 单元测试、debug `.app` 构建、原生应用启动、
数据库密文头、Keychain 条目、CSP 下 IPC、判定持久化。**第 7 步的 CSP 降级预案没有用到。**

剩下：

1. **签名 / 公证：无开发者账号，决定不做**（见 `DISTRIBUTION.md`）
2. Android AAB
3. 审计表没有写入 UI（`clear_state` 已有设置页入口，带二次确认）
4. 本地 CSV/PDF 账单解析与手动 6 数未实现
5. 口径对齐 / 政策扩散 / 本地镜像仍是空状态
6. 50 项能力里 3 项是转译/延后：3D 圆盘、半调网点、语音命令
7. universal 包尚未在 Intel 真机验证（构建产物会同时含两种架构，但本轮只在本机 Apple Silicon 跑过）

---

## 4. 关键决定（不要推翻）

1. **主参考是 Fey**，不是 data-terminal。Fey 的设计系统：`#0B0B0B` 画布、`#131313` 卡片、`#191919` 抬升、ember `#E87A4F`、signal blue `#479FFA`、growth `#4EBE96`、16px 卡片、999px 控件、玻璃浮层、Inter Tight + IBM Plex Mono。
2. **Fey 的底部命令条移到顶部玻璃胶囊**，因为它会压住图表。这是唯一刻意偏离，已写在 `SPEC-2.md §6.2`。
3. **不直连支付宝/微信支付**。没有第三方消费级读取 API；屏幕抓取违反条款；只需要 6 个聚合数。替代：手动 6 数 / 本地 CSV 导入。
4. **来源分 T1–T5**：数字必须来自 T1/T2 或两个独立 T3；否则标 `single-source`。
5. **刷新的是证据，不是结论**；置信度登记时冻结。
6. **优先级公式**：`P = 100 × (0.4I + 0.3C + 0.2U + 0.1R)`；S ≥ 85，A 70–84，B 55–69，C < 55。
7. **影响等级**：四条坐标绝对值之和 ≥6 L5、≥4 L4、≥3 L3、≥2 L2、其余 L1。
8. **Brier / ECE**：证据不足不计入 HIT 与 Brier 分母，但计入样本量。
9. **Tauri 2 + SQLCipher + Keychain**，不是 Electron，不是 Flutter。
10. **浏览器预览不假装加密**：显示“未启用”，桌面版才读 `vault_status`。
11. **无开发者账号就不签名、不公证**：不引导用户关闭 Gatekeeper，只提供放行步骤与 SHA256（`DISTRIBUTION.md`）。
12. **死按钮不留**：做不了的功能要么明确写“未实现”，要么删掉；分享/更多/固定已删除。
13. **导出写“下载”目录**：`save_export` 只接受安全文件名，前端不再假装有导出。

---

## 5. 环境与工具链

- macOS 27.0.1，arm64
- Xcode Command Line Tools：`/Library/Developer/CommandLineTools`
- Node v22.23.2，npm 10.9.8
- Rust 1.100.0（2026-11-09），装在 `~/.cargo`
- `~/.cargo/config.toml` 已配置 rsproxy 稀疏镜像（官方 rustup 下载很慢，改用镜像）：
  ```toml
  [source.crates-io]
  replace-with = "rsproxy-sparse"

  [source.rsproxy-sparse]
  registry = "sparse+https://rsproxy.cn/index/"

  [net]
  git-fetch-with-cli = true
  ```
- 如果用新终端，先：
  ```bash
  export PATH="$HOME/.cargo/bin:$PATH"
  ```
- universal 构建需要 `x86_64-apple-darwin` target；官方 rustup 源会 TLS 失败，用镜像装：
  ```bash
  export RUSTUP_DIST_SERVER="https://rsproxy.cn"
  export RUSTUP_UPDATE_ROOT="https://rsproxy.cn/rustup"
  rustup target add x86_64-apple-darwin
  ```
- `src-tauri/target` 已有约 677MB 编译产物；**不要删**，否则 SQLCipher/OpenSSL 要重编 10+ 分钟。
- 浏览器预览（视觉检查用，不是原生应用）：
  ```bash
  cd /Users/cjw/Documents/Codex
  python3 -m http.server 8131
  # http://127.0.0.1:8131/cevtuo-causa/dist/
  ```
  后台服务器有运行时长限制，停了就用上面命令重启；它只影响网页预览，不影响 `.app` 构建。

---

## 6. 文件地图

```
cevtuo-causa/
├── SPEC.md                  # 0.1 规格（5038 中文字）
├── SPEC-2.md                # 0.2 增补（3000 中文字）
├── REFERENCES.md            # 50 项参考能力 + Fey 对照
├── DESKTOP.md               # 原生壳构建/验证说明
├── DISTRIBUTION.md          # 无开发者账号的分发路线、Gatekeeper 放行、卸载
├── FEATURES.md              # 功能清单与完成度（✅/🟡/⛔）
├── HANDOFF.md               # 本文件
├── README.md
├── .gitignore
├── .github/workflows/release.yml   # v* tag → 未签名 universal 包
├── scripts/verify-desktop.sh
├── scripts/release.sh       # 本地构建 + 打包 + SHA256
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── dist/                    # 已构建的前端
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ChainGraph.tsx
│   │   ├── MaturityRuler.tsx
│   │   ├── CalibrationChart.tsx
│   │   ├── ProjectionMatrix.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── Quant.tsx        # QuantStrip / FactorWaterfall / ProjectionFan /
│   │   │                    # PriorityQueue / SourceMatrix / CashflowPanel /
│   │   │                    # BriefingStrip / RefreshPanel / MethodCard
│   │   ├── Shell.tsx        # IconRail / TopBar
│   │   └── Icon.tsx
│   ├── data/chains.ts       # 数据 + 量化函数
│   ├── lib/desktop.ts       # Tauri invoke 适配
│   ├── lib/format.ts
│   └── styles/tokens.css, app.css
└── src-tauri/
    ├── Cargo.toml
    ├── Cargo.lock
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── icons/
    └── src/
        ├── main.rs
        └── lib.rs           # SQLCipher + Keychain + commands
```

---

## 7. 下一步：按顺序执行

> 2026-11-18 已实际执行第 1–7 步并全部通过（结果见 §2.5）。下面保留原始步骤作为复现手册；
> 下一轮从**第 8 步**开始。第 7 步的 CSP 降级预案未触发。

### 第 1 步：确认前端仍然能构建

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa
npm run build
```

预期：`✓ built in ...`，无 TS 错误。

### 第 2 步：跑 SQLCipher 单元测试（最重要）

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa/src-tauri
export PATH="$HOME/.cargo/bin:$PATH"
cargo test sqlcipher_is_linked -- --nocapture
```

预期：`test tests::sqlcipher_is_linked ... ok`。

如果失败：
- 检查 `Cargo.toml` 的 `bundled-sqlcipher-vendored-openssl`
- 检查 `libsqlite3-sys` 是否真的链接 SQLCipher
- 不要删 `target/`，先看编译日志

### 第 3 步：构建 debug `.app`（先不要 release）

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa
export PATH="$HOME/.cargo/bin:$PATH"
npx tauri build --debug --bundles app
```

预期产物：

```
src-tauri/target/debug/bundle/macos/Cevtuo Causa.app
```

debug 会复用已经编译好的 OpenSSL/SQLCipher，比 release 快很多。release（`npm run desktop:build`）会重新编译 OpenSSL，可能再花 10–20 分钟。

### 第 4 步：直接从终端启动，看日志

```bash
# 可执行文件名是 cevtuo-causa（crate 名），上层的 .app 目录才叫 "Cevtuo Causa"
"src-tauri/target/debug/bundle/macos/Cevtuo Causa.app/Contents/MacOS/cevtuo-causa"
```

预期日志：

```
[causa] db=/Users/cjw/Library/Application Support/com.cevtuo.causa/causa.db sqlcipher=true
[causa] load_state
[causa] save_state NNNN bytes
```

如果看到 `sqlcipher=false`，说明 SQLCipher 没链接上，不要继续宣称加密。
如果看不到 `load_state`，说明前端 IPC 没通，优先检查 CSP。

### 第 5 步：验证数据库与 Keychain

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa
bash scripts/verify-desktop.sh
```

预期：

- bundle exists
- 数据库头不是 `SQLite format 3`
- Keychain 有 `com.cevtuo.causa / db-key`

手动检查：

```bash
xxd -l 16 "$HOME/Library/Application Support/com.cevtuo.causa/causa.db"
security find-generic-password -s com.cevtuo.causa -a db-key
```

### 第 6 步：验证持久化

在应用里：

1. 点「优先级」里任意一条的 ✓ 判定
2. 等 1 秒（350ms 防抖 + 写库）
3. 退出应用
4. 重新打开

预期：判定的链条仍然是已结算，队列数量保持减少后的状态。

如果没持久化：
- 看终端是否打印 `save_state`
- 看 `load_state` 是否返回了数据
- 检查 CSP / `__TAURI_INTERNALS__`

### 第 7 步：如果 CSP 阻断 IPC

现象：界面正常，但保险箱显示「检测中」，终端没有 `load_state`。

先把 `src-tauri/tauri.conf.json` 的：

```json
"security": { "csp": "..." }
```

临时改成：

```json
"security": { "csp": null }
```

重新构建，确认 IPC 通了；然后再逐步加回 CSP，并在 `DESKTOP.md` 记录最终可用的 CSP。不要在有 IPC 故障时宣称安全加固完成。

### 第 8 步：未签名 release 分发（2026-11-18 改为这条路线）

没有 Apple Developer 账号，所以**不签名、不公证**。构建 universal 包：

```bash
export PATH="$HOME/.cargo/bin:$PATH"
bash scripts/release.sh
```

产物在 `release/`：`Cevtuo-Causa-0.2.0-macos-universal.dmg`（12 MB）、`.zip`（12 MB）、`SHA256SUMS.txt`。
**2026-11-18 已构建并验证**：universal（x86_64 + arm64）、ad-hoc 签名、DMG 可挂载、release 构建可启动并导出。
用户首次打开需在“系统设置 → 隐私与安全性”里点“仍要打开”，或用 `xattr -dr com.apple.quarantine`。
完整说明见 `DISTRIBUTION.md`。

> ⚠️ 本机 Gatekeeper 是关闭的（`spctl --status` = `assessments disabled`），
> 所以这里无法复现下载用户被拦的真实路径；不要在验收时把“本机能打开”当成 Gatekeeper 已通过。

将来有了开发者账号，再补：Developer ID 证书 → `codesign --options runtime` → `notarytool` → `stapler`。

### 第 9 步：下一轮功能

- 审计表写入：判定、刷新、导出、销毁
- 设置页：导出全量 JSON + Markdown、crypto-erase、生物识别解锁
- 本地 CSV/PDF 账单解析（支付宝/微信导出）
- Regime 宏观层（利率、通胀、贸易、流动性、监管 Z-score）
- 口径对齐 / 政策扩散 / 本地镜像三个真页面
- Android AAB（Tauri 2 mobile，需要 Android SDK + NDK）

---

## 8. 已知风险与坑

1. **Keychain 首次启动**：应用会在 `setup` 里创建/读取 `db-key`。如果系统弹窗被拒绝，应用会启动失败；这是设计选择，不以明文继续。
2. **CSP 可能阻断 Tauri IPC**：Tauri 2 的注入脚本与 `connect-src` 需要匹配；按第 7 步处理。
3. **release 会重编 OpenSSL**：`bundled-sqlcipher-vendored-openssl` 在 release profile 下重新编译，耗时长；debug 验证优先。
4. **`cargo check` 的管道退出码**：之前命令是 `cargo check 2>&1 | tail -60`，退出码是 `tail` 的；但日志明确有 `Finished dev profile`，说明 check 成功。
5. **`sqlcipher=false` 不要掩盖**：`vault_status` 会返回真实值，界面会显示“未加密”；不要改成硬编码。
6. **`network_requests: 0` 是静态值**：Rust 侧没有 HTTP 客户端；将来加同步时必须重新计算。
7. **浏览器预览不是加密环境**：浏览器只用内存；保险箱弹窗显示“未启用”，不要把它当成桌面版。
8. **`tiny-text` WARN**：75% 文本低于 13px，是数据终端密度选择；如果用户要求更大，整体抬到 14px 正文，但会牺牲一屏信息量。
9. **图标已替换**：`src-tauri/icons/` 是 2026-11-18 生成的品牌图标；`icon.ico`（Windows）仍是旧文件，发布 Windows 前要重做。
10. **`clear_state` 已有 UI**：设置页“重置数据”，二次确认后才执行；别把它改成单击直接清空。
11. **未签名包会被 Gatekeeper 拦**：这是预期行为，不要在 README 里教用户关闭 Gatekeeper；只给“仍要打开”与校验和。
12. **ad-hoc 签名不证明身份**：用户核对 SHA256 或自行构建源码。
13. **universal 包未在 Intel 真机跑过**：本地构建成功了也只是“包含 x86_64 切片”，Intel 兼容性仍待真机验证。
14. **Keychain 首次授权被拒会导致启动失败**：设计如此，不以明文继续；用户重开并允许即可。
15. **导出文件名固定为 `cevtuo-causa-YYYY-MM-DD.json/md`**：同一天重复导出会覆盖，提示里给完整路径。

---

## 9. 关键数值（验收时对照）

> 2026-11-18 的持久化实测曾在库里把人民币链判定为「成立」，随后用设置页「重置数据」恢复，
> 现在桌面版与浏览器预览都是 **7 条默认数据**。重置也可直接删库：
> `rm "$HOME/Library/Application Support/com.cevtuo.causa/causa.db"` 后重开（Keychain 密钥保留，会重新建库）。

- 在链：7 条；本周到期：3 条；反向指标：2 个
- HIT：65.0%；Brier：0.201；ECE：0.103；n=23；覆盖：100%
- 人民币链：置信 62%、影响 +2.2、时滞 2.1Q、基率 58%、指标 1/3、来源 85、优先级 85（S）、到期 3d
- CBAM：优先级 74（A）；降息：80（A）
- 家庭：月缓冲 7,400、负债率 40%、缓冲 4.2 个月
- 更新节奏：事件流 15 min、统计发布日历 + 2h、链条复核 06:00、校准每月 1 日、全量重建 03:00、来源健康每小时

---

## 10. 新窗口的第一条消息（可直接粘贴）

> 读 /Users/cjw/Documents/Codex/cevtuo-causa/HANDOFF.md。运行时验证与未签名 universal 发行包已完成（§2.5 / §2.6）。
> 下一步按优先级选一个：A) 按 `DISTRIBUTION.md` 把 `release/` 发到 GitHub Release（需要用户已登录 `gh`，不要代替用户推送）；
> B) 做本地 CSV/PDF 账单解析与手动 6 数；C) 把判定/刷新/导出写进审计表。
> 不要重新引入签名/公证步骤（没有开发者账号）；不要删除 `FEATURES.md` 里的 ⛔ 标注来“显得完整”。
