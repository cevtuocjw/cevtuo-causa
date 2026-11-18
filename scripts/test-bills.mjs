// 账单解析回归测试：node --experimental-strip-types scripts/test-bills.mjs
import assert from "node:assert/strict";
import { applyBillCategories, parseBillCsv, splitCsvLine } from "../src/lib/bills.ts";

const wechat = `微信支付账单明细
微信昵称：[test]
起始时间：[2026-08-01 00:00:00] 终止时间：[2026-10-31 23:59:59]

----------------------微信支付账单明细列表--------------------
交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
2026-08-03 09:12:00,商户消费,某银行,房贷,支出,¥11200.00,零钱,支付成功,A1,M1,
2026-08-05 10:00:00,商户消费,物业,物业费,支出,¥800.00,零钱,支付成功,A2,M2,
2026-08-10 12:00:00,商户消费,某餐厅,午餐,支出,¥60.00,零钱,支付成功,A3,M3,
2026-09-03 09:12:00,商户消费,某银行,住房贷款,支出,¥11200.00,零钱,支付成功,A4,M4,
2026-09-05 10:00:00,商户消费,电力公司,电费,支出,¥300.00,零钱,支付成功,A5,M5,
2026-10-03 09:12:00,商户消费,某银行,房贷,支出,¥11200.00,零钱,支付成功,A6,M6,
2026-10-12 12:00:00,转账,张三,转账,支出,¥500.00,零钱,支付成功,A7,M7,
2026-10-13 12:00:00,转账,李四,转账,收入,¥1000.00,零钱,已收款,A8,M8,
2026-10-14 12:00:00,商户消费,某店,退款,支出,¥200.00,零钱,已退款,A9,M9,
`;

const alipay = `支付宝交易记录明细查询
账号:[test]
起始日期:[2026/08/01 00:00:00]    终止日期:[2026/10/31 23:59:59]
---------------------------------交易记录明细列表------------------------------------
交易号,商家订单号,交易创建时间,付款时间,最近修改时间,交易来源地,类型,交易对方,商品名称,金额（元）,收/支,交易状态
20260803001,X1,2026-08-03 09:00:00,2026-08-03 09:01:00,2026-08-03 09:01:00,其他,即时到账交易,银行,房贷,"11,200.00",支出,交易成功
20260805002,X2,2026-08-05 10:00:00,2026-08-05 10:01:00,2026-08-05 10:01:00,其他,即时到账交易,房东,房租,"3,500.00",支出,交易成功
20260903003,X3,2026-09-03 09:00:00,2026-09-03 09:01:00,2026-09-03 09:01:00,其他,即时到账交易,银行,房贷,"11,200.00",支出,交易成功
20260905004,X4,2026-09-05 09:00:00,2026-09-05 09:01:00,2026-09-05 09:01:00,其他,即时到账交易,物业,物业费,"600.00",支出,交易成功
`;

assert.deepEqual(splitCsvLine('a,"b,c","d""e"'), ["a", "b,c", 'd"e']);

const w = parseBillCsv(wechat);
assert.ok(w, "wechat should parse");
assert.equal(w.source, "wechat");
assert.deepEqual(w.months, ["2026-08", "2026-09", "2026-10"]);
assert.equal(w.rows, 6, "refund + income + transfer rows are skipped");
assert.equal(w.skipped, 1, "transfer row is skipped");
assert.equal(w.avgMortgage, 11200);
assert.equal(w.avgFixed, 367);
assert.equal(w.avgExpense, 11587);
assert.equal(w.items.length, 6);
assert.equal(w.items.filter((i) => i.kind === "mortgage").length, 3);
assert.ok(w.items.some((i) => i.label.includes("午餐")));

const recat = applyBillCategories(w, w.items.map((i, idx) => (idx === 0 ? "fixed" : i.kind)));
assert.equal(recat.avgMortgage, 7467);
assert.equal(recat.avgFixed, 4100);

const a = parseBillCsv(alipay);
assert.ok(a, "alipay should parse");
assert.equal(a.source, "alipay");
assert.deepEqual(a.months, ["2026-08", "2026-09"]);
assert.equal(a.rows, 4);
assert.equal(a.avgMortgage, 11200);
assert.equal(a.avgFixed, 2050);
assert.equal(a.avgExpense, 13250);

assert.equal(parseBillCsv("hello,world\n1,2"), null, "no header -> null");
assert.equal(parseBillCsv("交易时间,金额(元)\n2026-08-01,0"), null, "no rows -> null");

console.log("bills.test: all assertions passed");
