# 0.3 路线图：从样板间到可用的账本

更新：2026-11-18 · 目标版本 0.3.0

## 成功定义

1. 全新安装后 10 分钟内写下第一条自己的判断；
2. 到期前不能结算，到期后必须写理由，撤销与审计一致；
3. 校准只统计用户自己的记录，分桶覆盖全部样本；
4. 载入失败、Keychain 异常、迁移失败都可见、可恢复，不静默覆盖。

## 范围冻结

**做**：链条编辑、结算纪律、撤销、校准修正、家庭暴露、JSON 恢复、安全校验、测试与 CI。

**不做**：AI 管线、Android、同步/CRDT、生物识别、crypto-erase、自动更新、PDF、三个空页面。

## 里程碑

### M0 基线 — 完成 2026-11-18

- [x] `git init`，基线 tag `v0.2.0-baseline`
- [x] MIT `LICENSE`（与 Cargo.toml 一致）
- [x] vitest + `npm test`
- [x] CI：web test/build + cargo test

### M1 领域核心 — 完成 2026-11-18

- [x] `src/core/types.ts`：Chain / PredictionRecord / StateV2，带 origin、快照、作废
- [x] `status.ts`：live / locked / due / overdue / settled 由时间推导
- [x] `validate.ts`：反事实必填、1–3 指标、到期日晚于登记日、暴露范围
- [x] `settle.ts`：未到期拒绝、miss/insufficient 必须写理由、快照、10 秒撤销
- [x] `stats.ts`：0–100% 十档、作废排除、默认只算 user、无样本返回 null
- [x] `migrate.ts`：v1→v2、seed 标记、日期平移、失败抛错
- [x] `commands.ts`：create / edit / updateSignpost / household / reset
- [x] 46 条 vitest 断言
- [x] UI 校准分桶从 5 档改为 10 档，ECE 由 0.103 变为 0.115（原先漏掉 4 条低置信记录）

**M1 验收命令**

```bash
npm test        # 6 files, 46 tests
npm run build
```

### M2 可用闭环 — 完成 2026-11-18

- [x] `ChainEditor`：三步表单（主张 / 证据 / 量化），反事实必填
- [x] `SettleDialog`：反事实 → 判定 → 理由，展示快照
- [x] 队列状态徽标（锁定 / 到期 / 逾期）；未到期按钮禁用并说明原因
- [x] 逾期横幅；结算后 10 秒撤销（toast 与核心窗口一致）
- [x] 首次启动：空白账本 / 载入演示二选一；演示默认不计入校准
- [x] App 接入 `src/core`，删除旧 `score()` 直接改 state 的路径
- [x] 空页面（口径对齐 / 政策扩散 / 本地镜像）从导航移除
- [x] 浏览器 CDP E2E：载入演示 → 逾期结算 → 撤销 → 新建（空反事实被拦）→ 编辑
- [x] 原生：0.2 数据库迁移到 v2、编辑器打开/取消、校准口径开关跨重启保留
- [x] CDP E2E 入仓库：`scripts/e2e-smoke.mjs`，`npm run e2e`（需 dev server + Chrome 9224）

### M3 口径与个人化 — 完成 2026-11-18

- [x] 校准页“全部 / 最近 90 天”；样本不足 10 条提示（按类别筛选未做）
- [x] 家庭暴露 `exposure`：income / fixed / mortgage / liquid / debt，投影用公式算
- [x] “负债率”改名“月供收入比”，另加总负债/年收入
- [x] JSON 导入恢复（覆盖前自动备份当前账本）；导出明文警告
- [x] 审计脱敏：household 不再记录金额
- [x] CSV 复核：逐笔列出、允许改判房贷 / 固定 / 其他；转账、还款、理财自动跳过
- [x] 修正“不计收支”被当成支出的判断（精确匹配 支出 / 收入）
- [ ] 按类别筛选校准（留在 M4+；当前只按时间窗）

### M4 安全与发布

- [ ] 启动校验数据库文件头；SQLCipher 未链接时拒绝启动
- [ ] Keychain 仅 `NoEntry` 新建密钥，其他错误报错并提供恢复
- [ ] schema_version 持久化；迁移前强制备份；每日加密备份保留 7 份
- [ ] 删除硬编码 `network_requests: 0`，改为可核查文案
- [ ] ErrorBoundary + 恢复页；持久化失败可见
- [ ] 0.3.0 universal 打包、原生冒烟、文档更新

## 默认决策

1. 演示记录默认不进校准，可手动打开。
2. 不允许提前结算；逾期 7 天后仍可结算但标记逾期。
3. 家庭暴露用每条链的 `deltaPct`，不引入复杂情景模型。
4. 领域逻辑先在 TypeScript `src/core` 落地；Rust 仍只做持久化与安全，Android 前再评估共享核心。

## 0.3 验收脚本（用户口径）

- [ ] 空白启动可新建链；反事实为空不能保存
- [ ] 到期前结算按钮禁用；到期后可结算
- [ ] miss / insufficient 不写理由不能提交
- [ ] 结算后 10 秒撤销，队列、校准、审计三处一致
- [ ] 校准只算自己的记录；分桶合计 = 样本数；n<10 有警告
- [ ] 改家庭数字后，设有暴露的链条投影变化
- [ ] 数据库损坏 / Keychain 异常有恢复界面
- [ ] 导出警告明文；JSON 能重新导入
- [ ] CI 全绿
