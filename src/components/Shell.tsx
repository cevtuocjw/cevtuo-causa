import { useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import {
  BookOpen,
  Lock,
  RefreshCw,
  Scale,
  Search,
  Settings,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CADENCE } from "../data/chains";
import { Mark } from "./Icon";
import { RefreshPanel } from "./Quant";

export type View = "ledger" | "projection" | "calibration";

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "ledger", label: "账本", icon: BookOpen },
  { id: "projection", label: "投影", icon: Target },
  { id: "calibration", label: "校准", icon: Scale },
];

export function IconRail({
  view,
  onView,
  onVault,
  onSettings,
}: {
  view: View;
  onView: (v: View) => void;
  onVault: () => void;
  onSettings: () => void;
}) {
  return (
    <aside className="rail glass" aria-label="主导航">
      <div className="rail-brand">
        <Mark className="rail-mark" />
        <span className="rail-tip">Cevtuo Causa · 因果簿</span>
      </div>

      <nav className="rail-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rail-item ${view === item.id ? "active" : ""}`}
            onClick={() => onView(item.id)}
            aria-label={item.label}
            aria-current={view === item.id ? "page" : undefined}
          >
            <item.icon size={18} strokeWidth={1.6} />
            <span className="rail-tip">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="rail-bottom">
        <button
          type="button"
          className="rail-item"
          onClick={onVault}
          aria-label="本地保险箱"
        >
          <Lock size={18} strokeWidth={1.6} />
          <span className="rail-tip">本地保险箱</span>
        </button>
        <button
          type="button"
          className="rail-item"
          onClick={onSettings}
          aria-label="设置"
        >
          <Settings size={18} strokeWidth={1.6} />
          <span className="rail-tip">设置</span>
        </button>
      </div>
    </aside>
  );
}

export function TopBar({
  title,
  children,
  onPalette,
  lastRefresh,
  onRefresh,
}: {
  title: string;
  children?: ReactNode;
  onPalette: () => void;
  lastRefresh: string;
  onRefresh: () => void;
}) {
  const [refreshOpen, setRefreshOpen] = useState(false);

  return (
    <header className="topbar glass">
      <div className="topbar-left">
        <h1>{title}</h1>
        {children}
      </div>

      <div className="topbar-actions">
        <div className="refresh-wrap">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setRefreshOpen((v) => !v)}
            aria-label="更新状态"
            aria-expanded={refreshOpen}
          >
            <RefreshCw size={16} />
            <span className="fresh-dot" />
          </button>
          <AnimatePresence>
            {refreshOpen ? (
              <RefreshPanel
                cadence={CADENCE}
                lastRefresh={lastRefresh}
                onRefresh={() => {
                  onRefresh();
                  setRefreshOpen(false);
                }}
                onClose={() => setRefreshOpen(false)}
              />
            ) : null}
          </AnimatePresence>
        </div>
        <button
          type="button"
          className="cmd-top"
          onClick={onPalette}
          aria-label="问账本"
        >
          <Search size={14} />
          <span className="num">⌘K</span>
        </button>
      </div>
    </header>
  );
}
