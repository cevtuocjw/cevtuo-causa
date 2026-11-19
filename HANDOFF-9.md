# Cevtuo Causa 交接（P1 来源机制完成，2026-11-19）

0.5.0 发布见 `HANDOFF-7.md`；P0 精确来源见 `HANDOFF-8.md`。本文件只记录 P1
「来源注册表 + URL 健康检查」这一轮。

---

## 0. 一句话状态

**P1 已完成**：所有来源收敛到 `src/data/source-registry.json`，口径/扩散/链证据只引用
`sourceId`；`npm run source:health` 能检查 40 个公开链接并生成 `SOURCE_HEALTH.md`，
CI 每周一跑。**仍未重新打包，安装版仍是 0.5.0。**

---

## 1. 这轮改了什么

### 1.1 单一来源表

- 新增 `src/data/source-registry.json`：46 条来源。
  - 字段：`id / name / publisher / title / url / kind / tier / independence /
    publishedAt / retrievedAt / dataset / revision / note`。
  - 五类：`release`、`dataset`、`document`、`portal`、`sample`。
  - `independence`：`official / official-derived / secondary / internal / absence`。
- 新增 `src/data/sourceRegistry.ts`：`getSource(id)`，未知 id 返回 `undefined`。
- `AlignmentSource` 只剩 `region / sourceId / value / period / definition / note`。
- `DiffusionStep` 只剩 `region / stage / window / trigger / evidence / sourceId / note /
  confidence / status`。
- `SourceMeta` 只剩 `tier / reliability / latency / sourceId / note`。
- URL、发布日期、抓取日期、数据集/文号都只写在注册表里，三处数据不再重复。

### 1.2 健康检查

- `scripts/source-health.mjs`：
  - 并发 6，超时 15s，透明 UA（不伪装浏览器）。
  - 判定：`ok / blocked / missing / failed / unreachable / skipped`。
  - 401/403/412/429 → `blocked`；404/410 → `missing`。
  - 302 到登录页或 WAF 挑战页（ISM SSO、Federal Register unblock）→ `blocked`，
    不会因为最终 200 就当成可读。
- `scripts/source-health-allowlist.json`：9 条已知反爬/登录墙来源，逐条写原因；
  只容忍对应的 `blocked`，不掩盖 404 或新的域名失败。
- `.github/workflows/source-health.yml`：每周一 01:00 UTC、手动触发、注册表变更时跑；
  上传 `SOURCE_HEALTH.md`。
- `npm run source:health` 已加到 `package.json`。

### 1.3 本机结果

`SOURCE_HEALTH.md`：

- 总数 46
- ok 31
- blocked 9（全部在白名单）
- skipped 6（样本，无公开链接）
- missing / failed / unreachable 0

白名单里的 9 条：BLS ×2、S&P ×2、ISM、SEC EDGAR、海关总署、Federal Register ×2。

---

## 2. 关键决定（不要推翻）

1. **注册表是唯一事实表**：改来源只改 `source-registry.json`，不要在数据文件里复制 URL。
2. **未知 sourceId 不抛异常**：界面显示「来源未登记」，测试报红；避免一个缺来源把整页打崩。
3. **412 算 blocked**：海关等 WAF 预检失败不等于页面不存在。
4. **登录页/WAF 挑战页算 blocked**：最终 200 不代表读到了正文。
5. **白名单只容忍 blocked**：404 永远失败；新域名失败不会被旧白名单掩盖。
6. **样本不编链接**：6 个 T4/T5 来源继续标 `sample`，不伪装成公开页。

---

## 3. 下一步

### P2：发 0.5.1

P0 + P1 都已过测试，建议直接发 0.5.1。清单：

- `package.json` / `Cargo.toml` / `tauri.conf.json` / 设置页 pill → 0.5.1
- universal 构建、DMG/ZIP、SHA
- GitHub Release `v0.5.1`
- 分发页版本、下载链接、SHA、功能索引
- `/Applications` 只保留 0.5.1
- `DISTRIBUTION.md` / `README.md` / `SOURCES.md` 同步

### P2.1：来源机制再往前一步（可选）

1. 解析 `last-modified` / `ETag`，把“页面变了”与“页面挂了”分开。
2. 修订日志：同一指标新旧值并存，不覆盖。
3. 把健康检查结果按来源等级汇总：T1 断了要红色提示，T5 样本不提示。

---

## 4. 文件地图

- `src/data/source-registry.json`：46 条来源（唯一事实表）
- `src/data/sourceRegistry.ts`：`getSource(id)` 与类型
- `src/core/alignment.ts` / `src/data/alignment.ts`：口径，只引用 sourceId
- `src/core/diffusion.ts` / `src/data/diffusion.ts`：扩散，只引用 sourceId
- `src/data/chains.ts`：链来源 `SOURCE_META`，只引用 sourceId
- `src/components/AlignmentView.tsx` / `DiffusionView.tsx` / `Quant.tsx`
- `src/core/alignment.test.ts` / `diffusion.test.ts` / `source.test.ts`
- `scripts/source-health.mjs` / `scripts/source-health-allowlist.json`
- `SOURCE_HEALTH.md`：最近一次健康检查结果
- `.github/workflows/source-health.yml`
- `SOURCES.md`：来源清单与缺口

---

## 5. 验证状态

- `npm test`：11 files / 92 tests，通过
- `npm run build`：通过（JS 约 530 kB，仍 >500 kB 提示未拆分）
- `npm run e2e:research`：通过
  - `sourceKindBadges: 3`
  - `asOf: true`
  - `docNumbers: true`
  - `diffAsOf: true`
  - `consoleErrors: []`
- `npm run source:health`：通过（31 ok / 9 blocked 白名单 / 6 skipped）
- 未跑：`cargo test`、`npm run e2e`、`e2e:m3`（这轮只改来源数据与检查脚本；
  发版前仍需全跑一次）

---

## 6. 已知限制

1. 健康检查只判链接，不判数值是否被修订；没有 last-modified/ETag 解析。
2. 白名单里的 9 条只能人工在浏览器确认正文。
3. 人民银行 13 号公告、CBAM 正式期、美国无联邦碳价仍是 `portal`。
4. 数值仍是 2026-10/11 快照，不实时刷新。
5. 没有重新打包；安装版 0.5.0 看不到注册表与健康检查。

---

## 7. 检查入口

- 健康检查结果：`/Users/cjw/Documents/Codex/cevtuo-causa/SOURCE_HEALTH.md`
  - 看点：46 条里 31 ok、9 blocked（每条有原因）、6 样本跳过、0 missing。
- 来源注册表：`/Users/cjw/Documents/Codex/cevtuo-causa/src/data/source-registry.json`
- 生产构建：http://127.0.0.1:8131/cevtuo-causa/dist/
  - 看点：口径卡片仍显示来源徽标、发布日、抓取日；数据改从注册表读取后不应有空白卡。
- 本地开发：http://localhost:5173/?now=2026-12-20T10:00:00
- 应用（仍是 0.5.0）：`/Applications/Cevtuo Causa.app`

---

## 8. 给新窗口的第一句话

```text
读 /Users/cjw/Documents/Codex/cevtuo-causa/HANDOFF-9.md，然后按「3. 下一步」P2 发 0.5.1：
先 bump 版本与同步文案，再做 universal 构建、DMG/ZIP/SHA、GitHub Release、分发页与本机替换。
```
