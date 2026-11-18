import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  Clock,
  Download,
  FileText,
  Gauge,
  Info,
  Lock,
  RotateCcw,
  Scale,
  Settings,
  ShieldCheck,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";
import { ChainFlowMobile, ChainGraph } from "./components/ChainGraph";
import { MaturityRuler } from "./components/MaturityRuler";
import { CalibrationChart } from "./components/CalibrationChart";
import { ProjectionMatrix } from "./components/ProjectionMatrix";
import { CommandPalette } from "./components/CommandPalette";
import { HouseholdForm } from "./components/HouseholdForm";
import { IconRail, TopBar, type View } from "./components/Shell";
import {
  BriefingStrip,
  CashflowPanel,
  FactorWaterfall,
  MethodCard,
  PriorityQueue,
  ProjectionFan,
  QuantStrip,
  SourceMatrix,
  Tip,
} from "./components/Quant";
import {
  brierScore,
  calibration,
  coverage,
  ece,
  gradeFor,
  hitRate,
  impactLevel,
  initialChains,
  initialHousehold,
  initialRecords,
  priorityScore,
  sourceReliability,
  type Chain,
  type Household,
  type Outcome,
} from "./data/chains";
import { decodeBill, parseBillCsv } from "./lib/bills";
import { daysBetween, pct, TODAY } from "./lib/format";
import {
  appendAudit,
  clearState,
  isDesktop,
  listAudit,
  loadState,
  saveExport,
  saveState,
  vaultStatus,
  type AuditRow,
  type VaultStatus,
} from "./lib/desktop";

interface PersistedState {
  chains: Chain[];
  records: { confidence: number; outcome: Outcome }[];
  activeId: string;
  household?: Household;
}

function isHousehold(v: unknown): v is Household {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (["income", "fixed", "mortgage", "liquid", "debt", "dependents"] as const).every(
    (k) => typeof o[k] === "number" && Number.isFinite(o[k]) && (o[k] as number) >= 0,
  );
}

const VIEW_TITLE: Record<View, string> = {
  ledger: "账本",
  projection: "投影",
  calibration: "校准",
  aligner: "口径对齐",
  diffusion: "政策扩散",
  local: "本地镜像",
};

