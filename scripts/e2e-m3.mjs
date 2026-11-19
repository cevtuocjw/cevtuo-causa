// 0.3 M3 浏览器冒烟：90 天校准窗、JSON 恢复、家庭暴露投影。
//
// 前置同 scripts/e2e-smoke.mjs（Vite 5173 + Chrome CDP 9224）。
// 运行：node scripts/e2e-m3.mjs
// 可用 CDP_PORT / APP_URL / IMPORT_FILE 覆盖默认值。
import { writeFileSync } from "node:fs";

const PORT = Number(process.env.CDP_PORT ?? 9224);
const APP = process.env.APP_URL ?? "http://localhost:5173/";
const IMPORT_FILE = process.env.IMPORT_FILE ?? `${process.cwd()}/scripts/fixtures/import-v1.json`;
const CSV_FILE = process.env.CSV_FILE ?? `${process.cwd()}/scripts/fixtures/wechat-sample.csv`;
const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" }).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const logs = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) logs.push(m);
});
await new Promise(r => ws.addEventListener("open", r, { once: true }));
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise(r => pending.set(id, r)); };
const js = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception));
  return r.result?.result?.value;
};
const waitFor = async (expr, label, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await js(expr)) return; } catch { /* 页面还没建好 body，继续等，不要伪装成断言失败 */ } await new Promise(r => setTimeout(r, 150)); } throw new Error("timeout " + label); };
const click = (expr) => js(`(() => { const b = ${expr}; if (!b) return false; b.click(); return true; })()`);
const shot = async (p) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(p, Buffer.from(s.result.data, "base64")); };

const out = {};
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable"); await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: APP });
await waitFor(`document.body.innerText.includes("先写下第一条判断")`, "first run");
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.includes("载入演示账本"))`);
await waitFor(`document.body.innerText.includes("链 1/7")`, "demo");

// 演示账本默认包含 seed 记录，校准样本应为 23
// 校准：全部 23 → 90 天 0
await click(`[...document.querySelectorAll('button[aria-label="校准"]')][0]`);
await waitFor(`document.body.innerText.includes("样本 23")`, "calibration 23");
out.allWindowSample = 23;
await click(`[...document.querySelectorAll(".seg button")].find(x => x.innerText.includes("90"))`);
await new Promise(r => setTimeout(r, 300));
out.window90Sample = await js(`(() => {
  const m = document.body.innerText.match(/样本\\s*(\\d+|—)/);
  return m ? m[1] : null;
})()`);

// 回到账本，导入 JSON（隐藏 file input）
await click(`[...document.querySelectorAll('button[aria-label="账本"]')][0]`);
const doc = await send("DOM.getDocument");
const node = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: 'input[accept*="json"]' });
await send("DOM.setFileInputFiles", { files: [IMPORT_FILE], nodeId: node.result.nodeId });
await waitFor(`document.body.innerText.includes("确认从备份恢复")`, "import preview");
out.importPreview = true;
out.importPreviewShowsCounts = await js(`document.body.innerText.includes("1 条链")`);
await shot("/tmp/causa-m3-import.png");
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.includes("备份当前并恢复"))`);
await waitFor(`document.body.innerText.includes("导入的链")`, "imported");
out.imported = true;

// 编辑导入链，设置收入 +5% 暴露
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.trim() === "编辑")`);
await waitFor(`document.body.innerText.includes("3 · 量化")`, "editor");
await js(`(() => {
  const dialog = document.querySelector(".chain-editor");
  const cb = dialog.querySelector('.exposure-row input[type="checkbox"]');
  cb.click();
})()`);
await new Promise(r => setTimeout(r, 200));
await js(`(() => {
  const set = (el, value) => {
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    desc.set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const dialog = document.querySelector(".chain-editor");
  const sel = dialog.querySelector(".exposure-row select");
  set(sel, "income");
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  const delta = dialog.querySelector(".exposure-delta input");
  set(delta, "5");
})()`);
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.trim() === "保存修改")`);
await waitFor(`document.body.innerText.includes("若成立")`, "exposure line");
out.exposureShown = await js(`document.body.innerText.includes("月缓冲") && document.body.innerText.includes("5%")`);
await shot("/tmp/causa-m3-exposure.png");

// CSV 复核：转账被跳过、分类可改判
const csvNode = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: 'input[accept=".csv"]' });
await send("DOM.setFileInputFiles", { files: [CSV_FILE], nodeId: csvNode.result.nodeId });
await waitFor(`document.body.innerText.includes("复核账单分类")`, "bill review");
out.billReview = true;
out.billRows = await js(`document.querySelectorAll(".bill-row").length`);
out.transferSkipped = await js(`document.body.innerText.includes("跳过 1 笔")`);
out.billPreviewBefore = await js(`document.querySelector(".bill-preview")?.innerText`);
await js(`(() => {
  const sel = document.querySelector(".bill-row select");
  const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(sel), "value");
  desc.set.call(sel, "fixed");
  sel.dispatchEvent(new Event("change", { bubbles: true }));
})()`);
await new Promise(r => setTimeout(r, 300));
out.billPreviewAfter = await js(`document.querySelector(".bill-preview")?.innerText`);
await shot("/tmp/causa-m3-bills.png");
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.includes("用这些估算"))`);
await waitFor(`document.body.innerText.includes("家庭校准")`, "household form");
out.billNote = await js(`document.body.innerText.includes("月均支出 ¥11,750")`);

out.consoleErrors = logs.filter(e => e.method === "Log.entryAdded" && e.params.entry.level === "error").map(e => e.params.entry.text).filter(t => !t.includes("favicon"));
console.log(JSON.stringify(out, null, 2));
ws.close();
