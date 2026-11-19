# 来源健康检查（2026-11-19）

由 `node scripts/source-health.mjs` 生成。只检查注册表里的公开链接，不判断数值是否正确。

- 总数：46
- ok：31
- blocked：9
- missing：0
- failed：0
- unreachable：0
- skipped（样本）：6
- 未白名单失败：0

| 来源 id | 类型 | 结果 | HTTP | 说明 |
|---|---|---|---|---|
| `asean-atiga-second-protocol` | document | ok | 206 |  |
| `cn-70city-2026-10` | release | ok | 206 |  |
| `cn-cpi-nbs-2026-10` | release | ok | 200 |  |
| `cn-customs-portal` | portal | blocked | 412 | 白名单：海关总署对非浏览器请求返回 412 WAF 预检；门户本身可用，需人工打开核实。 |
| `cn-guangdong-vouchers` | release | ok | 200 |  |
| `cn-hangzhou-service-vouchers` | release | ok | 200 |  |
| `cn-mee-allocation-2026` | document | ok | 200 |  |
| `cn-mofcom-service-season-2026` | release | ok | 206 |  |
| `cn-national-ets-daily` | dataset | ok | 200 |  |
| `cn-nbs-portal` | portal | ok | 200 |  |
| `cn-ndrc-portal` | portal | ok | 206 |  |
| `cn-pboc-omo` | portal | ok | 206 |  → https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125431/125475/index.html |
| `cn-pmi-nbs-2026-10` | release | ok | 200 |  |
| `cn-sse-scfi` | dataset | ok | 200 |  |
| `cn-state-council-service-consumption-2026` | document | ok | 200 |  |
| `cn-unemployment-nbs-2026-10` | release | ok | 200 |  |
| `eu-anti-circumvention-2026-1840` | document | ok | 202 |  |
| `eu-cbam-definitive` | portal | ok | 206 |  |
| `eu-cbam-reg-2023-956` | document | ok | 202 |  |
| `eu-ecb-decision-2026-10-29` | release | ok | 200 |  |
| `eu-ets-eex-auction` | dataset | ok | 206 |  |
| `eu-eurlex-portal` | portal | ok | 202 |  |
| `eu-eurostat-hicp-2026-10` | release | ok | 200 |  |
| `eu-eurostat-hpi-2026-q2` | release | ok | 200 |  |
| `eu-eurostat-portal` | portal | ok | 206 |  |
| `eu-eurostat-unemployment-2026-09` | release | ok | 200 |  |
| `eu-hcob-pmi-2026-10` | release | blocked | 403 | 白名单：S&P Global 反爬返回 403；正文已通过搜索索引核对，正式引用前人工打开一次。 |
| `sample-bank-app` | sample | skipped | — | 样本，无公开链接 |
| `sample-customer-email` | sample | skipped | — | 样本，无公开链接 |
| `sample-job-platform` | sample | skipped | — | 样本，无公开链接 |
| `sample-local` | sample | skipped | — | 样本，无公开链接 |
| `sample-port` | sample | skipped | — | 样本，无公开链接 |
| `sample-port-call` | sample | skipped | — | 样本，无公开链接 |
| `uk-cbam-refinery-consultation-2026` | document | ok | 206 |  |
| `us-aws-pricing` | portal | ok | 200 |  |
| `us-bls-cpi-sep-2026` | release | blocked | 403 | 白名单：BLS 对非浏览器请求返回 403；正文已通过搜索索引核对，正式引用前人工打开一次。 |
| `us-bls-employment-2026-10` | release | blocked | 403 | 白名单：BLS 对非浏览器请求返回 403；正文已通过搜索索引核对，正式引用前人工打开一次。 |
| `us-case-shiller-2026-08` | release | blocked | 403 | 白名单：S&P DJI 反爬返回 403；正文已通过搜索索引核对，正式引用前人工打开一次。 |
| `us-clean-competition-act` | document | ok | 206 |  |
| `us-fed-fomc-2026-10-28` | release | ok | 206 |  |
| `us-fred-mortgage30us` | dataset | ok | 200 |  |
| `us-ism-pmi-2026-10` | release | blocked | 200 | 白名单：ISM 对脚本请求 302 到 SSO 登录页；浏览器/curl 可读正文，已核对 55.5。 → https://ecommerce.ismworld.org/SSO/Login.aspx?DPLF=Y&vi=10&vt=adac5c0985461f07e23b08e5e93b… |
| `us-no-federal-carbon-price` | portal | ok | 206 |  |
| `us-sec-edgar` | portal | blocked | 403 | 白名单：SEC EDGAR 要求浏览器会话，脚本请求返回 403；只作为门户，不作为已核实的财报页。 |
| `us-ustr-nte-2027` | document | blocked | 206 | 白名单：Federal Register 对脚本请求 302 到 unblock WAF 挑战页；curl/浏览器可读，正文已核对。 → https://unblock.federalregister.gov/ |
| `us-ustr-usmca-2027` | document | blocked | 206 | 白名单：Federal Register 对脚本请求 302 到 unblock WAF 挑战页；curl/浏览器可读，正文已核对。 → https://unblock.federalregister.gov/ |
