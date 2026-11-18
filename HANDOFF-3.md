# Cevtuo Causa 交接（第三轮，2026-11-18）

本文件取代 `HANDOFF-2.md` 的状态；历史细节仍可读 `HANDOFF.md` / `HANDOFF-2.md`。
项目根：`/Users/cjw/Documents/Codex/cevtuo-causa`

---

## 1. 一句话状态

`HANDOFF-2` 的三件欠账全部完成：**构建与账单测试通过、原生 audit 已实测并跨重启保留、
universal release 包已重打**。现在 `release/` 里的包包含家庭 6 数、CSV 解析与审计表。

---

## 2. 本轮完成

### 2.1 构建与测试

```bash
npm run build                                  # tsc + vite 通过
node --experimental-strip-types scripts/test-bills.mjs
# bills.test: 12 assertions passed
```

### 2.2 原生 audit 实测（原欠账）

工具：`scripts/ax-tool.swift`（AX 真实点击，不用坐标/键盘脚本，不会打断用户打字）。

- `swiftc -O scripts/ax-tool.swift -o /tmp/ax-tool`
- `/tmp/ax-tool dump` / `/tmp/ax-tool press <标签>`

实测过程与结果：

| 步骤 | 结果 |
|---|---|
| 首次打开设置 | 审计区显示“还没有记录。” |
| 点「成立」结算一条链 | DB 立即变化；`settle` 行写入 |
| 「更新状态」→ 面板「立即刷新」 | `refresh` 行写入 |
| 设置里导出 JSON | 文件写入 `~/Downloads/cevtuo-causa-2026-11-18.json`；`export` 行写入 |
| 退出重开 → 设置 | `refresh / export / settle` 三行仍在（倒序） |
| 导出 JSON 检查 | 顶层含 `household`（1260000 负债等），共 7 链 / 24 records |
| 重置数据 | 队列恢复 3 到期 + 4 在链；`reset` 行写入；`save_state 9120` |

注意：`更新状态` 按钮只展开面板，**真正写 refresh 的是面板里的「立即刷新」**。

### 2.3 universal release 重打

```bash
export PATH="$HOME/.cargo/bin:$PATH"
npx tauri build --target universal-apple-darwin --bundles app,dmg
bash scripts/release.sh --skip-build
```

验证：

- `lipo -archs` → `x86_64 arm64`
- `codesign --verify --deep --strict` → 通过，`Signature=adhoc`，`TeamIdentifier=not set`
- DMG 挂载后 App 内同样通过 codesign 校验
- 直接启动 release 包：设置页读得到 4 条审计；账本页有「手动校准 6 个数」入口
- 校验和（`release/SHA256SUMS.txt`）：

```
0e1b57e1182c41299536c61b31ff42b04c0ae528c82e1e59cde2e4667156a51d  zip  (12,387,065 B)
018dbd541458605a313632eb5f63afe593a48f2032163165a8e3c8dd57b75ab4  dmg  (12,760,165 B)
```

### 2.4 文档

- `FEATURES.md`：手动 6 数 ✅、CSV ✅（PDF ⛔）、审计 ✅；更新 `save_state` 数字与原生验证口径
- `README.md`：已实现/未接入/下一轮全部同步
- `DESKTOP.md`：持久化 payload、命令、验证记录、还没做清单
- `DISTRIBUTION.md`：当前产物大小、SHA256、构建时间

---

## 3. 仍然是未验证（不要写成已完成）

- **Intel 真机**：切片存在，但没在 Intel Mac 上运行过
- **Gatekeeper 真实拦截路径**：本机构建机关闭了 Gatekeeper，无法复现下载用户被拦
- **WKWebView 输入框自动化**：原生家庭表单只做了入口与持久化检查，没做原生输入；
  同一 React 代码在浏览器 CDP E2E 已通过
- **原生 CSV 文件选择**：Tauri 原生文件对话框未自动化测试（解析器本身有 12 条断言）
- **浏览器预览不写审计**：这是设计（`desktop.ts` no-op），不是缺陷

---

## 4. 关键决定（不要推翻）

1. 无开发者账号 ⇒ 不签名、不公证，不做自动更新
2. 账单解析只做**估算预填**，不推断收入 / 现金 / 负债；PDF 明确不支持
3. 审计只记动作，不记账单内容或密钥
4. 家庭数据与链条共用 `state` 同一行 JSON payload
5. 三页空状态（口径对齐 / 政策扩散 / 本地镜像）保留，明确写“尚未接入”
6. `TODAY = 2026-11-18`，数据源仍未接

---

## 5. 本机当前数据状态

- 数据库：`~/Library/Application Support/com.cevtuo.causa/causa.db`（SQLCipher）
- 已恢复默认 7 条链 / 23 records / 默认 household
- 审计表现有 4 条：`reset / refresh / export / settle`（测试痕迹，会保留）
- 导出文件：`~/Downloads/cevtuo-causa-2026-11-18.json`（测试产生）
- debug 包：`src-tauri/target/debug/bundle/macos/Cevtuo Causa.app`

---

## 6. 下一轮优先级

1. PDF 账单解析（明确不支持的提示已在 UI）
2. 加密擦除 / 生物识别解锁
3. 口径对齐 / 政策扩散 / 本地镜像三页
4. Android
5. Regime 宏观层

---

## 7. 环境与坑（沿用）

- 可执行文件名 `cevtuo-causa`；`.app` 目录名才是 `Cevtuo Causa`
- universal 需要 `x86_64-apple-darwin`；官方源 TLS 失败时用 rsproxy.cn
- `src-tauri/target` 数 GB，不要删
- 原生 UI 自动化用 `scripts/ax-tool.swift`，**不要**用坐标/键盘脚本
- 预览：`cd ~/Documents/Codex && python3 -m http.server 8131`
  → http://127.0.0.1:8131/cevtuo-causa/dist/
