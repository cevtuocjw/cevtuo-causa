> **已由 `HANDOFF-5.md` 取代（2026-11-19）。** 0.4 已完成；旧账本密钥丢失的数据事件
> 与保留位置见 `HANDOFF-5.md` 第 9 节。以下内容保留作 0.3 的历史记录。

# Cevtuo Causa 交接（0.3 发布后，2026-11-18）

本文件取代 `HANDOFF-3.md` 的状态；历史细节仍可读 `HANDOFF-3.md` / `ROADMAP-0.3.md`。
项目根：`/Users/cjw/Documents/Codex/cevtuo-causa`

---

## 0. 一句话状态

**0.3.0 已完成并打包**：用户能新建/编辑自己的链条、到期后按纪律结算、10 秒撤销、
看到按时间窗的校准、给链条设置家庭暴露、复核 CSV 分类、用 JSON 恢复账本；
数据库有启动校验、Keychain 分型错误处理、加密自动备份。release 包已重建、校验和冒烟通过。

明天从这里开始：**0.4 的加密擦除与 Keychain 恢复**，然后是 Intel / Gatekeeper 真实验证。

---

## 1. 明天贴进新窗口的话

```text
读 /Users/cjw/Documents/Codex/cevtuo-causa/HANDOFF-4.md，然后从「10. 明天从这里开始（0.4）」
第 1 条做起：先做加密擦除与 Keychain 异常恢复，再验证 Intel 与 Gatekeeper 真实路径，
最后更新文档并重新打包。
```

---

## 2. 版本、提交与工作区

- 版本：**0.3.0**（`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`）
- 最新提交：`ec3411a feat(security): encrypted backups, header checks, and 0.3.0 release`
- tag：`v0.2.0-baseline`、`v0.3.0-m1`、`v0.3.0-m2`、`v0.3.0-m3`、`v0.3.0`
- 里程碑提交：
  - `c88695a` M1 领域核心与 10 档校准
  - `15b600b` M2 链条编辑与结算闭环
  - `ac5121c` M3 暴露 / 90 天窗 / JSON 恢复
  - `b093a31` M3 CSV 复核
  - `ec3411a` M4 安全与 0.3.0 release
- 交接时工作区除了本文件外是干净的；**本文件尚未 commit**。

---

## 3. 环境与启动

### 3.1 本机

- macOS（Darwin 27.0.0），Apple Silicon
- Node 22 / npm；Rust stable，已安装 `aarch64-apple-darwin`、`x86_64-apple-darwin`
- Swift / swiftc 可用（`scripts/ax-tool.swift` 依赖）
- Chrome 157（headless CDP 用）

### 3.2 开发与预览服务

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa
npm run dev -- --port 5173 --strictPort     # Vite；只监听 localhost(IPv6)
```

```bash
cd /Users/cjw/Documents/Codex
python3 -m http.server 8131                 # 静态预览，服务 dist
# http://127.0.0.1:8131/cevtuo-causa/dist/
```

交接时两个服务都在运行；隔夜后大概率已停，按上面命令重启。

### 3.3 测试

```bash
npm test                                    # vitest：7 files / 59 tests
node --experimental-strip-types scripts/test-bills.mjs
cargo test --manifest-path src-tauri/Cargo.toml   # 2 tests
npm run build
```

### 3.4 浏览器 E2E（无 Playwright，走 CDP）

前置：

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
npm run e2e       # 首次启动 → 演示 → 结算纪律 → 撤销 → 新建 → 未到期禁用
npm run e2e:m3    # 90 天窗 → JSON 恢复 → 暴露 → CSV 复核
```

脚本会打印 JSON 结果并写截图到 `/tmp/causa-m2-*.png`、`/tmp/causa-m3-*.png`。
可用 `CDP_PORT`、`APP_URL`、`IMPORT_FILE`、`CSV_FILE` 覆盖默认值。

**headless 坑**：不关后台节流时，motion 退场动画可能卡住，截图会看到“旧弹窗没关”；
上面的 Chrome 参数就是为了避免这种假象。真实用户窗口不存在这个问题。

### 3.5 原生 UI 自动化

```bash
swiftc -O scripts/ax-tool.swift -o /tmp/ax-tool
/tmp/ax-tool dump --max-depth 40
/tmp/ax-tool press "设置"
/tmp/ax-tool press "包含演示"     # 支持 AXButton / AXTextField / AXCheckBox / AXRadioButton
```

只做 AX 点击，不用坐标/键盘，不抢用户输入焦点。
WKWebView 的输入框 **不接受** AX 置值；原生上不要尝试自动填表。

### 3.6 原生构建

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

