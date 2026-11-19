# Cevtuo Causa 交接（P0 来源补齐完成，2026-11-19）

0.5.0 的发布状态见 `HANDOFF-7.md`；本文件只记录 P0「精确来源」这一轮做了什么、
还有哪些没做、以及下一步是否打 0.5.1。

---

## 0. 一句话状态

**P0 第 1–5 条已完成**：18 条口径、13 步扩散、18 个链证据来源都补了类型与抓取时间；
16 条口径和 12 步扩散落到精确发布页/数据集/文件。研究视图显示来源类型、发布日、
抓取日、数据集与 `single-source`。**没有重新打包，安装版仍是 0.5.0。**

---

## 1. 这轮改了什么

### 1.1 数据模型

- 新增 `src/core/source.ts`：
  - `SourceKind = release | dataset | document | portal | sample`
  - `isPreciseKind()` / `isSingleSource()` / `SOURCE_KIND_LABEL`
- `AlignmentSource` 增加：`urlKind`、`publishedAt`、`retrievedAt`、`dataset`、`revision`。
- `DiffusionStep` 增加：`urlKind`、`publishedAt`、`retrievedAt`、`docNumber`、`note`。
- `SourceMeta` 增加：`kind`、`url`、`dataset`、`publishedAt`、`retrievedAt`、`revision`、`note`。

### 1.2 口径 18 条（`src/data/alignment.ts`）

全部换成 2026-10/11 官方发布值，旧演示值不再保留：

| 指标 | 中国 | 美国 | 欧盟 |
|---|---|---|---|
| 制造业 PMI（10 月） | 49.3 | 55.5 | 52.7（终值） |
| CPI 同比 | +0.7%（10 月） | +3.7%（**9 月**） | +4.0%（10 月终值） |
| 失业率 | 5.1%（10 月） | 4.1%（10 月） | 6.2%（欧盟，9 月） |
| 政策利率 | 1.25% 隔夜逆回购（11-02 起） | 3.75–4.00% | 2.50% 存款便利 |
| 碳价 | ¥91.31/t（11-18） | 无联邦碳价 | €87.15/t（11-17 拍卖） |
| 房价 | 一线 0.0%（二线 −0.1、三线 −0.2）/ 2026-10 环比 | +0.3% 环比 / +2.7% 同比（8 月） | +1.2% 环比 / +4.7% 同比（Q2） |

关键修正：

- 中国政策利率已“换锚”：2026-11-02 起隔夜逆回购 1.25% 是主要政策利率，
  7 天逆回购 1.40% 改为择时补充工具。
- 美国 2026-10 CPI 同比因 2025-10 停摆缺基期，BLS 没发布；卡片用 9 月的 +3.7%，
  备注写明 10 月环比 +0.4%。
- 70 城没有单一环比数，改成一线/二线/三线三档。

### 1.3 扩散 13 步（`src/data/diffusion.ts`）

每条都有文件号/活动编号、发布日期、抓取日期：

- CBAM：EU 2023/956；英国炼油扩围咨询（2026-10-28 至 2027-01-20）；
  中国 **国环规气候〔2026〕1号**；美国 **H.R. 6787 / S. 3523**（未通过）。
- 转口：美国 **91 FR 58247 / USTR-2026-0498**；欧盟 **2026/1840**；
  东盟 **ATIGA Second Protocol**；墨西哥 **FR 2026-20341 / USTR-2026-0595**。
- 服务消费券：杭州服务消费季（报道页，置信度降为中）；广东金秋文旅补贴；
  商务部服务消费季；**国办发〔2026〕2号**。

阶段修正：

- 中国碳市场扩围 → **已完成**（2026 年度配额方案），不再挂“草案”。
- ATIGA 升级 → **已完成**（2025-10 签署，2026-03-09 合并文本）。
- 美国 CBAM 类法案 → 仍是**候选**，未通过。

### 1.4 链证据 18 个（`src/data/chains.ts`）

- 12 个有公开链接：国家统计局、上海航交所、EU ETS、海关、FRED、人民银行、
  地方商务局、公司财报、地方电网、云厂商、欧盟公报、Eurostat。
- 6 个是内部样本，明确标 `sample`、无 URL、tier ≥ 4：
  招聘平台、客户邮件、银行 App、本地样本、港口挂靠、港口样本。
- 上海航交所补到 SCFI 本期 2026-11-13；FRED 补到 MORTGAGE30US 2026-11-12 的 7.11%。

### 1.5 UI

- 口径卡片：来源类型徽标（发布页/数据集/门户/样本）、发布日、抓取日、数据集/修订、
  T3 才出现的 `single-source`。
- 扩散卡片：文件号、发布日、抓取日、边界说明、来源类型徽标。
- 链来源矩阵：有 URL 的来源名可点击。

### 1.6 测试

- `npm test`：11 files / 88 tests。
- 新增断言：
  - 18 条口径全部有链接与抓取日；非门户必须有发布日；精确来源 ≥ 16。
  - 13 步扩散全部有抓取日；精确步骤必须有发布日；文号 ≥ 10。
  - 18 个链来源全部有类型、抓取日、说明；样本不得伪装成 T1/T2。
