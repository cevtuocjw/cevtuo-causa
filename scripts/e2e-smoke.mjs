// 0.3 浏览器冒烟（无第三方依赖，走 Chrome DevTools Protocol）。
//
// 前置：
//   1) npm run dev -- --port 5173
//   2) Chrome 以远程调试启动：
//      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//        --headless=new --remote-debugging-port=9224 \
//        --user-data-dir=/tmp/causa-e2e-profile about:blank
// 运行：
//   node scripts/e2e-smoke.mjs
// 可用 CDP_PORT / APP_URL 覆盖默认端口与地址。
//
// 覆盖：首次启动 → 载入演示 → 不成立必须写理由 → 成立结算 → 撤销
//       → 新建链条（空反事实被拦）→ 未到期不可结算。
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
async function js(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.result?.exceptionDetails) {
    throw new Error(JSON.stringify(r.result.exceptionDetails.exception));
  }
  return r.result?.result?.value;
}
async function waitFor(expression, label, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await js(expression)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`timeout: ${label}`);
}
async function click(expression) {
  const ok = await js(`(() => { const b = ${expression}; if (!b) return false; b.click(); return true; })()`);
  if (!ok) throw new Error(`click failed: ${expression}`);
}
async function shot(path) {
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path, Buffer.from(s.result.data, "base64"));
}

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

await waitFor(`document.body.innerText.includes("先写下第一条判断")`, "first run");
out.firstRun = true;
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.includes("载入演示账本"))`);
await waitFor(`document.body.innerText.includes("链 1/7")`, "demo");
out.demoLoaded = true;
await new Promise(r=>setTimeout(r,700));
await shot("/tmp/causa-m2-ledger.png");

// 结算：先选“不成立”但不写理由，确认按钮必须禁用
await click(`[...document.querySelectorAll('button[aria-label="不成立"]')][0]`);
await waitFor(`document.body.innerText.includes("先看反事实")`, "settle dialog");
out.counterfactualShown = true;
out.reasonRequiredDisablesConfirm = await js(`(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.innerText.trim() === "确认结算");
  return !!b && b.disabled;
})()`);

// 改为“成立”，确认
await click(`[...document.querySelectorAll(".settle-choice")].find(x => x.innerText.includes("成立"))`);
out.confirmEnabledForHit = await js(`(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.innerText.trim() === "确认结算");
  return !!b && !b.disabled;
})()`);
await new Promise(r=>setTimeout(r,500));
await shot("/tmp/causa-m2-settle.png");
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.trim() === "确认结算")`);
await waitFor(`document.body.innerText.includes("已结算")`, "settled");
out.settled = true;
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.trim() === "撤销")`);
await waitFor(`document.body.innerText.includes("链 1/7")`, "undo");
out.undo = true;

// 新建：先空反事实提交，应被拦下
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.trim() === "新建链条")`);
await waitFor(`document.body.innerText.includes("1 · 主张")`, "editor");
out.editorOpen = true;

await js(`(() => {
  const set = (el, value) => {
    if (!el) throw new Error("missing field");
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    desc.set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const dialog = document.querySelector(".chain-editor");
  const byLabel = (txt) => {
    const label = [...dialog.querySelectorAll("label")].find(l => l.innerText.trim().startsWith(txt));
    return label ? label.querySelector("input, textarea, select") : null;
  };
  set(byLabel("标题"), "测试：高优先级新链");
  set(byLabel("触发事件"), "测试事件");
  set(byLabel("传导机制"), "第一段传导\\n第二段传导");
  set(byLabel("被改变的变量"), "测试变量");
  set(byLabel("对你生活的投影"), "测试收入");
  const sp = dialog.querySelector(".sp-card");
  const spLabel = (txt) => {
    const label = [...sp.querySelectorAll("label")].find(l => l.innerText.trim().startsWith(txt));
    return label ? label.querySelector("input, textarea, select") : null;
  };
  set(spLabel("名称"), "测试指标");
  set(spLabel("当前值"), "1.0");
  set(spLabel("目标"), "≥ 0.5");
  set(spLabel("来源"), "测试来源");
  set(dialog.querySelector(".source-edit input"), "测试来源");
  // 置信 90%，四条影响 2：让新链进入前 6，便于检查队列状态
  set(byLabel("置信度"), "90");
  ["城市", "行业", "住房", "家庭"].forEach((label) => {
    const l = [...dialog.querySelectorAll(".form-grid-4 label")].find(x => x.innerText.trim() === label);
    set(l.querySelector("input"), "2");
  });
})()`);

await click(`[...document.querySelectorAll("button")].find(x => x.innerText.trim() === "登记这条链")`);
out.emptyCounterfactualBlocked = await js(
  `document.body.innerText.includes("必须写明反事实")`,
);
await new Promise(r=>setTimeout(r,500));
out.overlayCountAtEditor = await js(`document.querySelectorAll(".overlay").length`);
out.openDialogs = await js(`[...document.querySelectorAll('[role="dialog"]')].map(d => d.getAttribute("aria-label"))`);
await shot("/tmp/causa-m2-editor.png");

await js(`(() => {
  const dialog = document.querySelector(".chain-editor");
  const label = [...dialog.querySelectorAll("label")].find(l => l.innerText.trim().startsWith("反事实"));
  const el = label.querySelector("textarea");
  const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
  desc.set.call(el, "如果测试指标反向，这条链不成立");
  el.dispatchEvent(new Event("input", { bubbles: true }));
})()`);
await click(`[...document.querySelectorAll("button")].find(x => x.innerText.trim() === "登记这条链")`);
await waitFor(`document.body.innerText.includes("测试：高优先级新链")`, "created");
out.created = true;
out.queueCount = await js(`document.querySelector(".queue-card .count")?.innerText`);
out.newChainSettleDisabled = await js(`(() => {
  const row = [...document.querySelectorAll(".qrow")].find(r => r.innerText.includes("测试：高优先级新链"));
  if (!row) return "not-in-top6";
  const b = row.querySelector('button[aria-label="成立"]');
  return !!b && b.disabled;
})()`);

const errors = logs
  .filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")
  .map((e) => e.params.entry.text)
  .filter((t) => !t.includes("favicon"));
out.consoleErrors = errors;
console.log(JSON.stringify(out, null, 2));
ws.close();
