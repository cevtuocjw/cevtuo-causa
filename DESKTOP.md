# 桌面版：Tauri 2 + SQLCipher + macOS Keychain

这一轮把共享前端接进了 macOS 原生壳。前端仍然是同一套 React 代码；桌面版多了 Rust 后端、加密数据库与 Keychain。

## 已接线

- **Tauri 2**：窗口 1440×920，最小 1100×720，标识 `com.cevtuo.causa`
- **SQLCipher**：`rusqlite` 的 `bundled-sqlcipher-vendored-openssl`，AES-256
- **Keychain**：32 字节随机密钥，服务名 `com.cevtuo.causa`，账户 `db-key`
- **持久化**：`state` 表保存 v2 `{ schemaVersion: 2, chains, records, household, activeId, settings }`，前端 350ms 防抖写回；旧 0.2 payload 启动时迁移（自动备份在 0.3 M4 补上）
- **导出**：`save_export` 把 JSON / Markdown 写入“下载”目录，文件名只允许安全字符；JSON 含家庭 6 数
- **审计表**：`audit` 记录 chain_create / chain_update / settle / settle_undo / refresh / export / household / reset / demo_load，只记动作与摘要，不记金额；设置页显示最近 12 条
- **命令**：`vault_status`、`load_state`、`save_state`、`clear_state`、`save_export`、`append_audit`、`list_audit`
- **CSP**：`default-src 'self'`，只允许本地资源与 Tauri IPC；无远程字体、无远程图片
- **零网络**：Rust 侧没有任何 HTTP 客户端，`network_requests` 恒为 0

## 运行

```bash
cd ~/Documents/Codex/cevtuo-causa
npm install                 # 已装过可跳过
npm run build               # 先产出 dist/
npm run desktop:dev         # 开发窗口（会先起 vite）
# 或
npm run desktop:build       # 产出 .app
open "src-tauri/target/release/bundle/macos/Cevtuo Causa.app"
```

首次运行会看到 Keychain 询问是否允许访问；允许后写入 `db-key`。如果拒绝，应用会启动失败并提示恢复，不会以明文数据库继续。

## 验证

2026-11-18 已在 debug 构建上完成运行时验证：`sqlcipher=true`、数据库头为密文、Keychain 有
`com.cevtuo.causa / db-key`、判定在退出重开后仍然保留；当前 CSP 下 IPC 正常。

同日补做原生审计实测（AX 真实点击，非坐标脚本）：设置页初始为空 → 点「成立」→ 面板里点「立即刷新」→
设置里导出 JSON；退出重开后设置页显示 `settle / refresh / export`。重置后队列回到 7 条、`save_state 9120`
（含 household；旧版无 household 时为 9016），审计行保留。

universal release 包也做过启动烟测：同一数据库、设置页读得到审计行、账本页有「手动校准 6 个数」入口。

0.3 M2 补充：现有 0.2 数据库迁移到 v2 后 `save_state 16074`，7 条演示链保留并标为 seed；
原生打开「新建链条」编辑器、取消、设置里切换校准口径并重启，均验证通过。

终端直接启动时注意可执行文件名是 crate 名 `cevtuo-causa`（`.app` 目录才叫 `Cevtuo Causa`）：

```bash
"src-tauri/target/debug/bundle/macos/Cevtuo Causa.app/Contents/MacOS/cevtuo-causa"
```

```bash
# 数据库位置
ls "$HOME/Library/Application Support/com.cevtuo.causa/"

# 文件头不应是明文 SQLite
xxd -l 16 "$HOME/Library/Application Support/com.cevtuo.causa/causa.db"

# Keychain 条目
security find-generic-password -s com.cevtuo.causa -a db-key

# 应用内的保险箱弹窗应显示
# SQLCipher · AES-256 / macOS Keychain · com.cevtuo.causa / causa.db / 0 次请求
```

明文 SQLite 的文件头是 `SQLite format 3`；SQLCipher 的库是随机字节，前 16 字节不应出现该字符串。

## 还没做

- macOS 签名与公证：**没有开发者账号，决定不做**；分发走未签名 universal 包，见 `DISTRIBUTION.md`
- JSON 导入恢复、加密擦除（`reset` 只清空链条与判定记录）、生物识别解锁
- PDF 账单解析（CSV 已支持支付宝 / 微信导出）
- Android AAB（Tauri 2 移动目标；需要 Android SDK + NDK）
- 可重复构建与 SBOM

## 安全边界

- 加密的是整库页（SQLCipher）；密钥不落文件、不落 `localStorage`、不落日志
- 如果某次构建没有链接到 SQLCipher，`vault_status` 会返回 `sqlcipher: false`，界面显示“未加密”，不会假装加密
- 数据库丢失且没有加密导出时不可恢复；这是设计选择
- 应用不发网络请求；将来的同步必须是端到端加密，且默认关闭