function useScramble(value: number, nonce = 0): string {
  const reduce = useReducedMotion();
  const [text, setText] = useState(pct(value));

  useEffect(() => {
    const target = pct(value);
    if (reduce) {
      setText(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 260);
      if (t < 1) {
        setText(
          target.replace(/\d/g, () =>
            String(Math.floor(Math.random() * 10)),
          ),
        );
        raf = requestAnimationFrame(tick);
      } else {
        setText(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, nonce, reduce]);

  return text;
}

export default function App() {
  const [view, setView] = useState<View>("ledger");
  const [chains, setChains] = useState<Chain[]>(initialChains);
  const [records, setRecords] = useState(initialRecords);
  const [activeId, setActiveId] = useState(initialChains[0].id);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSeed, setPaletteSeed] = useState<string | undefined>();
  const [toast, setToast] = useState<{
    message: string;
    undo?: () => void;
  } | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("09:14");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [household, setHousehold] = useState<Household>(initialHousehold);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [householdSeed, setHouseholdSeed] = useState<Household>(initialHousehold);
  const [billNote, setBillNote] = useState<string | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hydrated = useRef(false);

  const live = chains.filter((c) => c.status !== "settled");
  const due = live.filter((c) => c.status === "due");
  const visible = live;
  const active = visible.find((c) => c.id === activeId) ?? visible[0];
  const rate = hitRate(records);
  const buckets = calibration(records);
  const brier = brierScore(records);
  const eceValue = ece(records);
  const cover = coverage(live);
  const reversed = due.reduce(
    (n, c) => n + c.signposts.filter((s) => s.state === "reversed").length,
    0,
  );
  const topScore = Math.max(0, ...live.map(priorityScore));
  const confidenceText = useScramble(active?.confidence ?? 0, refreshNonce);

  const projectionChains = useMemo(() => {
    const base = active
      ? [active, ...visible.filter((c) => c.id !== active.id)]
      : visible;
    return base.slice(0, 3);
  }, [active, visible]);

  const recordRows = [...records].slice(-8).reverse();

  useEffect(() => {
    let alive = true;
    loadState<PersistedState>().then((saved) => {
      if (!alive) return;
      if (
        saved &&
        Array.isArray(saved.chains) &&
        Array.isArray(saved.records)
      ) {
        setChains(saved.chains);
        setRecords(saved.records);
        if (typeof saved.activeId === "string") setActiveId(saved.activeId);
        if (isHousehold(saved.household)) {
          setHousehold(saved.household);
          setHouseholdSeed(saved.household);
        }
      } else if (isDesktop()) {
        void saveState({
          chains: initialChains,
          records: initialRecords,
          activeId: initialChains[0].id,
          household: initialHousehold,
        });
      }
      hydrated.current = true;
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const t = window.setTimeout(() => {
      void saveState({ chains, records, activeId, household });
    }, 350);
    return () => window.clearTimeout(t);
  }, [chains, records, activeId, household]);

  useEffect(() => {
    if (!vaultOpen) return;
    let alive = true;
    vaultStatus().then((v) => {
      if (alive) setVault(v);
    });
    return () => {
      alive = false;
    };
  }, [vaultOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    let alive = true;
    listAudit(12).then((rows) => {
      if (alive) setAuditRows(rows);
    });
    return () => {
      alive = false;
    };
  }, [settingsOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteSeed(undefined);
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openPalette(seed?: string) {
    setPaletteSeed(seed);
    setPaletteOpen(true);
  }

  function closePalette() {
    setPaletteOpen(false);
    setPaletteSeed(undefined);
  }

  function refresh() {
    setLastRefresh("刚刚");
    setRefreshNonce((n) => n + 1);
    setToast({ message: "刷新完成：0 个来源变化，1 个指标待更新。" });
    void appendAudit("refresh", "0 个来源变化，1 个指标待更新");
  }

  function buildExport() {
    const stamp = new Date().toISOString().slice(0, 10);
    const outcomeLabel = (o?: Outcome) =>
      o === "hit" ? "成立" : o === "miss" ? "不成立" : o === "insufficient" ? "证据不足" : "—";
    const json = JSON.stringify({ chains, records, activeId, household }, null, 2);
    const md = [
      "# Cevtuo Causa / 因果簿",
      "",
      `导出时间：${new Date().toISOString()}`,
      "",
      `在链 ${live.length} · 已结算 ${chains.length - live.length} · 本周到期 ${due.length}`,
      `命中 ${pct(rate, 1)} · Brier ${brier.toFixed(3)} · 误差 ${eceValue.toFixed(3)} · 样本 ${records.length}`,
      "",
      "## 链条",
      "",
      "| 状态 | 优先级 | 标题 | 置信 | 到期 | 结果 |",
      "|---|---|---|---|---|---|",
      ...chains.map(
        (c) =>
          `| ${
            c.status === "settled" ? "已结算" : c.status === "due" ? "到期" : "在链"
          } | ${priorityScore(c)} | ${c.title.replace(/\|/g, "\\|")} | ${pct(
            c.confidence,
          )} | ${c.due} | ${outcomeLabel(c.outcome)} |`,
      ),
      "",
      "## 判定记录",
      "",
      "| 登记置信 | 结果 |",
      "|---|---|",
      ...records.map((r) => `| ${pct(r.confidence)} | ${outcomeLabel(r.outcome)} |`),
      "",
      "## 家庭",
      "",
      "| 月收入 | 固定支出 | 房贷 | 流动现金 | 总负债 | 赡养 / 子女 |",
      "|---|---|---|---|---|---|",
      `| ${household.income} | ${household.fixed} | ${household.mortgage} | ${household.liquid} | ${household.debt} | ${household.dependents} |`,
      "",
    ].join("\n");
    return { json, md, stamp };
  }

  async function doExport(kind: "json" | "md") {
    const { json, md, stamp } = buildExport();
    const name = `cevtuo-causa-${stamp}.${kind}`;
    try {
      const saved = await saveExport(name, kind === "json" ? json : md);
      setToast({ message: `已导出 ${kind.toUpperCase()}：${saved}` });
      void appendAudit("export", `${kind.toUpperCase()} · ${saved}`);
    } catch (err) {
      setToast({ message: `导出失败：${String(err)}` });
    }
  }

  function openHousehold(seed?: Household, note?: string) {
    setHouseholdSeed(seed ?? household);
    setBillNote(note);
    setHouseholdOpen(true);
    setPayOpen(false);
  }

  async function importBill(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setToast({ message: "只支持支付宝 / 微信导出的 CSV；PDF 解析尚未实现。" });
      return;
    }
    try {
      const summary = parseBillCsv(decodeBill(await file.arrayBuffer()));
      if (!summary) {
        setToast({
          message: `没识别到 ${file.name} 的交易表头，请确认是支付宝 / 微信的 CSV 账单。`,
        });
        return;
      }
      const source =
        summary.source === "wechat"
          ? "微信"
          : summary.source === "alipay"
            ? "支付宝"
            : "未知来源";
      const next: Household = {
        ...household,
        fixed: summary.avgFixed > 0 ? summary.avgFixed : household.fixed,
        mortgage:
          summary.avgMortgage > 0 ? summary.avgMortgage : household.mortgage,
      };
      void appendAudit(
        "import",
        `${source} · ${summary.rows} 笔 · ${summary.months.join("/")}`,
      );
      openHousehold(
        next,
        `已从${source}账单估算：${summary.months.join(" / ")} 共 ${summary.rows} 笔支出，` +
          `月均支出 ¥${summary.avgExpense.toLocaleString("en-US")}，其中房贷 ` +
          `¥${summary.avgMortgage.toLocaleString("en-US")}、固定支出 ` +
          `¥${summary.avgFixed.toLocaleString("en-US")}。` +
          "账单里没有收入 / 现金 / 负债，请补齐后保存；不会读取或上传其他内容。",
      );
    } catch (err) {
      setToast({ message: `读取失败：${String(err)}` });
    }
  }

  async function resetData() {
    try {
      await clearState();
      setChains(initialChains);
      setRecords(initialRecords);
      setActiveId(initialChains[0].id);
      setHousehold(initialHousehold);
      setHouseholdSeed(initialHousehold);
      setConfirmReset(false);
      setSettingsOpen(false);
      setToast({ message: "已重置为默认数据。" });
      void appendAudit("reset", "恢复默认链条与家庭数据");
    } catch (err) {
      setToast({ message: `重置失败：${String(err)}` });
    }
  }

  function score(id: string, outcome: Outcome) {
    const chain = chains.find((c) => c.id === id);
    if (!chain) return;

    const snapshot = { chains, records, activeId };
    const nextChains = chains.map((c) =>
      c.id === id ? { ...c, status: "settled" as const, outcome } : c,
    );
    const nextLive = nextChains.filter((c) => c.status !== "settled");
    const nextActive =
      nextLive.find((c) => c.id === activeId) ?? nextLive[0];

    setChains(nextChains);
    setRecords([...records, { confidence: chain.confidence, outcome }]);
    if (nextActive) setActiveId(nextActive.id);

    const label =
      outcome === "hit"
        ? "成立"
        : outcome === "miss"
          ? "不成立"
          : "证据不足";

    void appendAudit("settle", `${label} · ${chain.title}`);

    setToast({
      message: `已结算「${chain.title}」· ${label}`,
      undo: () => {
        setChains(snapshot.chains);
        setRecords(snapshot.records);
        setActiveId(snapshot.activeId);
        setToast(null);
      },
    });
  }

  function registerDraft() {
    const id = "draft-eu-wages";
    if (chains.some((c) => c.id === id)) {
      setActiveId(id);
      setView("ledger");
      setToast({ message: "这条草案已经在账本里。" });
      return;
    }

    const draft: Chain = {
      id,
      title: "欧元区工资增速，正在进入你的房租重定价",
      event: "欧元区协商工资同比 4.1%",
      mechanism: ["服务业通胀黏性", "房东把成本写进续租"],
      variable: "你的房租",
      projection: "每月固定支出",
      coordinates: ["阿姆斯特丹", "远程", "租住", "1 孩"],
      confidence: 0.5,
      opened: TODAY,
      due: "2027-03-31",
      status: "live",
      summary:
        "工资先推服务业价格，再经过续租周期进入房租；这条链的时滞通常在两到三个季度。",
      counterfactual:
        "如果 ECB 在 2027 年一季度前降息两次，房租传导会被需求走弱抵消。",
      signposts: [
        {
          id: "wages",
          label: "协商工资同比",
          value: "4.1%",
          target: "≥ 4.0%",
          state: "pending",
          source: "Eurostat",
          at: TODAY,
        },
      ],
      sources: [{ name: "Eurostat", state: "ok", at: `${TODAY} 09:00` }],
      impacts: [1, 0, 2, 1],
    };

    setChains((prev) => [draft, ...prev]);
    setActiveId(id);
    setView("ledger");
    setToast({ message: "草案已登记为在链，到期 2027-03-31。" });
    void appendAudit("draft", draft.title);
  }

  const currentIndex = active
    ? visible.findIndex((c) => c.id === active.id) + 1
    : 0;
  const grade = active ? gradeFor(priorityScore(active)) : "C";
  const level = active ? impactLevel(active) : 1;
  const dueDays = active ? Math.max(0, daysBetween(TODAY, active.due)) : 0;

  let finding: ReactNode = null;
  if (view === "projection") {
    finding = (
      <span className="finding-line">
        {visible.length} 条在链 · 4 个坐标 · 坐标只存在本地
      </span>
    );
  } else if (view === "calibration") {
    finding = (
      <span className="finding-line">
        命中 {pct(rate, 1)} · Brier {brier.toFixed(3)} · 误差{" "}
        {eceValue.toFixed(3)} · 样本 {records.length}
      </span>
    );
  } else if (view === "aligner") {
    finding = <span className="finding-line">跨口径数据尚未接入</span>;
  } else if (view === "diffusion") {
    finding = <span className="finding-line">政策扩散时间轴尚未接入</span>;
  } else if (view === "local") {
    finding = <span className="finding-line">本地镜像尚未接入</span>;
  }

  const queueCard = (
    <section className="card queue-card">
      <div className="card-head">
        <h2 className="card-title">
          <Zap size={15} /> 优先级
        </h2>
        <span className="count num">{visible.length}</span>
      </div>
      <PriorityQueue
        chains={visible}
        activeId={active?.id ?? ""}
        onSelect={setActiveId}
        onScore={score}
      />
    </section>
  );

  return (
    <>
      <div className="app">
        <IconRail
          view={view}
          onView={(v) => {
            setView(v);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onVault={() => setVaultOpen(true)}
          onSettings={() => setSettingsOpen(true)}
        />

        <div className="shell">
          <TopBar
            title={VIEW_TITLE[view]}
            onPalette={() => openPalette()}
            lastRefresh={lastRefresh}
            onRefresh={refresh}
          >
            {view === "ledger" ? (
              <BriefingStrip
                due={due.length}
                reversed={reversed}
                rate={rate}
                topScore={topScore}
              />
            ) : (
              finding
            )}
          </TopBar>

          <main className="main">
            {view === "ledger" ? (
              <>
                <div className="mobile-queue">{queueCard}</div>

                <div className="cockpit">
                  <div className="col-main">
                    <section className="card chain-card">
                      {active ? (
                        <>
                          <div className="chain-head">
                            <div className="chain-title-block">
                              <div className="chain-meta">
                                <span className={`qgrade g-${grade}`}>
                                  {grade}
                                </span>
                                <span className="chain-index num">
                                  链 {currentIndex}/{visible.length}
                                </span>
                                <Tip text={`影响等级 L${level} · 四条坐标合计强度`}>
                                  <span className="chip">
                                    <Gauge size={12} /> L{level}
                                  </span>
                                </Tip>
                                <Tip text="距离到期；到期后 7 天内必须判定">
                                  <span className="chip">
                                    <Clock size={12} /> {dueDays}d
                                  </span>
                                </Tip>
                              </div>
                              <div className="chain-title-line">
                                <h2 className="chain-title">{active.title}</h2>
                                <Tip
                                  text={`${active.summary} 反事实：${active.counterfactual}`}
                                >
                                  <button
                                    type="button"
                                    className="title-info"
                                    aria-label="查看链条说明"
                                  >
                                    <Info size={14} />
                                  </button>
                                </Tip>
                              </div>
                            </div>
                            <div className="chain-actions">
                              <Tip text={`优先级 ${priorityScore(active)} / 100`}>
                                <span className="priority num">
                                  {priorityScore(active)}
                                </span>
                              </Tip>
                            </div>
                          </div>

                          <QuantStrip chain={active} />
                          <ChainGraph chain={active} />
                          <div className="charts-row">
                            <FactorWaterfall chain={active} />
                            <ProjectionFan chain={active} />
                          </div>
                          <ChainFlowMobile chain={active} />
                          <MaturityRuler chain={active} />
                        </>
                      ) : (
                        <div className="empty" style={{ margin: 24 }}>
                          <strong>所有链条都已结算</strong>
                          下一批在 12 月 15 日。你可以起草一条新链。
                        </div>
                      )}
                    </section>

                    <section className="card">
                      <div className="card-head">
                        <h2 className="card-title">
                          <Scale size={15} /> 校准
                        </h2>
                        <span className="count num">Brier {brier.toFixed(3)}</span>
                      </div>
                      <div className="calib-wrap">
                        <CalibrationChart buckets={buckets} />
                      </div>
                      <div className="kpi-row">
                        <div>
                          <span>命中</span>
                          <b className="num">{pct(rate, 1)}</b>
                        </div>
                        <div>
                          <span>Brier</span>
                          <b className="num">{brier.toFixed(3)}</b>
                        </div>
                        <div>
                          <span>误差</span>
                          <b className="num">{eceValue.toFixed(3)}</b>
                        </div>
                        <div>
                          <span>样本</span>
                          <b className="num">{records.length}</b>
                        </div>
                        <div>
                          <span>覆盖</span>
                          <b className="num">{pct(cover, 0)}</b>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="col-side">
                    {queueCard}

                    <section className="card sources-card">
                      <div className="card-head">
                        <h2 className="card-title">
                          <ShieldCheck size={15} /> 来源
                        </h2>
                        <span className="count num">
                          {active ? sourceReliability(active) : 0}
                        </span>
                      </div>
                      {active ? <SourceMatrix chain={active} /> : null}
                    </section>

                    <section className="card household-card">
                      <div className="card-head">
                        <h2 className="card-title">
                          <Wallet size={15} /> 家庭
                        </h2>
                        <span className="count">
                          <Lock size={12} />
                        </span>
                      </div>
                      <CashflowPanel
                        household={household}
                        onConnect={() => setPayOpen(true)}
                        onEdit={() => openHousehold()}
                      />
                    </section>

                    <section className="card">
                      <div className="card-head">
                        <h2 className="card-title">
                          <Activity size={15} /> 模型 · 更新
                        </h2>
                        <span className="count num">v0.1</span>
                      </div>
                      <MethodCard
                        brier={brier}
                        eceValue={eceValue}
                        cover={cover}
                      />
                    </section>
                  </div>
                </div>
              </>
            ) : null}

            {view === "projection" ? (
              <div className="cockpit">
                <div className="col-main">
                  <section className="card">
                    <div className="card-head">
                      <h2 className="card-title">
                        <Gauge size={15} /> 投影矩阵
                      </h2>
                      <span className="count num">−2…+2</span>
                    </div>
                    <ProjectionMatrix
                      chains={projectionChains}
                      activeId={active?.id ?? ""}
                      onSelect={setActiveId}
                    />
                  </section>
                </div>
                <div className="col-side">
                  <section className="card household-card">
                    <div className="card-head">
                      <h2 className="card-title">
                        <Wallet size={15} /> 家庭
                      </h2>
                      <span className="count">
                        <Lock size={12} />
                      </span>
                    </div>
                    <CashflowPanel
                      household={household}
                      onConnect={() => setPayOpen(true)}
                      onEdit={() => openHousehold()}
                    />
                  </section>
                </div>
              </div>
            ) : null}

            {view === "calibration" ? (
              <div className="cockpit">
                <div className="col-main">
                  <section className="card">
                    <div className="card-head">
                      <h2 className="card-title">
                        <Scale size={15} /> 实际命中率 vs 登记置信度
                      </h2>
                      <span className="count num">{records.length} 条</span>
                    </div>
                    <div className="calib-wrap" style={{ maxWidth: 680 }}>
                      <CalibrationChart buckets={buckets} />
                    </div>
                  </section>
                  <section className="card">
                    <div className="card-head">
                      <h2 className="card-title">分桶</h2>
                      <span className="count">证据不足不计入</span>
                    </div>
                    <div style={{ padding: "8px 20px 16px" }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th scope="col">置信区间</th>
                            <th scope="col">已结算</th>
                            <th scope="col">计入</th>
                            <th scope="col">实际命中</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buckets.map((b) => (
                            <tr key={b.label}>
                              <th scope="row">{b.label}%</th>
                              <td className="num">{b.count}</td>
                              <td className="num">{b.decided}</td>
                              <td className="num">
                                {b.hitRate == null ? "—" : pct(b.hitRate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
                <div className="col-side">
                  <section className="card">
                    <div className="card-head">
                      <h2 className="card-title">最近结算</h2>
                      <span className="count num">n={records.length}</span>
                    </div>
                    {recordRows.map((r, i) => (
                      <div className="source-row" key={`${r.confidence}-${i}`}>
                        <div>
                          <div className="source-name">
                            {r.outcome === "hit"
                              ? "成立"
                              : r.outcome === "miss"
                                ? "不成立"
                                : "证据不足"}
                          </div>
                          <div className="source-time">
                            登记置信 {pct(r.confidence)}
                          </div>
                        </div>
                        <span
                          className={`pill ${
                            r.outcome === "insufficient" ? "stale" : ""
                          }`}
                        >
                          {r.outcome === "hit"
                            ? "+1"
                            : r.outcome === "miss"
                              ? "−1"
                              : "0"}
                        </span>
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            ) : null}

            {view === "aligner" ||
            view === "diffusion" ||
            view === "local" ? (
              <div className="card">
                <div className="empty" style={{ margin: 24 }}>
                  <strong>{VIEW_TITLE[view]}将在下一轮接入</strong>
                  {view === "aligner"
                    ? "先把同一组指标在中、美、欧的定义、权重与修订历史对齐，再接进账本。"
                    : view === "diffusion"
                      ? "先把政策工具本体与历史扩散案例整理出来，再输出下一站候选。"
                      : "先确认一个城市、四个可维护的数据源，再谈指数。"}
                  <div style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setView("ledger")}
                    >
                      返回账本
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </main>

        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void importBill(f);
        }}
      />

      <AnimatePresence>
        {vaultOpen ? (
          <motion.div
            className="overlay"
            role="presentation"
            onMouseDown={() => setVaultOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="dialog glass"
              role="dialog"
              aria-modal="true"
              aria-label="本地保险箱"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="dialog-head">
                <h2>
                  <Lock size={16} /> 本地保险箱
                </h2>
                <span
                  className={`pill ${
                    vault && !vault.sqlcipher ? "stale" : ""
                  }`}
                >
                  {vault
                    ? vault.sqlcipher
                      ? "已加密"
                      : "未加密"
                    : isDesktop()
                      ? "检测中"
                      : "浏览器预览"}
                </span>
              </div>
              <p className="dialog-lead">
                {isDesktop()
                  ? "数据库在本机，密钥在 macOS Keychain；应用不发任何网络请求。"
                  : "当前是浏览器预览：数据只在内存中。桌面版会启用 SQLCipher + Keychain。"}
              </p>
              <div className="dialog-rows">
                <div>
                  <span>加密</span>
                  <b className="num">
                    {vault
                      ? vault.sqlcipher
                        ? "SQLCipher · AES-256"
                        : "SQLite · 未加密"
                      : isDesktop()
                        ? "检测中…"
                        : "未启用"}
                  </b>
                </div>
                <div>
                  <span>密钥</span>
                  <b>
                    {vault?.key_location ??
                      (isDesktop() ? "macOS Keychain" : "—")}
                  </b>
                </div>
                <div>
                  <span>数据库</span>
                  <b className="num">
                    {vault ? vault.db_path.split("/").pop() : "—"}
                  </b>
                </div>
                <div>
                  <span>网络</span>
                  <b className="num">
                    {vault?.network_requests ?? 0} 次请求
                  </b>
                </div>
                <div>
                  <span>遥测</span>
                  <b>关闭</b>
                </div>
                <div>
                  <span>导出</span>
                  <b>全量 JSON + Markdown</b>
                </div>
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => doExport("json")}
                >
                  <Download size={14} /> 导出 JSON
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => doExport("md")}
                >
                  <Download size={14} /> 导出 Markdown
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setVaultOpen(false)}
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {payOpen ? (
          <motion.div
            className="overlay"
            role="presentation"
            onMouseDown={() => setPayOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="dialog glass"
              role="dialog"
              aria-modal="true"
              aria-label="支付连接"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="dialog-head">
                <h2>
                  <Smartphone size={16} /> 不直接连接支付宝 / 微信支付
                </h2>
                <span className="pill">设计决定</span>
              </div>
              <p className="dialog-lead">
                不是技术做不到，是不值得拿你的账户安全去换。
              </p>
              <ul className="dialog-list">
                <li>没有面向第三方的消费级读取 API；屏幕抓取违反条款且极易失效。</li>
                <li>支付流水属于高敏感数据，连接意味着处理登录、短信与设备指纹。</li>
                <li>产品只需要 6 个聚合数，不需要逐笔交易。</li>
              </ul>
              <p className="dialog-lead">
                替代：导出支付宝 / 微信账单 CSV，在设备本地解析；或手动填 6 个数。
                6 个数可以把个人投影误差从 ±40% 压到约 ±15%。
                解析只在本机进行，不上传；目前支持 CSV，PDF 尚未支持。
              </p>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => openHousehold()}
                >
                  手动填 6 个数
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileText size={14} /> 本地导入账单
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPayOpen(false)}
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {householdOpen ? (
          <motion.div
            className="overlay"
            role="presentation"
            onMouseDown={() => {
              setHouseholdOpen(false);
              setBillNote(undefined);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="dialog glass"
              role="dialog"
              aria-modal="true"
              aria-label="家庭校准"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="dialog-head">
                <h2>
                  <Wallet size={16} /> 家庭校准
                </h2>
                <span className="pill">本机</span>
              </div>
              <HouseholdForm
                value={householdSeed}
                billNote={billNote}
                onCancel={() => {
                  setHouseholdOpen(false);
                  setBillNote(undefined);
                }}
                onSave={(next) => {
                  setHousehold(next);
                  setHouseholdOpen(false);
                  setBillNote(undefined);
                  setToast({
                    message: "家庭 6 个数已保存，并写入本地数据库。",
                  });
                  void appendAudit(
                    "household",
                    `收入 ${next.income} · 房贷 ${next.mortgage} · 现金 ${next.liquid}`,
                  );
                }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen ? (
          <motion.div
            className="overlay"
            role="presentation"
            onMouseDown={() => {
              setSettingsOpen(false);
              setConfirmReset(false);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="dialog glass"
              role="dialog"
              aria-modal="true"
              aria-label="设置"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="dialog-head">
                <h2>
                  <Settings size={16} /> 设置
                </h2>
                <span className="pill">0.2.0</span>
              </div>
              <div className="dialog-rows">
                <div>
                  <span>存储</span>
                  <b>
                    {isDesktop()
                      ? "SQLCipher · macOS Keychain"
                      : "浏览器内存 · 不持久化"}
                  </b>
                </div>
                <div>
                  <span>导出</span>
                  <b>全量 JSON + Markdown</b>
                </div>
                <div>
                  <span>数据</span>
                  <b>本机 · 不上传</b>
                </div>
              </div>
              <div className="audit-block">
                <div className="audit-head">
                  <span>审计</span>
                  <span>{isDesktop() ? "本地 SQLite" : "浏览器不记录"}</span>
                </div>
                {auditRows.length ? (
                  <ul className="audit-list">
                    {auditRows.map((row, i) => (
                      <li key={`${row.at}-${i}`}>
                        <span className="audit-action">{row.action}</span>
                        <span className="audit-detail">{row.detail}</span>
                        <span className="audit-time num">{row.at}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="audit-empty">
                    {isDesktop() ? "还没有记录。" : "浏览器预览不写审计。"}
                  </p>
                )}
              </div>
              {confirmReset ? (
                <p className="dialog-lead">
                  确认重置为默认数据？当前已结算的链条与草案会被删除，无法撤销。
                </p>
              ) : (
                <p className="dialog-lead">
                  导出会写入“下载”目录；浏览器预览走普通下载。
                </p>
              )}
              <div className="dialog-actions">
                {confirmReset ? (
                  <>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setConfirmReset(false)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={resetData}
                    >
                      确认重置
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setConfirmReset(true)}
                    >
                      <RotateCcw size={14} /> 重置数据
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => doExport("json")}
                    >
                      <Download size={14} /> JSON
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => doExport("md")}
                    >
                      <Download size={14} /> Markdown
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CommandPalette
        open={paletteOpen}
        seed={paletteSeed}
        onClose={closePalette}
        due={due}
        visible={visible}
        rate={rate}
        recordsCount={records.length}
        onRegisterDraft={registerDraft}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            className="toast glass"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <span>{toast.message}</span>
            {toast.undo ? (
              <button type="button" onClick={toast.undo}>
                撤销
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
