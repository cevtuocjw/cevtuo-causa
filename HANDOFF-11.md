# Cevtuo Causa 交接（0.5.1 已发布并安装，2026-11-19）

P0 见 `HANDOFF-8.md`，P1 见 `HANDOFF-9.md`，构建记录见 `HANDOFF-10.md`。
本文件记录 0.5.1 发布后的最终状态。

---

## 0. 一句话状态

**0.5.1 已发布并安装**：tag `v0.5.1`、GitHub Release、分发页、本机 `/Applications`
全部对齐 0.5.1。下载的 DMG 与发布 SHA 一致；本机只保留 0.5.1 一个安装版本。

---

## 1. 版本与提交

- 发布提交：`40004e2 chore(release): bump to 0.5.1 and build locally`
- tag：`v0.5.1`（指向 `40004e2`）
- 之前的提交：
  - `76c496f feat(sources): add registry and weekly link health check`
  - `f942493 fix(sources): verify precise pages and official values`
- 仓库：https://github.com/cevtuocjw/cevtuo-causa
- Release：https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.5.1
- 分发页：https://apps.cevtuogrnd.com/causa/ （已显示 0.5.1）
- 分发页提交：`079fd7b docs(causa): update distribution page to 0.5.1`

---

## 2. 发布产物

```
Cevtuo-Causa-0.5.1-macos-universal.dmg   12,933,439 bytes
Cevtuo-Causa-0.5.1-macos-universal.zip   12,556,704 bytes
```

SHA256：

```
90b95e3cdc977a418e0842639621d5203e8d47f3cf911f4f990f46eca6428ea8  zip
b2db7bed8360d55c1f539a573098922211620521c2f5937c98d9347c895edca8  dmg
```

已从 Release 重新下载 DMG 校验：`b2db7bed…edca8`，12,933,439 bytes，一致。

GitHub Release 资产：DMG、ZIP、`SHA256SUMS.txt`，状态均 `uploaded`。

---

## 3. 本机状态

- `/Applications/Cevtuo Causa.app`：0.5.1
  - `CFBundleShortVersionString` / `CFBundleVersion` = 0.5.1
  - `lipo -archs` = `x86_64 arm64`
  - `codesign --verify --deep --strict` 通过；`Signature=adhoc`，`TeamIdentifier=not set`
  - 已启动验证：进程 `/Applications/Cevtuo Causa.app/Contents/MacOS/cevtuo-causa` 运行，
    System Events 读到窗口名 `Cevtuo Causa`
- 已删除：0.5.0 的 DMG/ZIP、旧安装包备份。
- 只保留：
  - `/Applications/Cevtuo Causa.app`（0.5.1）
  - `release/Cevtuo-Causa-0.5.1-macos-universal.dmg`
  - `release/Cevtuo-Causa-0.5.1-macos-universal.zip`
  - `release/SHA256SUMS.txt` / `RELEASE-NOTES.md`
  - `src-tauri/target/universal-apple-darwin/release/bundle/macos/Cevtuo Causa.app`
- 旧账本数据原件仍在：`/Users/cjw/Documents/Codex/causa-local-data-2026-11-19/`，不要删。

---

## 4. 0.5.1 内容

- 来源注册表：46 条来源集中到 `src/data/source-registry.json`，口径 / 扩散 / 链证据只引用 `sourceId`。
- 口径与扩散数字改为 2026-10/11 官方发布值，补精确发布页、发布日期、抓取时间、数据集 / 文号。
- 研究视图显示来源类型、发布日、抓取日与 `single-source`。
- 来源健康检查：`npm run source:health` + CI 周检，结果写入 `SOURCE_HEALTH.md`。
- 0.5 的口径对齐、政策扩散与 0.4 的安全 / 恢复继续保留。

---

## 5. 验证状态

- `npm test`：11 files / 92 tests
- `cargo test`：7 tests
- `npm run build`：通过（JS 约 543 kB，仍 >500 kB 提示未拆分）
- `npm run e2e` / `e2e:m3` / `e2e:research`：通过，`consoleErrors: []`
- `npm run source:health`：31 ok / 9 blocked（白名单）/ 6 样本跳过 / 0 missing
- 0.5.1 universal：bundle 0.5.1、`x86_64 arm64`、codesign 通过、本机启动
- 分发页：`CAUSA 0.5.1`、`v0.5.1` 下载链接、DMG SHA 已更新
- Release 资产下载后 SHA 与 `SHA256SUMS.txt` 一致

---

## 6. 已知限制（未变）

1. Intel 真机未验证；只在 Rosetta 下验证过 x86_64 切片。
2. 真实 Gatekeeper 拦截未复现；本机 Gatekeeper 关闭，`spctl` 结果不能代表下载用户。
3. 未签名、未公证；首次打开仍需手动放行。
4. 健康检查只判链接，不判数值修订；没有修订日志。
5. 9 个来源被反爬/登录墙挡住，白名单逐条登记，正式引用前需人工打开。
6. 研究视图是本地静态快照，不实时抓取。
7. 06 本地镜像仍未做。

---

## 7. 检查入口

- 分发页：https://apps.cevtuogrnd.com/causa/
  - 看点：顶栏 `CAUSA 0.5.1`、下载按钮指向 `v0.5.1`、DMG SHA `b2db7bed…edca8`。
- GitHub Release：https://github.com/cevtuocjw/cevtuo-causa/releases/tag/v0.5.1
  - 看点：DMG / ZIP / SHA256SUMS 三个资产。
- 本机应用：`/Applications/Cevtuo Causa.app`（0.5.1）
- 来源健康：`/Users/cjw/Documents/Codex/cevtuo-causa/SOURCE_HEALTH.md`
- 生产构建：http://127.0.0.1:8131/cevtuo-causa/dist/
- 来源注册表：`/Users/cjw/Documents/Codex/cevtuo-causa/src/data/source-registry.json`

---

## 8. 给新窗口的第一句话

```text
读 /Users/cjw/Documents/Codex/cevtuo-causa/HANDOFF-11.md。0.5.1 已发布并安装；
下一步优先补修订日志与 last-modified 检查，再处理 Intel 真机 / Gatekeeper 验证。
```
