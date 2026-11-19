# Cevtuo Causa 交接（0.5.0 已发布，来源审计进行中，2026-11-19）

0.4 的安全/擦除/Keychain 细节见 `HANDOFF-5.md`；0.5 的功能与发布见 `HANDOFF-6.md`。
本文件记录 0.5.0 发布之后的状态、来源缺口和下午的续做入口。

---

## 0. 一句话状态

**0.5.0 已发布并安装**：口径对齐、政策扩散两个研究视图可用；0.5.0 的 DMG/ZIP 在 GitHub Release，
分发页已更新。**来源审计只完成了“官方门户链接 + 清单”，精确发布页、日期、抓取时间、修订号仍未补。**
本机只保留 0.5.0 一个安装版本。

---

## 1. 版本、提交与发布

- 应用版本：**0.5.0**
- 0.5.0 发布提交：`8526f40 feat(research): alignment and policy diffusion views, 0.5.0`
- tag：`v0.5.0`（指向 `8526f40`）
- 之后的提交（**未重新打包**）：
  - `9f5b4eb feat(sources): add source inventory and official links`
  - `34d5ac9 docs(sources): record URL reachability limits`
- 工作区干净。
- 仓库：https://github.com/cevtuocjw/cevtuo-causa
- Release：https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.5.0
- 分发页：https://apps.cevtuogrnd.com/causa/ （仍显示 0.5.0）

### 1.1 发布产物

```
Cevtuo-Causa-0.5.0-macos-universal.dmg   12,920,025 bytes
Cevtuo-Causa-0.5.0-macos-universal.zip   12,545,485 bytes

c73d5419c6d2b642ce66b9172a8ca66d1312503cb523bfde2495b795fc45efee  zip
bdf8c7f692dcda052cdfad91914fd9dd071bbe01b8a832a8decbcb4336064a18  dmg
```

---

## 2. 本轮已完成

### 2.1 来源清单

- 新增 `SOURCES.md`：链证据、口径来源、扩散证据、页面文案/素材，逐项列出来源、等级、缺口。
- `AlignmentSource` / `DiffusionStep` 增加 `url`。
- 18 条口径来源、13 条扩散证据补了**官方门户/文件链接**。
- 口径地区卡片、扩散证据文字可点击打开。
- 测试强制每条来源/证据必须有 `http(s)` URL。
- 两个视图明确写：链接是官方门户，精确发布页与抓取时间仍待补。
- URL 连通性已记录在 `SOURCES.md` 第 7.1 节；部分站点 403/000 是反爬/代理，不是已逐页核实。

### 2.2 macOS 仅保留 0.5.0

- `/Applications/Cevtuo Causa.app`：0.4.0 → **0.5.0 universal**（`x86_64 arm64`，codesign 通过，设置页 0.5.0）。
- 已删除：0.3/0.4 的 DMG/ZIP、0.5.0 debug `.app`、0.4.0 安装版。
- 只保留：
  - `/Applications/Cevtuo Causa.app`（0.5.0）
  - `release/Cevtuo-Causa-0.5.0-macos-universal.dmg`
  - `release/Cevtuo-Causa-0.5.0-macos-universal.zip`
  - `src-tauri/target/universal-apple-darwin/release/bundle/macos/Cevtuo Causa.app`（同一份 0.5.0 构建）
- `~/Downloads/cevtuo-causa-*.json/md` 是数据导出，不是安装版本，未删除。
- 旧账本数据事件仍在：`/Users/cjw/Documents/Codex/causa-local-data-2026-11-19/`，不要删。

---

## 3. 来源现状（最关键）

完整表见 `SOURCES.md`。摘要：

| 层 | 数量 | 已有 | 仍缺 |
|---|---|---|---|
| 链证据 | 18 个来源名 | 名称、等级、可信度、延迟、抓取时间 | URL、数据集/表号、发布日期、修订、独立性 |
| 口径 | 6 指标 × 3 地区 = 18 | 官方门户 URL、值、期间、定义、T1/T2 | 精确发布页、publishedAt、retrievedAt、dataset、revision |
| 扩散 | 3 案例 × 13 步 | 官方文件/门户 URL、阶段、触发条件、置信度 | 精确文号/法案号、发布日期、触发监控源 |
| 页面文案 | — | SPEC/SPEC-2/FEATURES/HANDOFF | 无外部事实断言，主要是产品自述 |
| 页面素材 | — | 本机真实界面截图/录屏 | 无 |

