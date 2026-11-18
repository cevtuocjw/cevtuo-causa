# Cevtuo Causa 交接（第二轮，2026-11-18）

本文件**取代** `HANDOFF.md` 里的过时状态；历史细节仍可读 `HANDOFF.md`。
项目根：`/Users/cjw/Documents/Codex/cevtuo-causa`

---

## 1. 一句话状态

macOS 原生壳已跑通并做出**未签名的 universal 发行包**；本轮又补了**家庭手动 6 数、支付宝/微信 CSV 解析、审计表写入与显示**。
代码与前端构建已通过，但 **audit 的原生交互尚未实测**，且 **`release/` 里的安装包是加这三个功能之前构建的，已过期**。

---

## 2. 本轮（第二轮）已完成

### 2.1 功能审计与修补

| 原问题 | 处理 |
|---|---|
| `设置/分享/更多×2/固定` 五个死按钮 | 分享、更多、固定删除；设置接上真弹窗 |
| 保险箱写「导出 JSON + Markdown」但没实现 | Rust `save_export` 写“下载”目录；保险箱与设置都有按钮 |
| 没有重置入口 | 设置页「重置数据」，二次确认后走 `clear_state` |
| 支付弹窗文案与实际不符 | 改为 CSV 已支持、PDF 未支持；加关闭按钮 |
| 默认 Tauri 图标 | 换成品牌图标（icns + PNG 全套） |
| `onlyDue` 死状态 | 删除 |
| release 下 unused 警告 | 清零 |

### 2.2 分发决定（无 Apple 开发者账号）

- **不签名、不公证**；只做 **ad-hoc 签名**（`bundle.macOS.signingIdentity: "-"`）
- 产物：universal `.dmg` + `.zip` + `SHA256SUMS.txt`
- 用户首次打开需「系统设置 → 隐私与安全性 → 仍要打开」或 `xattr -dr com.apple.quarantine`
- 构建机 **Gatekeeper 是关闭的**（`spctl --status` = `assessments disabled`），**本地无法复现下载用户被拦的真实路径**
- 文档：`DISTRIBUTION.md`

### 2.3 家庭 6 个数 + CSV 解析（新增）

- `src/data/chains.ts`：新增 `Household` / `initialHousehold`；删除旧 `CASHFLOW`
- `src/components/Quant.tsx`：`CashflowPanel` 改为接收 `household`，新增「手动校准 6 个数」入口
- `src/components/HouseholdForm.tsx`：6 个字段、实时预览（月缓冲 / 负债率 / 缓冲月数）、校验
- `src/lib/bills.ts`：支付宝 / 微信 CSV 解析
  - 表头识别、引号 CSV、¥/￥/千分位、UTF-8 与 GBK
  - 只估算 **月均支出 / 月均房贷 / 月均固定支出**（最近 3 个有数据的月份）
  - 明确不推断收入 / 现金 / 负债；结果只预填，用户确认才入库
- `src/App.tsx`：household 进入 `PersistedState`，350ms 防抖写库；导出 JSON/Markdown 也带家庭数据
- 测试：`scripts/test-bills.mjs`（12 条断言，已通过）

### 2.4 审计表（新增）

- `src-tauri/src/lib.rs`：`append_audit`、`list_audit`，写入既有 `audit` 表
- `src/lib/desktop.ts`：`appendAudit` / `listAudit`（浏览器 no-op）
- `src/App.tsx` 已埋点：`settle`、`refresh`、`draft`、`export`、`import`、`household`、`reset`
- 设置弹窗底部显示最近 12 条审计

---

## 3. 已验证 / 未验证（不要混为一谈）

### 已验证

- 前端 `npm run build` 通过（tsc + vite）
- 账单解析：`node --experimental-strip-types scripts/test-bills.mjs` → 12 assertions passed
- 浏览器端 E2E（CDP，真实输入事件）：
  - 手动表单 6 个输入 → 预览 `月缓冲 12,000 / 负债率 33% / 6.7 个月` → 保存后现金面板同步
  - 用真实 file input 导入微信样例 CSV → 提示“7 笔支出、月均 ¥11,753、房贷 ¥11,200、固定 ¥367”，预填 `[30000,367,11200,120000,500000,1]`
- 原生 debug：`save_state` 从 9016 → **9120 bytes**（household 已进入持久化 payload）
- 早前已验证：SQLCipher 密文头、Keychain、判定持久化、CSP 下 IPC、ad-hoc 签名 universal 包

### 未验证

- **原生 audit 交互**：设置页是否显示审计行、操作后是否新增、退出重开是否保留 —— 代码已编译进 debug 包，但尚未跑
- **原生家庭持久化**：WKWebView 的输入框不接受 AX 置值，键盘脚本也不可靠，未做原生化输入测试；同一份 React 代码在浏览器已通过
- **原生 CSV 文件选择**：Tauri 原生文件对话框未自动化测试
- **导出 JSON 是否已包含 household**：代码已加，但改动后未重新导出验证
- **Intel 真机**：universal 切片存在，未在 Intel Mac 上运行
- **Gatekeeper 真实拦截路径**：本机已关闭 Gatekeeper

