# Cevtuo Causa 交接（0.5.1 构建记录，发布已完成，见 HANDOFF-11，2026-11-19）

P0 见 `HANDOFF-8.md`，P1 见 `HANDOFF-9.md`。本文件记录 0.5.1 的版本号、
本地产物与验证状态；发布动作已完成，结果见 `HANDOFF-11.md`。

---

## 0. 一句话状态

**0.5.1 已在本机构建并验证**：universal `.dmg` / `.zip` 在 `release/`，
bundle 版本 0.5.1，`x86_64 arm64`，ad-hoc 签名通过。
**发布已于同日完成：见 `HANDOFF-11.md`。本文件保留构建与验证记录。**

---

## 1. 已完成

### 1.1 版本号

- `package.json`：0.5.1
- `src-tauri/Cargo.toml`：0.5.1
- `src-tauri/tauri.conf.json`：0.5.1
- `src/App.tsx` 设置页 pill：0.5.1

### 1.2 本地产物

```
release/Cevtuo-Causa-0.5.1-macos-universal.dmg   12,933,439 bytes
release/Cevtuo-Causa-0.5.1-macos-universal.zip   12,556,704 bytes
release/SHA256SUMS.txt
release/RELEASE-NOTES.md
```

SHA256：

```
90b95e3cdc977a418e0842639621d5203e8d47f3cf911f4f990f46eca6428ea8  Cevtuo-Causa-0.5.1-macos-universal.zip
b2db7bed8360d55c1f539a573098922211620521c2f5937c98d9347c895edca8  Cevtuo-Causa-0.5.1-macos-universal.dmg
```

### 1.3 构建与验证

- `bash scripts/release.sh`：universal 构建成功，DMG + app 两个 bundle。
- `CFBundleShortVersionString` / `CFBundleVersion` = 0.5.1。
- `lipo -archs` = `x86_64 arm64`。
- `codesign --verify --deep --strict` 通过；`Signature=adhoc`，`TeamIdentifier=not set`。
- `npm test`：11 files / 92 tests。
- `cargo test`：7 tests。
- `npm run build`、`npm run e2e`、`e2e:m3`、`e2e:research`、`npm run source:health` 全部通过。

### 1.4 已同步文案

- `scripts/release.sh` 的 Release Notes 已改写为 0.5.1 内容。
- `DISTRIBUTION.md` 已更新版本、文件名、大小、SHA、验证记录。

---

## 2. 发布动作（已完成，记录用）

1. `git tag v0.5.1 && git push origin main --tags`
2. `gh release create v0.5.1 release/* --title "Cevtuo Causa 0.5.1" --notes-file release/RELEASE-NOTES.md`
3. 分发页 `causa/`：版本、下载链接、SHA、功能索引改为 0.5.1。
4. 替换 `/Applications/Cevtuo Causa.app` 为 0.5.1；删除 0.5.0 的 `release/` 旧产物。
5. `README.md` 的 Release 链接从 `v0.5.0` 改为 `v0.5.1`（Release 创建后再改，避免 404）。

这些都会改变外部可见状态，按约定应本人确认后再执行。

---

## 3. 关键决定

1. **0.5.1 是补丁版，不叫 0.6**：没有新功能，只有来源正确性、注册表与健康检查。
2. **保留 0.5.0 产物直到 0.5.1 发布成功**：不提前删旧包，避免回退无门。
3. **不做签名/公证**：与 `DISTRIBUTION.md` 一致；`adhoc` 签名只能证明包没坏。
4. **Release Notes 由 `scripts/release.sh` 生成**：发版时不要手写另一份。

---

## 4. 检查入口

- 本地产物：`/Users/cjw/Documents/Codex/cevtuo-causa/release/`
  - `Cevtuo-Causa-0.5.1-macos-universal.dmg`
  - `Cevtuo-Causa-0.5.1-macos-universal.zip`
  - `SHA256SUMS.txt`
- 校验：在 `release/` 内执行 `shasum -a 256 -c SHA256SUMS.txt`
- 构建 bundle：`src-tauri/target/universal-apple-darwin/release/bundle/macos/Cevtuo Causa.app`
- 安装版（仍是 0.5.0）：`/Applications/Cevtuo Causa.app`
- 分发页（仍是 0.5.0）：https://apps.cevtuogrnd.com/causa/

---

## 5. 给新窗口的第一句话

```text
读 /Users/cjw/Documents/Codex/cevtuo-causa/HANDOFF-10.md，然后按「2. 还没做」发布 0.5.1：
打 tag、建 GitHub Release、更新分发页、替换本机应用，最后把 README 链接改到 v0.5.1。
```
