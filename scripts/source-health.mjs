// 来源健康检查：读取 src/data/source-registry.json，逐个打开公开链接。
//
// 用法：
//   node scripts/source-health.mjs
//   node scripts/source-health.mjs --json
//
// 判定：
//   ok          2xx/3xx（跟随重定向后的最终状态）
//   blocked     401/403/429；反爬或地区限制，不等于页面不存在
//   missing     404/410；必须修
//   failed      5xx 或其他状态
//   unreachable 超时、DNS、TLS 失败
//
// 允许 403/000 白名单写在 scripts/source-health-allowlist.json；
// 只有“预期会被反爬挡住”的来源才进白名单，且必须写原因。
// 白名单不会掩盖 404，也不会掩盖新的域名失败。

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY = join(ROOT, "src/data/source-registry.json");
const ALLOWLIST = join(ROOT, "scripts/source-health-allowlist.json");
const OUTPUT = join(ROOT, "SOURCE_HEALTH.md");
const TIMEOUT_MS = 15000;
const CONCURRENCY = 6;

const sources = JSON.parse(readFileSync(REGISTRY, "utf8"));
let allowlist = {};
try {
  allowlist = JSON.parse(readFileSync(ALLOWLIST, "utf8"));
} catch {
  // 没有白名单就是空表，不报错。
}

function classify(status) {
  if (status >= 200 && status < 400) return "ok";
  // 401/403/429 是权限或反爬；412 是常见的 WAF 预检失败，也不等于页面不存在。
  if (status === 401 || status === 403 || status === 412 || status === 429) return "blocked";
  if (status === 404 || status === 410) return "missing";
  return "failed";
}

async function check(source) {
  if (!source.url) {
    return { ...source, status: null, result: "skipped", detail: "样本，无公开链接" };
  }
  const started = Date.now();
  try {
    const res = await fetch(source.url, {
      method: "GET",
      redirect: "follow",
      headers: {
        // 透明 UA，不伪装浏览器。Federal Register 会对伪装成浏览器的请求返回 404。
        "user-agent":
          "cevtuo-causa-source-health/0.1 (+https://github.com/cevtuocjw/cevtuo-causa)",
        range: "bytes=0-2048",
        accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const status = res.status;
    const finalUrl = res.url;
    await res.body?.cancel();
    // 200 也可能是登录页或 WAF 挑战页：
    // ISM 会 302 到 SSO，Federal Register 会 302 到 unblock 挑战页。
    const gated =
      finalUrl !== source.url && /(login|signin|sso|auth|unblock|challenge)/i.test(finalUrl);
    const result = gated ? "blocked" : classify(status);
    const allowed = allowlist[source.id];
    const tolerated = allowed && allowed.result === result;
    return {
      ...source,
      status,
      result,
      finalUrl,
      ms: Date.now() - started,
      tolerated,
      detail: tolerated ? allowed.reason : gated ? "重定向到登录页或 WAF 挑战页" : "",
    };
  } catch (error) {
    const allowed = allowlist[source.id];
    const tolerated = allowed?.result === "unreachable";
    return {
      ...source,
      status: null,
      result: "unreachable",
      ms: Date.now() - started,
      tolerated,
      detail: tolerated ? allowed.reason : String(error?.message ?? error),
    };
  }
}

const queue = [...sources];
const results = [];
async function worker() {
  while (queue.length) {
    const source = queue.shift();
    results.push(await check(source));
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
results.sort((a, b) => (a.id < b.id ? -1 : 1));

const counts = results.reduce((acc, item) => {
  acc[item.result] = (acc[item.result] ?? 0) + 1;
  return acc;
}, {});

const failures = results.filter(
  (item) => item.result !== "ok" && item.result !== "skipped" && !item.tolerated,
);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), counts, results }, null, 2));
} else {
  console.log(JSON.stringify({ counts, failures: failures.map((f) => `${f.id}: ${f.result}`) }, null, 2));
}

const checkedAt = new Date().toISOString().slice(0, 10);
const rows = results
  .map((item) => {
    const status = item.status ?? "—";
    const note = item.tolerated ? `白名单：${item.detail}` : item.detail;
    const final =
      item.finalUrl && item.finalUrl !== item.url
        ? ` → ${item.finalUrl.length > 90 ? `${item.finalUrl.slice(0, 90)}…` : item.finalUrl}`
        : "";
    return `| \`${item.id}\` | ${item.kind} | ${item.result} | ${status} | ${note}${final} |`;
  })
  .join("\n");

writeFileSync(
  OUTPUT,
  `# 来源健康检查（${checkedAt}）

由 \`node scripts/source-health.mjs\` 生成。只检查注册表里的公开链接，不判断数值是否正确。

- 总数：${results.length}
- ok：${counts.ok ?? 0}
- blocked：${counts.blocked ?? 0}
- missing：${counts.missing ?? 0}
- failed：${counts.failed ?? 0}
- unreachable：${counts.unreachable ?? 0}
- skipped（样本）：${counts.skipped ?? 0}
- 未白名单失败：${failures.length}

| 来源 id | 类型 | 结果 | HTTP | 说明 |
|---|---|---|---|---|
${rows}
`,
  "utf8",
);

if (failures.length) {
  console.error(`来源健康检查失败：${failures.map((f) => `${f.id}=${f.result}`).join(", ")}`);
  process.exit(1);
}
console.log(`来源健康检查通过：${counts.ok ?? 0}/${results.length - (counts.skipped ?? 0)} 可用`);