### 3.1 口径来源

PMI（NBS / ISM / HCOB）、CPI（NBS / BLS / Eurostat HICP）、失业率（NBS / BLS CPS / Eurostat LFS）、
政策利率（PBoC / Fed / ECB）、碳价（全国碳市场 / 美国无联邦 / EU ETS）、房价（NBS 70 城 / Case-Shiller / Eurostat HPI）。

### 3.2 扩散证据

CBAM（EUR-Lex 2023/956、definitive regime、UK consultation、MEE、US Congress）、
转口关税（USTR、EU anti-circumvention、ASEAN、USMCA）、
服务消费券（杭州、广东、地方商务跟踪、国务院/财政部）。

### 3.3 明确未做

- 没有实时抓取；所有数值是演示快照。
- 没有自动来源健康检查/修订日志。
- 没有把门户链接当成“精确数据页”。
- 链证据仍只有名字，没有 URL。

---

## 4. 关键决定（不要推翻）

1. **0.5.0 是当前正式安装版**；来源 URL 的代码改动在 tag 之后，**没有重新打包**。
   当前安装的 0.5.0 不显示可点击来源链接。
2. **不要为了“门户链接”重发 0.5.0**；等精确发布页、日期、修订补齐后，打 0.5.1/0.6。
3. 来源只认 T1/T2 或两个独立 T3；单一 T3 标 `single-source`，不进量化汇总。
4. 口径冲突保留两个值，不取平均；缺失地区不补 0。
5. 扩散置信度不是概率；时间窗不是承诺日期；没有触发条件不升级。
6. 分发页版式继续以 Grail 为参考；内容必须与 `SOURCES.md` 的来源状态一致。
7. 旧账本数据不可解密，保留原件，不覆盖、不删除。

---

## 5. 下午从这里开始

### P0：补齐精确来源（先做这个）

1. **口径 18 条**：把官方门户换成精确发布页/数据集页。
   每条补：`url`（精确页）、`publishedAt`、`retrievedAt`、`dataset`、`revision`、`note`。
   优先顺序：
   - NBS：PMI / CPI / 失业率 / 70 城（表号与发布页）
   - BLS：CPI news release / CPS
   - Eurostat：HICP / LFS / HPI 数据集代码
   - ISM / S&P Global PMI 报告页
   - PBoC 7 天逆回购操作公告
   - Fed FOMC statement / ECB decision
   - EU ETS EUA 价格来源 / 全国碳市场成交价
   - Case-Shiller 20 城指数页
2. **扩散 13 步**：补精确文件号/法案号/公告号、发布日期、证据页。
   - EUR-Lex 2023/956 的生效条款
   - UK CBAM consultation 具体页面
   - MEE 扩围方案文件号
   - USTR Federal Register 文号
   - EU anti-circumvention 案件号
   - ASEAN 工作组文件
   - 杭州/广东公告编号
   - 国务院/财政部文件号
3. **链证据 18 个来源**：补 URL、数据集/表号、发布日期、修订号；不再只有名字。
4. **UI**：来源名可点击、显示 `as of`、单来源标 `single-source`；精确页缺失时明确标“门户”。
5. **测试**：每条来源必须有 `url` + `publishedAt` + `retrievedAt`；URL 检查可先允许 403/反爬白名单。

### P1：来源机制

- 新建 `SOURCE_REGISTRY`（id / publisher / title / url / tier / publishedAt / retrievedAt / revision / independence）。
- 数据只引用 source id，不重复写名字。
- 健康检查脚本（HTTP 200 / last-modified / 重定向）+ CI 周检。
- 修订日志：旧版本保留，不覆盖。

### P2：发布

- 精确来源补齐并通过测试后，再决定 **0.5.1 或 0.6**。
- 需要同步：
  - `package.json` / `Cargo.toml` / `tauri.conf.json` / 设置页 pill
  - `DISTRIBUTION.md` / `README.md` / `HANDOFF-6.md` / `SOURCES.md`
  - universal 构建、DMG/ZIP、SHA
  - GitHub Release
  - 分发页版本、下载链接、SHA、功能索引
  - 本机 `/Applications` 只保留新版本

