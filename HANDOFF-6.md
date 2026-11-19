# Cevtuo Causa 交接（0.5，2026-11-19）

0.4 的安全、擦除、Keychain 恢复与发布细节仍见 `HANDOFF-5.md`；本文件只记录 0.5。

## 0. 一句话状态

**0.5.0 已完成**：最初五本账里的 **04 口径对齐** 和 **05 政策扩散** 做成了真实页面，
两者都能跳回相关链条；0.4 的加密擦除、Keychain 恢复与按类别校准继续保留。
release 已重建，分发页已更新到 0.5.0，并发布 15 秒研究视图录屏。

## 1. 提交与版本

- 版本：**0.5.0**（package / Cargo / tauri / 设置页 pill）
- 分发页：https://apps.cevtuogrnd.com/causa/
- 仓库：https://github.com/cevtuocjw/cevtuo-causa
- 本文件写入时的最新提交以 `git log` 为准；tag 应为 `v0.5.0`
- 0.4 的交接与数据事件见 `HANDOFF-5.md` 第 9 节

## 2. 新增功能

### 04 口径对齐

- `src/core/alignment.ts`：`direct / convert / not_comparable`、`canAverage`、`isFullySourced`、`orderedSources`、`alignmentSummary`。
- `src/data/alignment.ts`：6 组指标 × 中 / 美 / 欧（PMI、CPI、失业率、政策利率、碳价、房价）。
- `src/components/AlignmentView.tsx`：指标 tabs、三地区卡片、差异/处理、三条规则、全部指标索引、相关链跳转。
- 关键约束：只有 `direct` 允许取平均；演示数据全部是 `convert` 或 `not_comparable`；缺失地区不补 0。

### 05 政策扩散

- `src/core/diffusion.ts`：5 个阶段、置信度排序、`splitSteps`、`nextSteps`、`hasEvidence`、`diffusionCounts`。
- `src/data/diffusion.ts`：3 个案例（EU CBAM、美国转口关税审查、中国服务消费券），每步带证据与触发条件。
- `src/components/DiffusionView.tsx`：案例 tabs、阶段轨、置信度筛选、已发生/观察中/可能下一站三列、相关链跳转。
- 关键约束：置信度不是概率；时间窗是观察区间，不是承诺日期；没有触发条件不升级。

### 导航

- `View` 增加 `alignment` / `diffusion`；图标轨增加“口径 / 扩散”；移动端底部栏变为 5 个图标。
- TopBar finding：`6 组指标 · 3 个地区` 与 `3 个政策 · 5 个阶段`。

## 3. 测试与验证

```bash
npm test                 # 10 files / 78 tests
npm run build            # 通过；JS 约 514 KB / gzip 162 KB（有 >500KB 提示，未拆分）
npm run e2e              # 通过
npm run e2e:m3           # 通过
npm run e2e:research     # 通过：6 tabs / 3 regions / 3 cases / 5 stages / 相关链跳转
cargo test --manifest-path src-tauri/Cargo.toml   # 7 tests
```

原生 debug：

- 0.5.0 界面启动，图标轨出现“口径 / 扩散”。
- AX 打开“口径”后读到“同一指标，三种口径”“全部指标”“方向可比，水平不可直接平均”。
- AX 打开“扩散”后读到“政策扩散路径”“已发生 / 观察中 / 可能下一站”。

浏览器截图：

- `/tmp/causa-research-align.png`
- `/tmp/causa-research-diff.png`
- `/tmp/causa-dist/research-align-mobile.png`
- `/tmp/causa-dist/research-diff-mobile.png`

## 4. 发布产物

```
Cevtuo-Causa-0.5.0-macos-universal.dmg   12,920,025 bytes
Cevtuo-Causa-0.5.0-macos-universal.zip   12,545,485 bytes

c73d5419c6d2b642ce66b9172a8ca66d1312503cb523bfde2495b795fc45efee  zip
bdf8c7f692dcda052cdfad91914fd9dd071bbe01b8a832a8decbcb4336064a18  dmg
```

- 未签名、未公证；签名/公证状态与 0.4 相同。
- `release/` 里仍保留 0.3 / 0.4 旧产物，不要误发。

## 5. 分发页 0.5 更新

- 版本、下载链接、SHA 全部改为 0.5.0。
- 新增 `#research` 区块：15 秒口径/扩散录屏、两张真实截图、两段说明。
- `#origin` 的五本账：04 / 05 改为“已交付”，06 仍“后续”；时间线加 0.5。
- 功能索引新增“口径对齐”“政策扩散”两组，明确“不取平均 / 不把置信度当概率”。
- apps 首页 featured card 徽标改为 `NEW · 0.5.0`，描述提到口径/扩散。

## 6. 仍未做 / 仍未验证

1. **06 本地镜像**仍未做，不占位。
2. Intel 真机 / Gatekeeper 真实拦截 / Developer ID 签名公证仍未验证。
3. 研究视图是**本地静态快照**，没有实时抓取；新增指标/政策需要手工补数据与来源。
4. 口径的“T1/T2”是演示标注，不是自动校验；没有接官方 API。
5. 扩散的置信度是人工标注，不是概率；没有自动触发监控。
6. JS 单包 >500KB；0.6 可考虑把口径/扩散拆成动态 import。
7. `App.tsx` 仍偏大；研究视图已拆组件，但主壳还未拆。
8. 旧账本密钥丢失事件仍在；保留位置见 `HANDOFF-5.md` 第 9 节。

## 7. 检查入口

- 分发页：https://apps.cevtuogrnd.com/causa/
- 本地：http://localhost:5173/?now=2026-12-20T10:00:00
- 生产构建：http://127.0.0.1:8131/cevtuo-causa/dist/
- GitHub Release：https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.5.0
- 原生：`release/Cevtuo-Causa-0.5.0-macos-universal.dmg`