**DMG 坑**：如果之前挂载过 DMG，`bundle_dmg.sh` 可能报 `couldn't unmount disk6 - 资源忙`。
先 `hdiutil detach /dev/disk6 -force`（或 `diskutil eject`）再重跑。

---

## 4. 架构与文件地图

### 4.1 分层

```
src/core       纯领域逻辑（无 React、无 Tauri），vitest 覆盖
src/lib        Tauri IPC、日期格式化、CSV 解析、legacy 视图适配
src/components 展示与交互
src/data       0.2 演示数据、demo 装载
src-tauri      Rust：SQLCipher、Keychain、审计、导出、备份
```

### 4.2 核心文件

| 文件 | 作用 |
|---|---|
| `src/core/types.ts` | `Chain` / `PredictionRecord` / `StateV2`、DEFAULT/EMPTY_HOUSEHOLD |
| `src/core/status.ts` | live / locked / due / overdue / settled 由时间推导 |
| `src/core/validate.ts` | 反事实必填、1–3 指标、日期、暴露范围 |
| `src/core/settle.ts` | settle / undoSettle；10 秒窗口；快照 |
| `src/core/stats.ts` | 10 档分桶、HIT/Brier/ECE、includeSeed、since |
| `src/core/migrate.ts` | v1→v2、v2 归一化、`parseStateJson` |
| `src/core/commands.ts` | createChain / editChain / updateSignpost / household / reset |
| `src/core/exposure.ts` | 家庭指标与暴露投影 |
| `src/core/time.ts` | 日期-only、本地日终、加天 |
| `src/lib/chain-view.ts` | CoreChain → 0.2 展示 Chain |
| `src/lib/desktop.ts` | load/save/audit/export/backup IPC；load/save 错误会冒泡 |
| `src/lib/bills.ts` | 支付宝/微信 CSV、逐笔 items、改判重算 |
| `src/data/demo.ts` | 演示账本（走迁移，seed，showSeedInStats=true） |

### 4.3 主要组件

- `ChainEditor.tsx`：三步表单；编辑时 72h 后置信度锁定
- `SettleDialog.tsx`：反事实 → 快照 → 判定 → 理由
- `BillReviewDialog.tsx`：逐笔改判房贷/固定/其他
- `FirstRunDialog.tsx`：空白 / 演示二选一
- `ErrorBoundary.tsx`：渲染崩溃错误页
- `CommandPalette.tsx`：本地问答；“起草”只打开编辑器预填，不直接入库
- `Quant.tsx`：队列状态徽标、家庭卡、校准等
- `App.tsx`：**1763 行**，仍偏大；0.4 建议拆分

### 4.4 Rust

`src-tauri/src/lib.rs`：

- `is_plaintext_sqlite`：读前 16 字节，明文库拒绝启动
- `init_db`：Keychain 取钥 → SQLCipher → 校验 `PRAGMA cipher_version`
- `load_or_create_key`：只有 `keyring::Error::NoEntry` 才新建
- `backup_db`：`VACUUM INTO`，`backups/causa-<label>.db`，同名幂等，保留 7 份
- `save_export`：只允许 ASCII 安全文件名，写下载目录
- `append_audit` / `list_audit` / `save_state` / `load_state` / `clear_state`

---

## 5. 数据模型与迁移

### 5.1 StateV2

```ts
StateV2 {
  schemaVersion: 2
  chains: Chain[]
  records: PredictionRecord[]
  household: Household
  activeId: string
  settings: { showSeedInStats: boolean }
}
```

Chain 关键字段：`openedAt`、`dueAt`、`counterfactual`、`confidence`、
`settledAt/outcome/settleReason`、`signposts[].history`、`impacts[4]`、
`exposure?`、`tags`、`origin: user|seed`。

Record：`chainId`、`confidence`、`outcome`、`settledAt`、`reason`、
`snapshot.signposts`、`origin`、`voidedAt?`。撤销只作废，不删除。

### 5.2 规则

- 到期日按本地当天 23:59:59 结束；到期前 72h 进入 locked
- 只有 due / overdue 可结算；miss / insufficient 必须写理由
- 结算后 10 秒内可撤销；撤销写 `settle_undo` 审计
- `origin=seed` 默认不计入校准；设置里可打开
- 90 天窗口按 `settledAt`；迁移记录没有时间，会被排除
- Brier / HIT / ECE 接收**已过滤**的记录；`calibration` 内部按 options 过滤

### 5.3 迁移

- v1（0.2 payload）→ v2：演示链标 `seed`，到期日按 `2026-11-18` 锚点平移到迁移日
- 23 条 0.2 records → `seed`、`chainId=""`、无时间/理由/快照
- household 保留；settings 默认 `showSeedInStats=false`
- 迁移前调用 `backup_db`；失败会提示但继续
- v2 重载会归一化缺失的 settings/household；坏 JSON 抛错，不静默重置

