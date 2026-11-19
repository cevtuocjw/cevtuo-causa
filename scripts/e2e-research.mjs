// 0.5 研究视图冒烟：口径对齐、政策扩散、相关链跳转。
// 前置同 scripts/e2e-smoke.mjs（Vite 5173 + Chrome CDP 9224）。
// 运行：node scripts/e2e-research.mjs
import { writeFileSync } from "node:fs";

const PORT = Number(process.env.CDP_PORT ?? 9224);
const APP = process.env.APP_URL ?? "http://localhost:5173/";
const TEST_NOW = "2026-12-20T10:00:00";

const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
  method: "PUT",
}).then((r) => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const logs = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method) logs.push(msg);
});
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, resolve));
};
const js = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(JSON.stringify(r.result.exceptionDetails.exception));
  }
  return r.result?.result?.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (expression, label, timeout = 12000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await js(expression)) return;
    await sleep(120);
  }
  throw new Error(`timeout: ${label}`);
};
const click = async (expression, settle = 700) => {
  const ok = await js(`(() => { const el = ${expression}; if (!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error(`click failed: ${expression}`);
  await sleep(settle);
};
const shot = async (path) => {
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path, Buffer.from(s.result.data, "base64"));
};

const out = {};
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.__CAUSA_TEST_NOW__ = ${JSON.stringify(TEST_NOW)};`,
});
await send("Page.navigate", { url: APP });
await waitFor(`document.body.innerText.includes("先写下第一条判断") || document.body.innerText.includes("链 1/7")`, "first run");
if (await js(`document.body.innerText.includes("先写下第一条判断")`)) {
  await click(`[...document.querySelectorAll("button")].find(x => x.innerText.includes("载入演示账本"))`, 1400);
}
await waitFor(`document.body.innerText.includes("链 1/7")`, "demo");

// 口径
await click(`document.querySelector('button[aria-label="口径"]')`, 1000);
await waitFor(`document.body.innerText.includes("同一指标，三种口径")`, "alignment");
out.alignmentTabs = await js(`document.querySelectorAll(".align-tabs button").length`);
out.alignmentRegions = await js(`document.querySelectorAll(".region-card").length`);
out.alignmentStatus = await js(`document.querySelector(".align-question .pill")?.innerText`);
await click(`[...document.querySelectorAll(".align-tabs button")].find(x => x.innerText.includes("房价"))`, 700);
out.housePrice = await js(`document.body.innerText.includes("新建商品住宅") && document.body.innerText.includes("Case-Shiller")`);
await shot("/tmp/causa-research-align.png");

// 扩散
await click(`document.querySelector('button[aria-label="扩散"]')`, 1000);
await waitFor(`document.body.innerText.includes("政策扩散路径")`, "diffusion");
out.diffCases = await js(`document.querySelectorAll(".diff-cases button").length`);
out.stageNodes = await js(`document.querySelectorAll(".stage-node").length`);
out.boardColumns = await js(`document.querySelectorAll(".diff-col").length`);
await click(`[...document.querySelectorAll(".diff-cases button")].find(x => x.innerText.includes("转口"))`, 700);
out.transshipment = await js(`document.body.innerText.includes("USTR") && document.body.innerText.includes("反规避")`);
await shot("/tmp/causa-research-diff.png");

// 相关链跳转
await click(`[...document.querySelectorAll(".related-item")].find(x => x.innerText.includes("美国关税审查"))`, 900);
out.openedChain = await js(`document.body.innerText.includes("美国关税审查，正在改变转口贸易的港口就业") && document.body.innerText.includes("优先级")`);

out.consoleErrors = logs
  .filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")
  .map((e) => e.params.entry.text)
  .filter((t) => !t.includes("favicon"));
console.log(JSON.stringify(out, null, 2));
ws.close();
