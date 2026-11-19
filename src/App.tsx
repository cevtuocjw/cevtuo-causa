import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  Clock,
  DatabaseZap,
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
import { BillReviewDialog } from "./components/BillReviewDialog";
import { ChainEditor } from "./components/ChainEditor";
import { SettleDialog } from "./components/SettleDialog";
import { FirstRunDialog } from "./components/FirstRunDialog";
import { DestroyDataDialog } from "./components/DestroyDataDialog";
import { VaultRecovery } from "./components/VaultRecovery";
import { AlignmentView } from "./components/AlignmentView";
import { DiffusionView } from "./components/DiffusionView";
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
  coverage,
  gradeFor,
  impactLevel,
  priorityScore,
  sourceReliability,
  type Chain as ViewChain,
  type Household,
} from "./data/chains";
import type {
  Chain as CoreChain,
  Outcome,
  StateV2,
} from "./core/types";
import { EMPTY_HOUSEHOLD, emptyState } from "./core/types";
import { canSettle, daysUntilDue, deriveStatus } from "./core/status";
import { RuleError, settle, undoSettle } from "./core/settle";
import {
  createChain,
  editChain,
  resetUserData,
  setActive,
  setHousehold as setHouseholdState,
  setShowSeedInStats,
} from "./core/commands";
import {
  brier as brierOf,
  calibration,
  ece as eceOf,
  eligibleRecords,
  hitRate,
  recordsForTag,
} from "./core/stats";
import { migrateV1, parseStateJson } from "./core/migrate";
import { projectExposure } from "./core/exposure";
import { addDays, formatDateOnly } from "./core/time";
import { demoState } from "./data/demo";
import { toChainView } from "./lib/chain-view";
import { decodeBill, parseBillCsv, type BillSummary } from "./lib/bills";
import { pct } from "./lib/format";
import {
  appendAudit,
  backupDb,
  isDesktop,
  listAudit,
  loadState,
  saveExport,
  saveState,
  vaultFailure,
  vaultStatus,
  type AuditRow,
  type VaultFailure,
  type VaultStatus,
} from "./lib/desktop";

