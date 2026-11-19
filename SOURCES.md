# 内容来源清单与缺口（2026-11-19）

这份文件只回答一件事：**页面上每个数字、每条判断、每张截图，来源是什么；还缺什么。**
所有“演示快照”都不是实时抓取；不要把它们当成当前官方数据。

---

## 0. 三层来源

| 层 | 用在哪 | 当前状态 |
|---|---|---|
| 链证据 | 7 条演示链的 signposts 与来源矩阵 | 只有来源名 + 抓取时间；无 URL、无精确表号 |
| 口径来源 | 口径对齐的 6 组指标 × 3 地区 | 已有官方门户 URL；精确发布页/日期/修订待补 |
| 扩散证据 | 政策扩散的 3 个案例 × 13 步 | 已有官方门户/文件 URL；精确文号/日期/抓取时间待补 |
| 页面文案 | 分发页的功能、边界、安装说明 | 来自 `SPEC.md` / `FEATURES.md` / `HANDOFF-5/6.md` |
| 页面素材 | 截图、录屏、设计参考 | 本机真实界面录制；版式参考 Awwwards SOTD「Grail」 |

---

## 1. 链证据（`src/data/chains.ts`）

当前只存 `{ name, state, at }`；等级/可信度/延迟在 `SOURCE_META` 里人工配置。
**缺：URL、数据集名、发布日期、修订号、独立性评分、抓取时间（ISO）。**

| 来源 | 等级 | 可信度 | 延迟 | 用在哪条链 | 缺什么 |
|---|---|---|---|---|---|
| 国家统计局 | T1 | 98 | T+31d | 人民币 / 出口招聘 | 精确表号与发布页；修订记录 |
| 上海航交所 | T1 | 95 | T+1d | 人民币 / 出口招聘 | 航线/箱型口径；URL |
| 招聘平台样本 | T5 | 62 | T+1d | 人民币 / 出口招聘 | 样本量、去重方法、URL |
| EU ETS | T1 | 97 | T+1d | CBAM / 紧固件 | 合约与结算价口径；URL |
| 海关样本 | T1 | 96 | T+1d | CBAM / 紧固件 | HS 编码范围；URL |
| 客户邮件样本 | T5 | 55 | T+7d | CBAM / 紧固件 | 样本来源与脱敏说明 |
| FRED | T1 | 99 | T+1d | 降息 / 房贷 | 具体 series ID；URL |
| 中国人民银行 | T1 | 98 | T+0d | 降息 / 房贷 | 具体公告/操作；URL |
| 银行 App 样本 | T4 | 70 | T+3d | 降息 / 房贷 | 数据授权与口径 |
| 地方商务局 | T1 | 95 | T+7d | 服务消费券 | 具体城市公告；URL |
| 本地样本 | T5 | 60 | T+3d | 服务消费券 | 采集方法与样本量 |
| 港口挂靠样本 | T5 | 65 | T+2d | 美国转口关税 | 船期/挂靠数据源 |
| 港口样本 | T4 | 72 | T+2d | 美国转口关税 | 港口范围与口径 |
| 公司财报 | T2 | 94 | T+45d | AI 数据中心 / 电价 | 公司、报告期、页码 |
| 地方电网 | T1 | 92 | T+7d | AI 数据中心 / 电价 | 电价文件与口径 |
| 云厂商价目 | T2 | 90 | T+1d | 欧盟数据法案 | 产品页与抓取时间 |
| 欧盟公报 | T1 | 98 | T+0d | 欧盟数据法案 | 具体法规编号与 URL |
| Eurostat | T1 | 98 | T+30d | 备用/跨链 | 具体数据集代码 |

---

## 2. 口径来源（`src/data/alignment.ts`）

已补官方门户 URL；**精确发布页、发布日期、抓取时间、修订号仍待补**。
数值是 2026-10/11 的演示快照，不是实时值。

### 2.1 制造业 PMI

| 地区 | 来源 | 等级 | 值 | 期间 | 链接 | 待补 |
|---|---|---|---|---|---|---|
| 中国 | 国家统计局 · 中国物流与采购联合会 | T1 | 50.8 | 2026-10 | https://www.stats.gov.cn/ | 精确发布页；样本说明 |
| 美国 | ISM Manufacturing PMI | T1 | 48.7 | 2026-10 | https://www.ismworld.org/ | 报告页；分项权重 |
| 欧盟 | HCOB / S&P Global Eurozone Manufacturing PMI | T2 | 47.9 | 2026-10 | https://www.pmi.spglobal.com/ | 报告页；覆盖国家 |

### 2.2 CPI 同比