---

## 6. 关键决定（不要推翻）

1. 无 Apple 开发者账号：不签名、不公证，只做 ad-hoc；不做自动更新。
2. 演示 / 迁移记录默认不进校准；演示是用户显式选择。
3. 不允许提前结算；逾期 7 天后仍可结算，但标为逾期。
4. 家庭暴露用每条链的 `deltaPct`，单变量平移；不编造多链叠加。
5. 领域逻辑用 TypeScript `src/core`；Rust 只做持久化与安全；
   `causa-core` 共享层推迟到 Android 前再评估。
6. 审计只记动作与摘要，不记金额；CSV 商户名只在复核页临时显示。
7. 空页面（口径对齐 / 政策扩散 / 本地镜像）已从导航移除，不占位。
8. release 包未签名未公证；文档不引导关闭 Gatekeeper。
9. 0.3 的数据库已迁移到 v2；**旧 0.2 包不要打开这个库**。

---

## 7. 验证矩阵（0.3 已完成）

| 项 | 方式 | 结果 |
|---|---|---|
| 领域逻辑 | vitest | 7 files / 59 tests 通过 |
| 账单解析 | `test-bills.mjs` | 全部断言通过（含转账跳过、改判重算） |
| Rust | `cargo test` | 2 通过（明文头识别、SQLCipher 链接） |
| 前端构建 | `npm run build` | 通过，JS 约 476 KB / gzip 150 KB |
| 闭环 E2E | `npm run e2e` | 全绿，console 0 error |
| M3 E2E | `npm run e2e:m3` | 全绿：90d=0、导入、暴露、CSV 复核 |
| 原生迁移 | debug 包 + AX | `save_state 16074`，7 条 seed 链 |
| 原生编辑 | AX | 打开/取消新建链条 |
| 校准开关 | AX + 重启 | 包含演示：23 / ECE 0.115；默认：0 / — |
| 自动备份 | 启动后看目录 | `causa-auto-2026-11-18.db`，文件头非明文 |
| 手动备份 | AX 点“立即备份” | `causa-manual-*.db` 生成 |
| 保险箱 | AX | “已加密”“无网络模块” |
| universal | lipo / codesign | `x86_64 arm64`，ad-hoc 通过 |
| DMG | hdiutil attach | 可挂载 |
| 校验和 | `shasum -c` | OK |
| release 冒烟 | 直接启动 universal | 设置页 0.3.0、审计、导入/备份入口 |

---

## 8. 发布产物

`release/`：

```
Cevtuo-Causa-0.3.0-macos-universal.dmg   12,828,458 bytes
Cevtuo-Causa-0.3.0-macos-universal.zip   12,457,629 bytes
RELEASE-NOTES.md
SHA256SUMS.txt

4552bfc70beca16199f8d3a062e143286a18272be9f3077e3d0ada8eb5ae4a9f  dmg
eb34797f17f6636e7669e0b2ad6e80ea4710b96902f5596988d777f5272be46a  zip
```

- `Signature=adhoc`，`TeamIdentifier=not set`
- 本机 Gatekeeper 关闭，**不能**用它证明下载用户能打开
- 首次打开仍需“隐私与安全性 → 仍要打开”或 `xattr -dr com.apple.quarantine`

---

## 9. 当前本机数据状态

- 数据库：`~/Library/Application Support/com.cevtuo.causa/causa.db`，约 49 KB，已迁移 v2
- Keychain：`com.cevtuo.causa / db-key`（**不要删**；删了数据库和备份都打不开）
- 备份：`~/Library/Application Support/com.cevtuo.causa/backups/`
  - `causa-auto-2026-11-18.db`
  - `causa-manual-1794989916267.db`
  - 都是 SQLCipher 加密；同一把 Keychain 密钥
- 校准口径：原生库 `showSeedInStats=false`（默认只算用户）
- 审计表有测试痕迹：settle / settle_undo / refresh / export / reset / demo 等
- 测试导出在 `~/Downloads/cevtuo-causa-2026-11-18.*`
- 迁移前的 0.2 备份曾放在 `/tmp/causa-db-pre-m2.db`；`/tmp` 可能被清理，不能当正式备份

---

## 10. 明天从这里开始（0.4）

### P0：加密擦除（crypto-erase）

目标：设置里“销毁本地数据”不是重置，而是**删密钥 + 删库 + 删备份**。

- 强制先导出 JSON（或至少提示并二次确认）
- 要求输入确认短语，避免误触
- 删除顺序：备份目录 → 数据库文件 → Keychain 条目 → 内存 state 清空
- 删除后重启应进入首次启动
- 注意：备份使用同一密钥，不删 Keychain 等于没擦除
- 加测试：删除后 DB/backups/Keychain 均不存在（Rust 集成测试或脚本验证）