---

## 4. 关键决定（新窗口不要推翻）

1. 无开发者账号 ⇒ **不签名、不公证**，不做自动更新
2. 死按钮不留；未完成功能必须明确写“未实现”
3. 账单解析只做**估算预填**，不假装知道 6 个数；不联网、不读账单以外内容
4. 审计只记**动作**，不记录账单内容或密钥
5. 家庭数据与链条共用同一个 `state` 行（JSON payload）
6. 三页空状态（口径对齐 / 政策扩散 / 本地镜像）保留，明确写“尚未接入”
7. 演示日期仍固定为 `TODAY = 2026-11-18`，真实数据源未接

---

## 5. 文件地图（本轮涉及）

```
src/
├── App.tsx                        # household/audit/导出/设置 全部接线
├── components/
│   ├── HouseholdForm.tsx          # 新增：6 数表单
│   ├── Quant.tsx                  # CashflowPanel 改 props；新增校准入口
│   └── Shell.tsx                  # 死按钮移除；设置接线
├── data/chains.ts                 # Household / initialHousehold；CASHFLOW 删除
├── lib/
│   ├── bills.ts                   # 新增：CSV 解析 + 编码
│   └── desktop.ts                 # save_export / audit / clearState
└── styles/app.css                 # household-form / audit 样式

scripts/
├── test-bills.mjs                 # 新增：解析器回归
├── release.sh                     # universal 打包 + SHA256
└── verify-desktop.sh

src-tauri/src/lib.rs               # save_export / append_audit / list_audit
src-tauri/tauri.conf.json          # signingIdentity "-"
.github/workflows/release.yml      # v* tag → 未签名 universal
DISTRIBUTION.md / FEATURES.md / HANDOFF.md / HANDOFF-2.md
release/                           # 已过期的安装包（需重build）
```

---

## 6. 立即要做的（按顺序）

### 第 1 步：确认代码仍能构建

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa
npm run build
node --experimental-strip-types scripts/test-bills.mjs
```

### 第 2 步：原生 audit 实测（本轮欠的）

```bash
export PATH="$HOME/.cargo/bin:$PATH"
npx tauri build --debug --bundles app
"src-tauri/target/debug/bundle/macos/Cevtuo Causa.app/Contents/MacOS/cevtuo-causa"
```

在应用里：设置 → 看审计是否为空；点一条「成立」；点刷新；导出一次；再开设置 → 应出现 `settle / refresh / export`。
退出重开 → 设置里仍应看到这些记录。

### 第 3 步：重做过期的 release 包

`release/` 里的包**不含** household / CSV / audit，必须重打：

```bash
export PATH="$HOME/.cargo/bin:$PATH"
npx tauri build --target universal-apple-darwin --bundles app,dmg
bash scripts/release.sh --skip-build
```

然后验证：

```bash
lipo -archs "src-tauri/target/universal-apple-darwin/release/bundle/macos/Cevtuo Causa.app/Contents/MacOS/cevtuo-causa"
codesign --verify --deep --strict "src-tauri/target/universal-apple-darwin/release/bundle/macos/Cevtuo Causa.app"
hdiutil attach -nobrowse -readonly release/Cevtuo-Causa-0.2.0-macos-universal.dmg
```

### 第 4 步：同步文档（现在有部分过时）

- `FEATURES.md`：CSV 解析、手动 6 数、审计写入应改为 ✅；PDF 仍为 ⛔
- `README.md`：“未接入”里删掉 CSV/手动 6 数与审计
- `DISTRIBUTION.md`：补上新的 SHA256 与产物时间

### 第 5 步：之后的功能优先级

1. PDF 账单解析（目前明确不支持）
2. 加密擦除 / 生物识别解锁
3. 口径对齐 / 政策扩散 / 本地镜像三页
4. Android
5. Regime 宏观层

---

## 7. 环境与坑

- 可执行文件名是 `cevtuo-causa`（不是 `Cevtuo Causa`）
- universal 需要 `x86_64-apple-darwin`；官方 rustup 源会 TLS 失败：

```bash
export RUSTUP_DIST_SERVER="https://rsproxy.cn"
export RUSTUP_UPDATE_ROOT="https://rsproxy.cn/rustup"
rustup target add x86_64-apple-darwin
```

- 本机 Gatekeeper 关闭，不要用它证明“下载版能打开”
- WKWebView 输入框：AX `set value` 不触发 React；不要用坐标/键盘脚本硬打字，会打断用户当前工作
- 预览服务器常因后台时限停掉，需要时重启：

```bash
cd /Users/cjw/Documents/Codex && python3 -m http.server 8131
# http://127.0.0.1:8131/cevtuo-causa/dist/
```

- `src-tauri/target` 很大（数 GB），**不要删**，否则 SQLCipher/OpenSSL 要重编
- 当前本机数据库是默认 7 条数据；测试产生的导出文件在 `~/Downloads/cevtuo-causa-2026-11-18.*`