| 地区 | 来源 | 等级 | 值 | 期间 | 链接 | 待补 |
|---|---|---|---|---|---|---|
| 中国 | 国家统计局 CPI | T1 | +0.3% | 2026-10 | https://www.stats.gov.cn/ | 表号；食品权重 |
| 美国 | BLS CPI-U | T1 | +3.1% | 2026-10 | https://www.bls.gov/cpi/ | 新闻稿；OER 权重 |
| 欧盟 | Eurostat HICP | T1 | +2.4% | 2026-10（初值） | https://ec.europa.eu/eurostat/web/hicp | 初值/终值区分 |

### 2.3 失业率

| 地区 | 来源 | 等级 | 值 | 期间 | 链接 | 待补 |
|---|---|---|---|---|---|---|
| 中国 | 国家统计局 · 城镇调查失业率 | T1 | 5.1% | 2026-10 | https://www.stats.gov.cn/ | 城镇覆盖定义 |
| 美国 | BLS · CPS U-3 | T1 | 4.3% | 2026-10 | https://www.bls.gov/cps/ | 新闻稿 |
| 欧盟 | Eurostat · harmonised unemployment | T1 | 5.9% | 2026-09 | https://ec.europa.eu/eurostat/web/lfs | 月度数据集代码 |

### 2.4 政策利率

| 地区 | 来源 | 等级 | 值 | 期间 | 链接 | 待补 |
|---|---|---|---|---|---|---|
| 中国 | 中国人民银行 · 7 天逆回购 | T1 | 1.40% | 2026-11 | http://www.pbc.gov.cn/ | 操作公告 |
| 美国 | Federal Reserve · fed funds target | T1 | 3.75–4.00% | 2026-11 | https://www.federalreserve.gov/monetarypolicy/openmarket.htm | FOMC 声明 |
| 欧盟 | ECB · deposit facility rate | T1 | 2.00% | 2026-10 | https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html | 决议日期 |

### 2.5 碳价

| 地区 | 来源 | 等级 | 值 | 期间 | 链接 | 待补 |
|---|---|---|---|---|---|---|
| 中国 | 全国碳排放权交易市场 | T1 | ¥72.5 / t | 2026-11 | https://www.mee.gov.cn/ | 成交价口径；交易所页面 |
| 美国 | 无联邦碳价 | T1 | — | 2026-11 | https://www.epa.gov/ghgemissions | RGGI/加州体系说明 |
| 欧盟 | EU ETS · EUA | T1 | €78.4 / t | 2026-11 | https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en | 合约与结算价 |

### 2.6 房价

| 地区 | 来源 | 等级 | 值 | 期间 | 链接 | 待补 |
|---|---|---|---|---|---|---|
| 中国 | 国家统计局 · 70 城新建商品住宅 | T1 | −0.2% 环比 | 2026-10 | https://www.stats.gov.cn/ | 70 城表号 |
| 美国 | S&P CoreLogic Case-Shiller | T2 | +0.4% 环比 | 2026-08 | https://www.spglobal.com/spdji/ | 20 城指数页；滞后说明 |
| 欧盟 | Eurostat House Price Index | T1 | +0.6% 环比 | 2026-Q2 | https://ec.europa.eu/eurostat/web/housing-price-statistics | 季度数据集代码 |

---

## 3. 扩散证据（`src/data/diffusion.ts`）

已补官方文件/门户 URL；**精确文号、发布日期、抓取时间、触发监控源仍待补**。
每一步都有 `trigger`，但 trigger 目前是人工描述，没有自动监控。

| 案例 | 地区 | 阶段 | 证据 | 链接 | 待补 |
|---|---|---|---|---|---|
| CBAM | 欧盟 | 实施 | Regulation (EU) 2023/956 | https://eur-lex.europa.eu/eli/reg/2023/956/oj | 生效条款页码 |
| CBAM | 欧盟 | 实施 | CBAM definitive regime | https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en | 正式期起始文件 |
| CBAM | 英国 | 咨询 | UK CBAM consultation | https://www.gov.uk/government/consultations | 具体 consultation 页面 |
| CBAM | 中国 | 草案 | 生态环境部扩围方案 | https://www.mee.gov.cn/ | 文件号与日期 |
| CBAM | 美国 | 宣布 | Congressional proposal | https://www.congress.gov/ | 法案号与委员会 |
| 转口关税 | 美国 | 复审 | USTR review notice | https://ustr.gov/ | Federal Register 文号 |
| 转口关税 | 欧盟 | 咨询 | EU anti-circumvention file | https://taxation-customs.ec.europa.eu/ | 案件号 |
| 转口关税 | 东盟 | 草案 | ASEAN rules-of-origin working group | https://asean.org/ | 工作组文件 |
| 转口关税 | 墨西哥 | 复审 | USMCA review calendar | https://ustr.gov/trade-agreements/free-trade-agreements/united-states-mexico-canada-agreement | 复审日期 |
| 服务消费券 | 杭州 | 实施 | 杭州市商务局公告 | https://www.hangzhou.gov.cn/ | 公告编号与日期 |
| 服务消费券 | 广东 | 实施 | 广东省商务厅公告 | https://www.gd.gov.cn/ | 公告编号与日期 |
| 服务消费券 | 更多省份 | 实施 | 地方商务部门公告跟踪 | https://www.mofcom.gov.cn/ | 跟踪清单 |
| 服务消费券 | 全国 | 宣布 | 国务院 / 财政部文件 | https://www.gov.cn/ | 文号与日期 |

