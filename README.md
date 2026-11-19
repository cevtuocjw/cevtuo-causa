# Cevtuo Causa / 因果簿

本地优先的因果账本：记录经济推断，到期结算，再投影到每个人的坐标。

**0.4 版**：在 0.3 的账本闭环之上，加入加密擦除、Keychain 异常恢复、备份恢复与
按类别校准。macOS 原生壳（Tauri 2 + SQLCipher + Keychain）已构建：
数据库文件头是密文、密钥在 Keychain、判定在退出重开后仍然保留。Android 尚未构建。

## 下载

- 分发页：https://apps.cevtuogrnd.com/causa/
- GitHub Release：https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.4.0
- 源码：https://github.com/cevtuocjw/cevtuo-causa

下载 `Cevtuo-Causa-0.4.0-macos-universal.dmg` 或 `.zip`，校验 `SHA256SUMS.txt`。

**没有 Apple Developer 账号，包未签名、未公证**：首次打开需要在系统设置里放行。
完整步骤、卸载与数据位置见 [DISTRIBUTION.md](DISTRIBUTION.md)。

## 运行

```bash
npm install
npm run dev      # 本地开发，默认 http://localhost:5173
npm run build    # 产出 dist/，可静态托管
```

## macOS 桌面版

```bash
npm run desktop:build                 # release .app
# 或快速验证：
npx tauri build --debug --bundles app # debug .app
open "src-tauri/target/release/bundle/macos/Cevtuo Causa.app"
bash scripts/verify-desktop.sh        # 检查 bundle / 数据库头 / Keychain

# 未签名的 universal 分发包（.dmg + .zip + SHA256）：
bash scripts/release.sh
```

Tauri 2 + SQLCipher + macOS Keychain；首次启动会请求 Keychain 访问。数据库在 `~/Library/Application Support/com.cevtuo.causa/causa.db`，保险箱弹窗会显示是否真的链接到 SQLCipher。细节见 `DESKTOP.md`。

## 已实现

- **账本**：因果带（事件 → 传导 ×2 → 变量 → 投影）、先行指标、今天/到期标尺、链条切换
- **量化条**：置信 62%、影响 +2.2、时滞 2.1Q、基率 58%、指标 1/3、来源 85、优先级 85、到期 3d
- **因子拆解**：汇率 +1.8、订单 +0.9、扩产 −0.3、招聘 −0.2，净 +2.2
- **12 个月投影**：中心线 + 扇形不确定性 + 目标线
- **优先级队列**：S/A/B/C、0–100 分、六条在链、状态徽标（锁定 / 到期 / 逾期）、图标判定
- **闭环**：新建 / 编辑链条 → 到期结算（先看反事实与快照、必须写理由）→ 10 秒撤销 → 校准
- **家庭投影**：链条设置暴露后，按公式显示“若成立”对月缓冲 / 缓冲月数的影响
- **首次启动**：空白账本 / 载入演示二选一；演示与迁移记录默认不计入校准
- **来源矩阵**：T1–T5、可信度条、延迟、正常/滞后
- **家庭现金流**：收入、固定支出、房贷、现金、负债、赡养；月缓冲、月供收入比、负债/年收入、缓冲月数；可手动校准 6 个数，或导入支付宝 / 微信 CSV 估算支出
- **模型 · 更新**：优先级公式、影响等级、Brier、ECE、覆盖、事件流、统计、校准日、来源健康
- **校准**：10 个置信度分桶（0–100%）、全部 / 最近 90 天、Brier、ECE、命中率、样本、覆盖
- **刷新**：六档更新频率面板、立即刷新、差异 toast、数字解码
- **支付**：不直连支付宝/微信，解释三条理由；支持手动填 6 个数与本地 CSV 解析（只估算支出，不推断收入/现金/负债，确认后入库）；PDF 明确不支持
- **⌘K 问账本**：本地解析，零网络请求
- **本地保险箱**：SQLCipher、macOS Keychain、零遥测、0 请求；导出 JSON / Markdown 到“下载”
- **设置**：存储状态、导出、重置、校准口径开关（是否包含演示记录）；底部显示最近 12 条本地审计
- **移动端**：≤980px 图标轨变底部栏、队列前置；≤680px 单列、因果带纵向
- **动效**：路径绘制、节点悬停扩张、数字解码、判定行离场、浮层进出；`prefers-reduced-motion` 降级

## 未接入（诚实空状态）

- 口径对齐、政策扩散、本地镜像：0.3 已从导航移除，尚未实现
- PDF 账单解析：未实现，界面明确提示只支持支付宝 / 微信 CSV

- 加密擦除、生物识别解锁：未做（审计写入已实现）
- Android 包：未构建
- macOS 签名与公证：**没有开发者账号，刻意不做**（见 `DISTRIBUTION.md`）

## 文档

- `FEATURES.md`：功能清单与完成度（哪些是 ✅ / 🟡 / ⛔）
- `DISTRIBUTION.md`：无开发者账号的分发路线、Gatekeeper 放行、校验与卸载
- `SPEC.md`：0.1 规格书（5000+ 中文字），产品、数据模型、安全、双端架构、路线图
- `SPEC-2.md`：0.2 增补（3000+ 中文字），支付接入决策、来源分级、更新节奏、量化体系、宏观/个人三层、Fey 复刻
- `REFERENCES.md`：10 个站点 × 5 项能力 = 50 项，逐项落点；Fey 主参考的设计系统对照

## 设计来源

- 主参考：**Fey**（nocturnal Bloomberg terminal）：`#0B0B0B` 画布、`#131313` 卡片、ember `#E87A4F`、16px 卡片、99px 控件、玻璃浮层、Inter Tight + IBM Plex Mono
- 50 项能力取自 DeepBook、Cyera、Grids、A24、SYBIOSME、Anthracite、AI Workflow Builder、FinovAi、Shakuro、Synetica
- 检查：`inspect.mjs --app` 在 1440 / 768 / 390 三档 **0 FAIL**；唯一 WARN 是 `tiny-text`（75% 文本低于 13px），这是数据终端密度选择，数值 13–22px、标签 11–12px

## 下一轮

1. PDF 账单解析（CSV 与手动 6 数已完成；仍不做支付直连）
2. 加密擦除 / 生物识别解锁
3. Regime 宏观层（利率、通胀、贸易、流动性、监管的 Z-score）
4. 口径对齐 / 政策扩散 / 本地镜像三个真页面
5. 语音命令与 3D 圆盘视图（本轮以队列与路径绘制替代）
6. Android 包；有了开发者账号再做签名与公证