- `npm run e2e:research` 新增：来源徽标 3 个、`抓取 2026-11-19` 全覆盖、
  `91 FR 58247` 与 `2026/1840` 可见。

---

## 2. 关键决定（不要推翻）

1. **数值以官方发布为准**：旧演示值只是示意，来源补齐后必须与页面一致，否则是错误归属。
2. **门户 ≠ 精确页**：人民银行 13 号公告、CBAM 正式期、美国无联邦碳价仍是 `portal`，
   不假装已核实到单篇文件。
3. **样本不回填假链接**：6 个 T4/T5 来源没有公开 URL，标 `sample` 并写清边界。
4. **不重新打包 0.5.0**：代码与数据改动在 `v0.5.0` 之后，安装版不显示新徽标。
5. **扩散阶段按事实改**：已发生的扩围/ATIGA 不再挂“草案”，未通过的法案不写“实施”。

---

## 3. 下一步

### P1：来源机制（建议先做，再发版）

1. 新建 `SOURCE_REGISTRY`：id / publisher / title / url / kind / tier / publishedAt /
   retrievedAt / revision / independence；口径、扩散、链证据只引用 id。
2. URL 健康检查脚本：HTTP 200 / last-modified / 重定向；403/000 白名单；
   结果写进 `SOURCE_HEALTH.md`，CI 每周跑。
3. 修订日志：同一指标新旧值并存，不覆盖。
4. 把人民银行的单篇公告、CBAM 实施条例、EPA 州级碳价页面继续找精确页。

### P2：发布 0.5.1

**建议打 0.5.1**，理由：这次是来源正确性与 UI 可见变化，不是新功能；0.5.0 的数字有事实错误
（中国 PMI、ISM 月份、中国政策利率、碳价），不应长期留在安装版。

发版清单：

- `package.json` / `Cargo.toml` / `tauri.conf.json` / 设置页 pill → 0.5.1
- universal 构建、DMG/ZIP、SHA
- GitHub Release `v0.5.1`
- 分发页版本、下载链接、SHA、功能索引
- `/Applications` 只保留 0.5.1
- `DISTRIBUTION.md` / `README.md` / `SOURCES.md` 同步

---

## 4. 文件地图

- `src/core/source.ts`：来源类型与判定
- `src/core/alignment.ts`：口径类型与规则
- `src/data/alignment.ts`：6 组指标（18 条精确来源）
- `src/core/diffusion.ts`：扩散类型
- `src/data/diffusion.ts`：3 个案例（13 步精确证据）
- `src/data/chains.ts`：`SOURCE_META`（18 个来源）
- `src/components/AlignmentView.tsx` / `DiffusionView.tsx` / `Quant.tsx`
- `src/core/alignment.test.ts` / `diffusion.test.ts` / `source.test.ts`
- `SOURCES.md`：来源清单与剩余缺口
- `HANDOFF-8.md`：本文件

---

## 5. 验证状态

- `npm test`：11 files / 88 tests，通过
- `npm run build`：通过（JS 530.37 kB，仍 >500 kB 提示未拆分）
- `npm run e2e:research`：通过
  - `sourceKindBadges: 3`
  - `asOf: true`
  - `docNumbers: true`
  - `diffAsOf: true`
  - `consoleErrors: []`
- 未跑：`cargo test`、`npm run e2e`、`e2e:m3`（本轮没改 Rust / 主流程）

---

## 6. 已知限制

1. 人民银行 13 号公告只有栏目页；单篇 URL 未定位。
2. 美国“无联邦碳价”只有 EPA 门户，是事实空白，不是数据页。
3. 6 个 T4/T5 样本没有公开链接，不进量化汇总。
4. CBAM 正式期仍是委员会门户，没有逐条落到 EUR-Lex。
5. 没有自动健康检查、修订日志、实时抓取。
6. BLS、S&P、ECB、广东政府等在本机 `curl` 403/000；已通过搜索索引核对正文，
   正式引用前仍需浏览器人工打开。
7. 没有重新打包；安装版 0.5.0 看不到新徽标。

---

## 7. 检查入口

- 来源清单：`/Users/cjw/Documents/Codex/cevtuo-causa/SOURCES.md`
- 生产构建：http://127.0.0.1:8131/cevtuo-causa/dist/
  - 看点：口径页每张来源卡的「发布页/数据集/门户/样本」徽标、发布日、抓取日；
    扩散页每一步的文件号与 `91 FR 58247`、`2026/1840`。
- 本地开发：http://localhost:5173/?now=2026-12-20T10:00:00
- 应用（仍是 0.5.0，不含本轮来源改动）：`/Applications/Cevtuo Causa.app`
- 旧数据：`/Users/cjw/Documents/Codex/causa-local-data-2026-11-19/`

---

## 8. 给新窗口的第一句话

```text
读 /Users/cjw/Documents/Codex/cevtuo-causa/HANDOFF-8.md，然后从「3. 下一步」P1 做起：
先建 SOURCE_REGISTRY 和 URL 健康检查，再决定是否按清单打 0.5.1。
```