---

## 4. 演示数据与素材

| 内容 | 文件 | 性质 |
|---|---|---|
| 7 条演示链、23 条历史记录 | `src/data/chains.ts` | 0.2 静态演示数据，不是实时数据 |
| 演示账本迁移 | `src/data/demo.ts` | 走 v1→v2 迁移，标为 seed |
| 口径 6 组 | `src/data/alignment.ts` | 2026-10/11 演示快照 |
| 扩散 3 案例 | `src/data/diffusion.ts` | 2026-11-19 演示快照 |
| JSON 导入样例 | `scripts/fixtures/import-v1.json` | 测试夹具 |
| 微信 CSV 样例 | `scripts/fixtures/wechat-sample.csv` | 测试夹具 |
| 截图 | `assets/*.png` | 本机真实界面 |
| 录屏 | `assets/demo.mp4`、`assets/research.mp4` | 本机真实操作，无旁白 |

---

## 5. 页面文案与设计来源

| 内容 | 来源 |
|---|---|
| 产品定义、五本账、反事实/时间锁/本地优先 | `SPEC.md`（0.1） |
| 量化公式、来源分级 T1–T5、更新节奏 | `SPEC-2.md`（0.2） |
| 功能清单与边界 | `FEATURES.md`、`README.md` |
| 0.4 安全与恢复细节 | `HANDOFF-5.md` |
| 0.5 口径/扩散与发布 | `HANDOFF-6.md` |
| 分发页版式 | Awwwards SOTD「Grail」（2026-11-04）的固定产品画面 + 章节式排版，按本项目内容重做 |
| 截图/录屏 | 本机 0.5.0 界面，CDP 录制 |

---

## 6. 需要补的优先级

### P0：让“来源”可追溯

1. 每条来源加：`id`、`url`（精确页）、`publishedAt`、`retrievedAt`、`revision`、`dataset`。
2. 口径：把官方门户链接换成**具体发布页/数据集页**；补初值/终值、季调、样本说明。
3. 扩散：补**文件号/法案号/公告号**、发布日期、当前阶段证据页。
4. UI：来源名可点击；“as of”时间；单来源标 `single-source`；“演示快照”常驻。

### P1：把来源变成可检查的

1. 来源注册表 `SOURCE_REGISTRY`，所有数据只引用 ID，不重复写名字。
2. 脚本检查 URL 200 / last-modified / 重定向；CI 每周跑一次。
3. 修订日志：同一指标不同版本保留两个值，不覆盖。
4. 链证据补 URL 与数据集，不再只有名字。

### P2：来源质量

1. 独立性评分与评级理由（为什么是 T1/T2）。
2. 延迟与抓取失败的可视化（来源健康）。
3. 历史快照与差异日志。
4. 自动抓取/解析（当前刻意未做，先保证来源可追溯）。

---

## 7. 本轮已做

- `AlignmentSource` 与 `DiffusionStep` 增加 `url`。
- 18 条口径来源、13 条扩散证据补了**官方门户/文件链接**。
- 口径地区卡片、扩散证据文字可点击打开链接。
- 测试强制每条来源/证据必须有 `http(s)` URL。
- 两个视图都明确写：来源链接指向官方门户，精确发布页与抓取时间仍待补。

**仍未做**：精确发布页、发布日期、抓取时间、修订号、独立性评分、自动监控。
这些是下一轮来源工作的主体，不应把当前门户链接当成“已核实到数字”。

### 7.1 URL 连通性检查（2026-11-19）

本机用 `curl` 检查了 27 个唯一 URL：

- 直接 200：国家统计局、人民银行、MEE、商务部、国务院、Eurostat（HICP / LFS / HPI）、EUR-Lex、EU ETS 页面、USMCA 页面。
- 307：ASEAN（重定向）。
- 403 / 000：BLS、ECB、Fed、USTR、gov.uk、ISM、S&P Global、Congress、EPA、杭州、广东等。
  其中 ECB、Fed、USTR、gov.uk、ISM 在本机**绕过代理直连时返回 200**；
  BLS 与 S&P 的 403 更像反爬/地区限制，不代表链接不存在。
- 结论：这些是**官方门户链接**，不是“已逐页核实”的精确数据页；
  正式引用前仍需人工打开并记录发布日期、抓取时间与修订号。