---

## 6. 文件地图

### 来源与数据

- `SOURCES.md`：来源清单、缺口、URL 检查
- `src/core/alignment.ts`：口径类型与规则
- `src/data/alignment.ts`：6 组指标数据（含 `url`）
- `src/core/diffusion.ts`：阶段/置信度规则
- `src/data/diffusion.ts`：3 个案例数据（含 `url`）
- `src/components/AlignmentView.tsx` / `DiffusionView.tsx`
- `src/core/alignment.test.ts` / `diffusion.test.ts`
- `src/data/chains.ts`：链证据与 `SOURCE_META`（仍无 URL）

### 发布与分发

- `HANDOFF-5.md`（0.4 安全）、`HANDOFF-6.md`（0.5 功能）
- `DISTRIBUTION.md`：0.5.0 产物、SHA、Gatekeeper
- `release/`：只保留 0.5.0 DMG/ZIP/SHA/Notes
- 分发页源码：GitHub `cevtuocjw/cevtuocjw.github.io` 的 `causa/`
  - 本地稀疏克隆可能在 `/tmp/cevtuo-pages`；若被清理，重新 clone：
    ```bash
    git clone --depth 1 --filter=blob:none --sparse \
      https://github.com/cevtuocjw/cevtuocjw.github.io.git /tmp/cevtuo-pages
    cd /tmp/cevtuo-pages
    git sparse-checkout set --no-cone '/*' '!/*/'
    # 修改 causa/ 后：git add --sparse causa && git commit && git push
    ```
- `causa.js` 里的 `data-copy-sha` 目前是 0.5.0 的 DMG SHA。

### 本机数据

- 当前应用数据：`~/Library/Application Support/com.cevtuo.causa`（演示库）
- 旧账本原件：`/Users/cjw/Documents/Codex/causa-local-data-2026-11-19/`
- 最终安装：`/Applications/Cevtuo Causa.app`（0.5.0）

---

## 7. 验证状态

- `npm test`：10 files / 78 tests（来源 URL 测试已在 tag 后提交）
- `cargo test`：7 tests
- `npm run e2e` / `e2e:m3` / `e2e:research`：通过
- `npm run build`：通过（JS >500KB 提示未拆分）
- 0.5.0 universal：arm64 启动、设置 0.5.0、SQLCipher；x86_64 切片此前已验证 Rosetta
- 来源改动：**未重新打包**，所以 0.5.0 安装版没有可点击来源链接

---

## 8. 已知限制

1. 精确来源页、发布日期、抓取时间、修订号仍未补。
2. 链证据没有 URL/数据集；来源健康检查未做。
3. 研究视图是本地静态快照，没有实时抓取。
4. 06 本地镜像仍未做。
5. Intel 真机 / Gatekeeper 真实拦截 / 签名公证仍未验证。
6. 旧账本密钥丢失事件仍在；数据不可解密，原件保留。
7. JS 单包 >500KB；`App.tsx` 仍偏大。
8. 分发页目前中文；内容手工维护；下载依赖 GitHub Release。

---

## 9. 检查入口

- 来源清单：`/Users/cjw/Documents/Codex/cevtuo-causa/SOURCES.md`
- 应用（0.5.0）：`/Applications/Cevtuo Causa.app`
- 分发页：https://apps.cevtuogrnd.com/causa/
- GitHub：https://github.com/cevtuocjw/cevtuo-causa
- Release：https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.5.0
- 本地开发：http://localhost:5173/?now=2026-12-20T10:00:00
- 生产构建：http://127.0.0.1:8131/cevtuo-causa/dist/
- 旧数据：`/Users/cjw/Documents/Codex/causa-local-data-2026-11-19/`

---

## 10. 给新窗口的第一句话

```text
读 /Users/cjw/Documents/Codex/cevtuo-causa/HANDOFF-7.md，然后从「5. 下午从这里开始」P0 第 1 条做起：先补齐口径与扩散的精确来源页、发布日期和抓取时间，再补链证据 URL，最后决定是否打 0.5.1。
```