### P0：Keychain 异常恢复

现状：读取失败会报错、不再新建密钥，但用户只看到错误，无法自助恢复。

- 区分：条目缺失 / 权限拒绝 / 钥匙串锁定 / 数据库密钥不匹配
- 提供恢复页：重试、查看数据库与备份路径、从备份恢复、导出可用数据（若打得开）
- 不要提供“新建密钥”按钮去覆盖旧库
- 验证方式：临时把 Keychain 条目改错（先备份），确认应用拒绝启动且不覆盖

### P1：Intel 与 Gatekeeper 真实验证

- Intel 真机或 x86_64 VM 跑 universal 包，确认启动、SQLCipher、编辑器
- 在一台 Gatekeeper 开启的 Mac/VM 上走首次打开流程，记录实际提示
- 不要用本机（Gatekeeper 关闭）下结论

### P1：校准按类别

- 用 `tags` 做筛选（宏观 / 政策 / 行业 / 个人）
- 每类样本 <10 保持“只记录不结论”
- 补测试与 UI

### P2：工程与可用性

- `App.tsx` 1763 行拆分：视图、hooks、settings/import/backup 面板
- 审计表增加 `chain_id`，评估 hash 链（当前只有动作日志）
- DB schema 版本：目前 `schema_version=1` 是常量，实际结构版本在 payload；
  0.4 可加 `PRAGMA user_version` 或 meta 表
- E2E 进 CI（headless Chrome）或迁 Playwright
- 可访问性：`.audit-time` 仍 10px；只做了深色主题；触控/对比度走查
- 17 个文档与 release 包的版本一致性检查

---

## 11. 0.4 验收清单

- [ ] 销毁数据后：DB、backups、Keychain 条目都不存在；重启进入首启
- [ ] 销毁前必须可导出；取消导出不会删除
- [ ] Keychain 错误不会生成新密钥；恢复页可重试并显示路径
- [ ] Intel 真机/VM 启动通过
- [ ] Gatekeeper 开启环境下首次打开步骤被真实记录
- [ ] 校准可按类别筛选；小样本仍不结论
- [ ] 59+ 单测、Rust 测试、两条 E2E 全绿
- [ ] 0.4.0 universal 包重建、SHA 更新、文档同步

---

## 12. 检查入口（明天先看这些）

隔夜服务可能停了，先重启：

```bash
cd /Users/cjw/Documents/Codex/cevtuo-causa && npm run dev -- --port 5173 --strictPort
cd /Users/cjw/Documents/Codex && python3 -m http.server 8131
```

- 生产构建：http://127.0.0.1:8131/cevtuo-causa/dist/
  - 首启、演示、编辑器、校准 10 档/90 天、家庭暴露、CSV 复核、设置导入/备份
- 逾期结算：http://localhost:5173/?now=2026-12-20T10:00:00
  - 逾期横幅、反事实结算、miss 必须写理由、10 秒撤销
- 原生：`release/Cevtuo-Causa-0.3.0-macos-universal.dmg`
  - 设置 0.3.0；保险箱“无网络模块”；立即备份生成加密文件

---

## 13. 回滚与恢复

- 代码回滚：`git reset --hard v0.3.0`（当前无未提交的代码改动；本文件除外）
- 数据库回滚：关闭 App，把 `backups/causa-*.db` 覆盖回 `causa.db`；
  必须保留同一 Keychain 条目，否则备份也打不开
- 不要删除 `src-tauri/target`（数 GB，重建 SQLCipher/OpenSSL 很慢）
- 不要用 0.2 release 包打开已迁移的 v2 数据库
- 旧 0.2 payload 备份如果还在 `/tmp/causa-db-pre-m2.db`，只作历史参考，不是正式备份

---

## 14. 已知限制（不要当成已完成）

1. 明文库拒绝启动只在 Rust 单测验证过，未用真实明文库跑端到端。
2. Keychain 异常没有自助恢复 UI。
3. DB schema 版本仍是常量；payload schemaVersion 才是真的。
4. 审计没有 chain_id / hash 链，不是 tamper-evident。
5. 原生 CSV / JSON 文件对话框未自动化；浏览器用 CDP `setFileInputFiles` 测过。
6. Intel 真机、Gatekeeper 真实拦截未验证。
7. release 未签名未公证；无自动更新。
8. 浏览器预览不持久化，每次刷新都首启；桌面才写库。
9. `format.TODAY` 在模块加载时确定；跨午夜需刷新才更新。
10. 头less 截图受动画节流影响，必须带后台节流关闭参数。
11. E2E 不在 CI；CI 只跑单测/构建/cargo test。
12. 校准按类别筛选未做。