const VIEW_TITLE: Record<View, string> = {
  ledger: "账本",
  projection: "投影",
  calibration: "校准",
  alignment: "口径",
  diffusion: "扩散",
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

const EXPOSURE_LABEL: Record<
  NonNullable<CoreChain["exposure"]>["target"],
  string
> = {
  income: "月收入",
  fixed: "固定支出",
  mortgage: "房贷",
  liquid: "流动现金",
  debt: "总负债",
};

function money(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** 仅 dev 构建可用的测试时钟；生产包忽略。 */
function bootNow(): Date {
  if (import.meta.env.DEV) {
    const globalNow = (globalThis as { __CAUSA_TEST_NOW__?: unknown })
      .__CAUSA_TEST_NOW__;
    const fromUrl = new URLSearchParams(window.location.search).get("now");
    const raw = typeof globalNow === "string" ? globalNow : fromUrl;
    if (typeof raw === "string") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

export default function App() {
  const [view, setView] = useState<View>("ledger");
  const [now, setNow] = useState(bootNow);
  const [state, setState] = useState<StateV2>(() => emptyState(EMPTY_HOUSEHOLD));
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [firstRun, setFirstRun] = useState(false);
  const [statsWindow, setStatsWindow] = useState<"all" | "90d">("all");
  const [statsTag, setStatsTag] = useState("all");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSeed, setPaletteSeed] = useState<string | undefined>();
  const [toast, setToast] = useState<{
    message: string;
    undo?: () => void;
    duration?: number;
  } | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("09:14");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [householdSeed, setHouseholdSeed] = useState<Household>(EMPTY_HOUSEHOLD);
  const [billNote, setBillNote] = useState<string | undefined>();
  const [billReview, setBillReview] = useState<BillSummary | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [vaultFault, setVaultFault] = useState<VaultFailure | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState<CoreChain | undefined>();
  const [settleTarget, setSettleTarget] = useState<{
    id: string;
    outcome?: Outcome;
  } | null>(null);
  const [importPreview, setImportPreview] = useState<{
    state: StateV2;
    warnings: string[];
    name: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const household = state.household;
  const chains = useMemo(
    () => state.chains.map((c) => toChainView(c, now)),
    [state.chains, now],
  );
  const statsOptions = useMemo(
    () => ({
      includeSeed: state.settings.showSeedInStats,
      ...(statsWindow === "90d"
        ? { since: new Date(now.getTime() - 90 * 86_400_000) }
        : {}),
    }),
    [state.settings.showSeedInStats, statsWindow, now],
  );
  const statRecords = useMemo(
    () => eligibleRecords(state.records, statsOptions),
    [state.records, statsOptions],
  );
  const rate = hitRate(statRecords);
  const buckets = calibration(state.records, statsOptions);
  const brier = brierOf(statRecords);
  const eceValue = eceOf(statRecords);

  const statsTags = useMemo(() => {
    const tags = new Set<string>();
    for (const chain of state.chains) {
      for (const tag of chain.tags) {
        const trimmed = tag.trim();
        if (trimmed) tags.add(trimmed);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [state.chains]);

  const calibRecords = useMemo(
    () =>
      eligibleRecords(
        recordsForTag(state.records, state.chains, statsTag),
        statsOptions,
      ),
    [state.records, state.chains, statsTag, statsOptions],
  );
  const calibBuckets = useMemo(
    () =>
      calibration(
        recordsForTag(state.records, state.chains, statsTag),
        statsOptions,
      ),
    [state.records, state.chains, statsTag, statsOptions],
  );
  const calibSampleSize = calibRecords.length;
  const calibRecordRows = [...calibRecords].slice(-8).reverse();
  const live = chains.filter((c) => c.status !== "settled");
  const due = live.filter((c) => c.status === "due");
  const visible = live;
  const active = visible.find((c) => c.id === state.activeId) ?? visible[0];
  const activeCore = state.chains.find((c) => c.id === active?.id);
  const settleChain = settleTarget
    ? state.chains.find((c) => c.id === settleTarget.id) ?? null
    : null;
  const cover = coverage(live);
  const reversed = due.reduce(
    (n, c) => n + c.signposts.filter((s) => s.state === "reversed").length,
    0,
  );
  const topScore = Math.max(0, ...live.map(priorityScore));
  const confidenceText = useScramble(active?.confidence ?? 0, refreshNonce);
  const dueDays = activeCore ? daysUntilDue(activeCore, now) : 0;
  const exposure = activeCore ? projectExposure(activeCore, household) : null;
  const rateText = rate == null ? "—" : pct(rate, 1);
  const brierText = brier == null ? "—" : brier.toFixed(3);
  const eceText = eceValue == null ? "—" : eceValue.toFixed(3);
  const sampleSize = statRecords.length;
  const settleable = (id: string) => {
    const chain = state.chains.find((c) => c.id === id);
    return chain ? canSettle(chain, now) : false;
  };
  const queueStatus = (id: string) => {
    const chain = state.chains.find((c) => c.id === id);
    if (!chain) return null;
    const status = deriveStatus(chain, now);
    return status === "live" || status === "settled" ? null : status;
  };
  const overdueChains = state.chains.filter(
    (c) =>
      !c.settledAt &&
      !c.outcome &&
      deriveStatus(c, now) === "overdue",
  );

  const projectionChains = useMemo(() => {
    const base = active
      ? [active, ...visible.filter((c) => c.id !== active.id)]
      : visible;
    return base.slice(0, 3);
  }, [active, visible]);

  useEffect(() => {
    let alive = true;
    let failed = false;
    (async () => {
      try {
        const saved = await loadState<unknown>();
        if (!alive) return;
        if (saved == null) {
          setState(emptyState(EMPTY_HOUSEHOLD));
          setFirstRun(true);
        } else {
          const isV2 =
            (saved as { schemaVersion?: unknown }).schemaVersion === 2;
          if (!isV2) {
            try {
              await backupDb(`pre-migration-${Date.now()}`);
            } catch (err) {
              setToast({
                message: `迁移前备份失败：${String(err)}。仍继续迁移，请尽快手动导出。`,
              });
            }
          }
          const { state: next, warnings } = migrateV1(saved, new Date());
          setState(next);
          if (warnings.length > 0) {
            setToast({ message: `迁移完成，有 ${warnings.length} 条提示。` });
          }
        }
      } catch (err) {
        failed = true;
        if (alive) setLoadError(String(err));
        // 读取失败可能发生在初始化之前（库打不开），此时 load_state 的错误比较笼统；
        // 再取一次分类信息，恢复页才能给出“缺密钥 / 钥匙串锁 / 密钥不匹配”。
        const [fault, status] = await Promise.all([vaultFailure(), vaultStatus()]);
        if (alive) {
          setVaultFault(fault);
          if (status) setVault(status);
        }
      } finally {
        if (alive) {
          setLoaded(true);
          // 读失败时不要自动备份：连接可能根本不存在，而且失败状态不该再写盘。
          if (isDesktop() && !failed) {
            void backupDb(`auto-${new Date().toISOString().slice(0, 10)}`).catch(
              (err) => console.error("auto backup failed", err),
            );
          }
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || loadError) return;
    const t = window.setTimeout(() => {
      saveState(state)
        .then(() => setSaveError(null))
        .catch((err) => setSaveError(String(err)));
    }, 350);
    return () => window.clearTimeout(t);
  }, [state, loaded, loadError]);

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
    const t = window.setTimeout(() => setToast(null), toast.duration ?? 5200);
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
    const stamp = now.toISOString().slice(0, 10);
    const outcomeLabel = (o?: Outcome) =>
      o === "hit" ? "成立" : o === "miss" ? "不成立" : o === "insufficient" ? "证据不足" : "—";
    const rateText = rate == null ? "—" : pct(rate, 1);
    const brierText = brier == null ? "—" : brier.toFixed(3);
    const eceText = eceValue == null ? "—" : eceValue.toFixed(3);
    // 导出完整的 v2 state，保证 JSON 可以原样恢复（含理由、快照、暴露、origin）。
    const json = JSON.stringify(state, null, 2);
    const md = [
      "# Cevtuo Causa / 因果簿",
      "",
      `导出时间：${now.toISOString()}`,
      "",
      `在链 ${live.length} · 已结算 ${chains.length - live.length} · 到期 ${due.length}`,
      `命中 ${rateText} · Brier ${brierText} · 误差 ${eceText} · 样本 ${statRecords.length}`,
      `统计口径：${state.settings.showSeedInStats ? "包含演示记录" : "仅用户记录"}`,
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
      "| 结算时间 | 登记置信 | 结果 | 理由 |",
      "|---|---|---|---|",
      ...state.records
        .filter((r) => !r.voidedAt)
        .map(
          (r) =>
            `| ${r.settledAt || "—"} | ${pct(r.confidence)} | ${outcomeLabel(
              r.outcome,
            )} | ${r.reason.replace(/\|/g, "\\|") || "—"} |`,
        ),
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

  async function doExport(kind: "json" | "md"): Promise<string | null> {
    const { json, md, stamp } = buildExport();
    const name = `cevtuo-causa-${stamp}.${kind}`;
    try {
      const saved = await saveExport(name, kind === "json" ? json : md);
      setToast({ message: `已导出 ${kind.toUpperCase()}：${saved}` });
      void appendAudit("export", `${kind.toUpperCase()} · ${saved}`);
      return saved;
    } catch (err) {
      setToast({ message: `导出失败：${String(err)}` });
      return null;
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
      setBillReview(summary);
    } catch (err) {
      setToast({ message: `读取失败：${String(err)}` });
    }
  }

  function confirmBillReview(adjusted: BillSummary) {
    const source =
      adjusted.source === "wechat"
        ? "微信"
        : adjusted.source === "alipay"
          ? "支付宝"
          : "未知来源";
    const next: Household = {
      ...household,
      fixed: adjusted.avgFixed > 0 ? adjusted.avgFixed : household.fixed,
      mortgage:
        adjusted.avgMortgage > 0 ? adjusted.avgMortgage : household.mortgage,
    };
    void appendAudit(
      "import",
      `${source} · ${adjusted.rows} 笔 · 跳过 ${adjusted.skipped} · ${adjusted.months.join("/")}`,
    );
    setBillReview(null);
    openHousehold(
      next,
      `已从${source}账单估算：${adjusted.months.join(" / ")} 共 ${adjusted.rows} 笔支出，` +
        `月均支出 ¥${adjusted.avgExpense.toLocaleString("en-US")}，其中房贷 ` +
        `¥${adjusted.avgMortgage.toLocaleString("en-US")}、固定支出 ` +
        `¥${adjusted.avgFixed.toLocaleString("en-US")}。` +
        "分类可在复核页改判；账单里没有收入 / 现金 / 负债，请补齐后保存。",
    );
  }

  async function backupNow() {
    try {
      const path = await backupDb(`manual-${Date.now()}`);
      setToast({
        message: path ? `已备份：${path}` : "浏览器预览不写本地数据库，无需备份。",
      });
      if (path) void appendAudit("backup", path.split("/").pop() ?? "backup");
    } catch (err) {
      setToast({ message: `备份失败：${String(err)}` });
    }
  }

  function resetData() {
    setState(resetUserData(state, state.household));
    setConfirmReset(false);
    setSettingsOpen(false);
    setToast({ message: "已清空链条与判定记录；家庭 6 个数与审计保留。" });
    void appendAudit("reset", "清空链条与判定记录");
  }

  function selectChain(id: string) {
    setState((s) => setActive(s, id));
  }

  function openNewChain() {
    setEditorSeed(undefined);
    setEditorOpen(true);
  }

  function openEditChain() {
    if (!activeCore) return;
    if (activeCore.settledAt || activeCore.outcome) {
      setToast({ message: "已结算的链不能再编辑。" });
      return;
    }
    setEditorSeed(activeCore);
    setEditorOpen(true);
  }

  function saveChain(chain: CoreChain, mode: "create" | "edit") {
    try {
      const next =
        mode === "create"
          ? createChain(state, chain)
          : editChain(state, chain.id, chain, now);
      setState(next);
      setEditorOpen(false);
      setEditorSeed(undefined);
      setView("ledger");
      void appendAudit(
        mode === "create" ? "chain_create" : "chain_update",
        chain.title,
      );
      setToast({
        message:
          mode === "create"
            ? "链条已登记。到期前 72 小时置信度会锁定。"
            : "链条已更新。",
      });
    } catch (err) {
      setToast({ message: `保存失败：${String(err)}` });
    }
  }

  function openSettle(id: string, outcome?: Outcome) {
    const chain = state.chains.find((c) => c.id === id);
    if (!chain) return;
    if (!canSettle(chain, now)) {
      const left = daysUntilDue(chain, now);
      setToast({
        message:
          left > 0
            ? `还有 ${left} 天到期，不能提前结算。`
            : "这条链尚未到期，不能提前结算。",
      });
      return;
    }
    setSettleTarget({ id, outcome });
  }

  function confirmSettle(outcome: Outcome, reason: string) {
    if (!settleTarget) return;
    const chain = state.chains.find((c) => c.id === settleTarget.id);
    if (!chain) return;

    const recordId = `rec-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
    const label =
      outcome === "hit" ? "成立" : outcome === "miss" ? "不成立" : "证据不足";
    const previousActive = state.activeId;

    try {
      const settledState = settle(state, {
        chainId: chain.id,
        outcome,
        reason,
        now,
        recordId,
      });
      const nextLive = settledState.chains.find(
        (c) => !c.settledAt && !c.outcome,
      );
      const nextState =
        previousActive === chain.id && nextLive
          ? setActive(settledState, nextLive.id)
          : settledState;

      setState(nextState);
      setSettleTarget(null);
      void appendAudit("settle", `${label} · ${chain.title}`);

      setToast({
        message: `已结算「${chain.title}」· ${label}。10 秒内可撤销。`,
        duration: 10_000,
        undo: () => {
          try {
            const undone = undoSettle(nextState, {
              recordId,
              now,
            });
            setState(setActive(undone, previousActive));
            void appendAudit("settle_undo", `撤销 ${label} · ${chain.title}`);
            setToast({ message: "已撤销这次结算，记录标记为作废。" });
          } catch (err) {
            setToast({ message: `撤销失败：${String(err)}` });
          }
        },
      });
    } catch (err) {
      setToast({
        message:
          err instanceof RuleError ? err.message : `结算失败：${String(err)}`,
      });
    }
  }

  function loadDemo() {
    setState(demoState(new Date()));
    setFirstRun(false);
    setToast({ message: "已载入演示账本；演示记录可在设置里切换是否计入校准。" });
    void appendAudit("demo_load", "载入演示账本");
  }

  function startEmpty() {
    setFirstRun(false);
    setEditorSeed(undefined);
    setEditorOpen(true);
  }

  async function chooseImport(file: File) {
    try {
      const text = await file.text();
      const parsed = parseStateJson(text, now);
      setImportPreview({ ...parsed, name: file.name });
    } catch (err) {
      setToast({ message: `导入失败：${String(err)}` });
    }
  }

  async function confirmImport() {
    if (!importPreview) return;
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      // 先备份当前账本；备份失败就不覆盖。
      await saveExport(
        `cevtuo-causa-backup-${stamp}.json`,
        JSON.stringify(state),
      );
      setState(importPreview.state);
      setToast({
        message: `已从 ${importPreview.name} 恢复；原账本已备份到下载目录。`,
      });
      void appendAudit("import_state", importPreview.name);
      setImportPreview(null);
      setSettingsOpen(false);
    } catch (err) {
      setToast({ message: `恢复失败：${String(err)}` });
    }
  }

  function registerDraft() {
    const id = "draft-eu-wages";
    if (state.chains.some((c) => c.id === id)) {
      selectChain(id);
      setView("ledger");
      setToast({ message: "这条草案已经在账本里。" });
      return;
    }

    const stamp = new Date().toISOString();
    const draft: CoreChain = {
      id,
      title: "欧元区工资增速，正在进入你的房租重定价",
      event: "欧元区协商工资同比 4.1%",
      mechanism: ["服务业通胀黏性", "房东把成本写进续租"],
      variable: "你的房租",
      projection: "每月固定支出",
      summary:
        "工资先推服务业价格，再经过续租周期进入房租；这条链的时滞通常在两到三个季度。",
      counterfactual:
        "如果 ECB 在 2027 年一季度前降息两次，房租传导会被需求走弱抵消。",
      confidence: 0.5,
      openedAt: formatDateOnly(now),
      dueAt: formatDateOnly(addDays(now, 120)),
      signposts: [
        {
          id: "wages",
          label: "协商工资同比",
          value: "4.1%",
          target: "≥ 4.0%",
          state: "pending",
          source: "Eurostat",
          at: formatDateOnly(now),
          history: [],
        },
      ],
      sources: [{ name: "Eurostat", state: "ok", at: formatDateOnly(now) }],
      impacts: [1, 0, 2, 1],
      tags: ["演示", "房租"],
      origin: "user",
      createdAt: stamp,
      updatedAt: stamp,
    };

    setEditorSeed(draft);
    setEditorOpen(true);
    setView("ledger");
  }

  const currentIndex = active
    ? visible.findIndex((c) => c.id === active.id) + 1
    : 0;
  const grade = active ? gradeFor(priorityScore(active)) : "C";
  const level = active ? impactLevel(active) : 1;

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
        命中 {rateText} · Brier {brierText} · 误差 {eceText} · 样本 {sampleSize}
      </span>
    );
  } else if (view === "alignment") {
    finding = (
      <span className="finding-line">
        6 组指标 · 3 个地区 · 名称相同不等于口径相同
      </span>
    );
  } else if (view === "diffusion") {
    finding = (
      <span className="finding-line">
        3 个政策 · 5 个阶段 · 情景不是预测
      </span>
    );
  }

  const queueCard = (
    <section className="card queue-card">
      <div className="card-head">
        <h2 className="card-title">
          <Zap size={15} /> 优先级
        </h2>
        <span className="card-head-actions">
          <button type="button" className="btn btn-mini" onClick={openNewChain}>
            新建链条
          </button>
          <span className="count num">{visible.length}</span>
        </span>
      </div>
      <PriorityQueue
        chains={visible}
        activeId={active?.id ?? ""}
        onSelect={selectChain}
        onScore={openSettle}
        canSettle={settleable}
        onCreate={openNewChain}
        statusOf={queueStatus}
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
                {overdueChains.length > 0 ? (
                  <button
                    type="button"
                    className="overdue-banner"
                    onClick={() => openSettle(overdueChains[0].id)}
                  >
                    <b>{overdueChains.length} 条已逾期</b>
                    <span>
                      最近一条：{overdueChains[0].title}。到期后 7 天内应结算；
                      仍可结算，但会标为逾期。
                    </span>
                  </button>
                ) : null}
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
                                    <Clock size={12} />{" "}
                                    {dueDays >= 0
                                      ? `${dueDays}d`
                                      : `逾期 ${Math.abs(dueDays)}d`}
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
                                {activeCore && !activeCore.settledAt ? (
                                  <button
                                    type="button"
                                    className="btn btn-mini"
                                    onClick={openEditChain}
                                  >
                                    编辑
                                  </button>
                                ) : null}
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
                          {exposure ? (
                            <div className="exposure-line">
                              <span>若成立</span>
                              <b>
                                {EXPOSURE_LABEL[exposure.target]}{" "}
                                {exposure.deltaPct > 0 ? "+" : ""}
                                {exposure.deltaPct}%
                              </b>
                              <span>
                                月缓冲 {money(exposure.before.buffer)} →{" "}
                                {money(exposure.after.buffer)}
                              </span>
                              <span>
                                缓冲 {exposure.before.bufferMonths.toFixed(1)} →{" "}
                                {exposure.after.bufferMonths.toFixed(1)} 个月
                              </span>
                            </div>
                          ) : activeCore ? (
                            <button
                              type="button"
                              className="exposure-line muted"
                              onClick={openEditChain}
                            >
                              未设家庭暴露 · 设置后这里会显示对月缓冲的影响
                            </button>
                          ) : null}
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
                        <span className="count num">Brier {brierText}</span>
                      </div>
                      <div className="calib-wrap">
                        <CalibrationChart buckets={buckets} />
                      </div>
                      <div className="kpi-row">
                        <div>
                          <span>命中</span>
                          <b className="num">{rateText}</b>
                        </div>
                        <div>
                          <span>Brier</span>
                          <b className="num">{brierText}</b>
                        </div>
                        <div>
                          <span>误差</span>
                          <b className="num">{eceText}</b>
                        </div>
                        <div>
                          <span>样本</span>
                          <b className="num">{sampleSize}</b>
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
                      onSelect={selectChain}
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
                      <span className="seg" role="group" aria-label="统计时间窗">
                        <button
                          type="button"
                          className={statsWindow === "all" ? "active" : ""}
                          onClick={() => setStatsWindow("all")}
                        >
                          全部
                        </button>
                        <button
                          type="button"
                          className={statsWindow === "90d" ? "active" : ""}
                          onClick={() => setStatsWindow("90d")}
                        >
                          最近 90 天
                        </button>
                      </span>
                      <span className="count num">{calibSampleSize} 条</span>
                    </div>
                    {statsTags.length > 0 ? (
                      <div
                        className="calib-tags"
                        role="group"
                        aria-label="按类别筛选"
                      >
                        <button
                          type="button"
                          className={statsTag === "all" ? "active" : ""}
                          onClick={() => setStatsTag("all")}
                        >
                          全部类别
                        </button>
                        {statsTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={statsTag === tag ? "active" : ""}
                            onClick={() => setStatsTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="calib-wrap" style={{ maxWidth: 680 }}>
                      <CalibrationChart buckets={calibBuckets} />
                    </div>
                    {calibSampleSize > 0 && calibSampleSize < 10 ? (
                      <p className="settle-note" style={{ padding: "0 20px 14px" }}>
                        样本不足 10 条，曲线只作记录，暂不当作结论。
                        {statsTag !== "all" ? `（类别：${statsTag}）` : ""}
                      </p>
                    ) : null}
                    {calibSampleSize === 0 && state.records.length > 0 ? (
                      <p className="settle-note" style={{ padding: "0 20px 14px" }}>
                        {statsTag !== "all"
                          ? `类别“${statsTag}”还没有可统计的判定；` +
                            "类别按链条标签关联，迁移记录没有链条不会命中。"
                          : "当前只统计你自己的判定；演示 / 迁移记录未计入。可在设置里打开“包含演示记录”查看它们。"}
                      </p>
                    ) : null}
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
                          {calibBuckets.map((b) => (
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
                      <span className="count num">n={calibSampleSize}</span>
                    </div>
                    {calibRecordRows.map((r, i) => (
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

            {view === "alignment" ? (
              <AlignmentView
                chains={state.chains}
                onOpenChain={(id) => {
                  selectChain(id);
                  setView("ledger");
                }}
              />
            ) : null}

            {view === "diffusion" ? (
              <DiffusionView
                chains={state.chains}
                onOpenChain={(id) => {
                  selectChain(id);
                  setView("ledger");
                }}
              />
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

      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void chooseImport(f);
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
                  <b>{isDesktop() ? "无网络模块" : "浏览器预览"}</b>
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
                  try {
                    setState((s) => setHouseholdState(s, next));
                    setHouseholdSeed(next);
                    setHouseholdOpen(false);
                    setBillNote(undefined);
                    setToast({
                      message: "家庭 6 个数已保存，并写入本地数据库。",
                    });
                    // 审计只记动作，不记金额。
                    void appendAudit("household", "家庭 6 个数已更新");
                  } catch (err) {
                    setToast({ message: `保存失败：${String(err)}` });
                  }
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
                <span className="pill">0.5.1</span>
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
                  <b>全量 JSON + Markdown（明文）</b>
                </div>
                <div>
                  <span>数据</span>
                  <b>本机 · 不上传</b>
                </div>
                <div>
                  <span>校准口径</span>
                  <b>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={state.settings.showSeedInStats}
                        onChange={(e) =>
                          setState((s) =>
                            setShowSeedInStats(s, e.target.checked),
                          )
                        }
                      />
                      包含演示 / 迁移记录
                    </label>
                  </b>
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
                  确认清空？所有链条与判定记录会被删除；家庭 6 个数与审计保留。
                </p>
              ) : (
                <p className="dialog-lead">
                  导出是明文文件，会写入“下载”目录（可能被 iCloud 等同步）；
                  浏览器预览走普通下载。审计只记录动作，不记录金额。
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
                      onClick={() => importRef.current?.click()}
                    >
                      <FileText size={14} /> 导入 JSON
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void backupNow()}
                    >
                      <ShieldCheck size={14} /> 立即备份
                    </button>
                    {isDesktop() ? (
                      <button
                        type="button"
                        className="btn btn-destructive-ghost"
                        onClick={() => {
                          setConfirmReset(false);
                          setDestroyOpen(true);
                        }}
                      >
                        <DatabaseZap size={14} /> 销毁本地数据
                      </button>
                    ) : null}
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

      <BillReviewDialog
        summary={billReview}
        onCancel={() => setBillReview(null)}
        onConfirm={confirmBillReview}
      />

      <AnimatePresence>
        {importPreview ? (
          <motion.div
            className="overlay"
            role="presentation"
            onMouseDown={() => setImportPreview(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="dialog glass"
              role="dialog"
              aria-modal="true"
              aria-label="确认恢复"
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
            >
              <div className="dialog-head">
                <h2>确认从备份恢复</h2>
                <span className="pill">明文文件</span>
              </div>
              <div className="dialog-rows">
                <div>
                  <span>文件</span>
                  <b>{importPreview.name}</b>
                </div>
                <div>
                  <span>内容</span>
                  <b>
                    {importPreview.state.chains.length} 条链 ·{" "}
                    {importPreview.state.records.length} 条判定记录
                  </b>
                </div>
                <div>
                  <span>当前数据</span>
                  <b>覆盖前会自动备份到下载目录</b>
                </div>
              </div>
              {importPreview.warnings.length ? (
                <ul className="form-error">
                  {importPreview.warnings.slice(0, 5).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
              <p className="dialog-lead">
                恢复会替换当前链条、判定记录、家庭数字与设置；审计表保留。
              </p>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setImportPreview(null)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void confirmImport()}
                >
                  备份当前并恢复
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <FirstRunDialog
        open={firstRun && !editorOpen}
        onEmpty={startEmpty}
        onDemo={loadDemo}
      />

      <ChainEditor
        open={editorOpen}
        initial={editorSeed}
        now={now}
        onClose={() => {
          setEditorOpen(false);
          setEditorSeed(undefined);
        }}
        onSave={saveChain}
      />

      <SettleDialog
        open={!!settleTarget}
        chain={settleChain}
        now={now}
        initialOutcome={settleTarget?.outcome}
        onClose={() => setSettleTarget(null)}
        onConfirm={confirmSettle}
      />

      {loadError ? (
        <VaultRecovery
          loadError={loadError}
          failure={vaultFault}
          status={vault}
        />
      ) : null}

      <DestroyDataDialog
        open={destroyOpen}
        onClose={() => setDestroyOpen(false)}
        onExport={() => doExport("json")}
      />

      {saveError ? (
        <div className="save-banner" role="alert">
          写入失败：{saveError}。当前修改可能未保存。
        </div>
      ) : null}

      <CommandPalette
        open={paletteOpen}
        seed={paletteSeed}
        onClose={closePalette}
        due={due}
        visible={visible}
        rate={rate}
        recordsCount={sampleSize}
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
