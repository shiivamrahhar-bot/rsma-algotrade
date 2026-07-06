import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { api, demoBacktest } from "../api/client";
import { DataTable, LoadingSpinner, StatCard } from "./ui";
import { InfoPanel } from "./InfoPanel";
import EquityCurveChart from "./EquityCurveChart";
import type { BacktestInterval, BacktestResult, BacktestSummary, BacktestTrade } from "../types/backtest";
import { formatNumber, formatPercent, formatTime, pnlClass } from "../utils/format";
import { AlertCircle, Search, Target, TrendingUp, Zap } from "lucide-react";

interface BacktestStudioProps {
  demoMode?: boolean;
}

const TIMEFRAMES: { id: BacktestInterval; label: string }[] = [
  { id: "day", label: "Daily (1D)" },
  { id: "60minute", label: "1 Hour" },
  { id: "15minute", label: "15 Minute" },
  { id: "5minute", label: "5 Minute" },
];

const PERIODS = [3, 6, 12];

class BacktestResultsBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || "Backtest results render nahi ho paaye" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("BacktestStudio render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-banner">
          Backtest data aa gaya lekin screen render nahi ho paayi: {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

function exitReasonLabel(reason: BacktestTrade["exitReason"]): { label: string; cls: string } {
  if (reason === "TARGET_HIT") return { label: "Target Hit", cls: "positive" };
  if (reason === "STOP_LOSS") return { label: "Stop Loss", cls: "negative" };
  if (reason === "TIME_EXIT") return { label: "Time Exit", cls: "neutral" };
  return { label: "End of Data", cls: "neutral" };
}

export default function BacktestStudio({ demoMode = false }: BacktestStudioProps) {
  const [symbol, setSymbol] = useState(demoMode ? "SBIN" : "");
  const [interval, setInterval_] = useState<BacktestInterval>("day");
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(demoMode ? demoBacktest : null);
  const [filter, setFilter] = useState<"all" | "Order Block" | "Fair Value Gap">("all");

  const run = async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) {
      setError("Pehle koi stock symbol daalo (jaise SBIN, RELIANCE, TCS)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 900));
        setResult({ ...demoBacktest, tradingsymbol: sym, monthsRequested: months });
      } else {
        const data = await api.runBacktest(sym, { interval, months });
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest fail ho gaya");
      // Keep the previous result visible on screen — don't wipe it out just
      // because a re-run failed (e.g. wrong symbol, session expired).
    } finally {
      setLoading(false);
    }
  };

  const trades = (result?.trades || []).filter((t) => filter === "all" || t.signalType === filter);
  const tf = TIMEFRAMES.find((t) => t.id === (result?.interval || interval));

  const tradeRows = trades
    .slice()
    .reverse()
    .map((t) => {
      const reason = exitReasonLabel(t.exitReason);
      return {
        signal: (
          <span className={`zone-badge ${t.direction}`}>
            {t.signalType === "Order Block" ? "OB" : "FVG"} · {t.direction === "bullish" ? "Bull" : "Bear"}
          </span>
        ),
        entry: (
          <span className="ind-cell">
            <strong>₹{formatNumber(t.entryPrice)}</strong>
            <small className="text-muted">{formatTime(t.entryDate)}</small>
          </span>
        ),
        stopTarget: (
          <span className="ind-cell">
            <small className="negative">SL ₹{formatNumber(t.stopLoss)}</small>
            <small className="positive">TP ₹{formatNumber(t.target)}</small>
          </span>
        ),
        exit: (
          <span className="ind-cell">
            <strong>₹{formatNumber(t.exitPrice)}</strong>
            <small className="text-muted">{formatTime(t.exitDate)}</small>
          </span>
        ),
        reason: <span className={reason.cls}>{reason.label}</span>,
        bars: t.barsHeld,
        pnl: <span className={pnlClass(t.pnlPct)}>{formatPercent(t.pnlPct)}</span>,
      };
    });

  return (
    <div className="backtest-view">
      <InfoPanel title="Yeh kaise kaam karta hai — Backtest Studio">
        <h4>Kya karta hai</h4>
        <ul>
          <li>Koi bhi NSE stock symbol daalo (jaise <code>SBIN</code>, <code>RELIANCE</code>, <code>TCS</code>) — sirf Nifty 50 tak limited nahi hai</li>
          <li>Pichle jitne bhi Order Blocks aur Fair Value Gaps (same SMC logic) us period mein bane, unke saath ek trade simulate hoti hai — entry zone edge par entry, stop-loss zone ke bahar, target ek fixed Risk:Reward par</li>
          <li>Result mein har trade ka entry/exit date, price, aur profit/loss % milta hai — plus overall win rate, profit factor, max drawdown</li>
        </ul>
        <h4>Timeframe aur Period</h4>
        <ul>
          <li><span className="timeframe-tag">Daily</span> — sabse lambi history (years), sabse kam trades (slow signals)</li>
          <li><span className="timeframe-tag">1-HOUR</span> — max ~380 din tak data</li>
          <li><span className="timeframe-tag">15-MIN</span> — max ~190 din tak data</li>
          <li><span className="timeframe-tag">5-MIN</span> — max ~90 din tak data (Kite ki retention limit ki wajah se — agar aap 12 months maango to bhi utna hi milega jitna available hai)</li>
        </ul>
        <h4>Limitation</h4>
        <ul>
          <li>Yeh ek simplified simulation hai — real trading costs (brokerage, slippage, taxes) include nahi hain</li>
          <li>Fixed Risk:Reward (~1.5% stop, ~2.5% target) use hota hai — real mein aap manually adjust karte ho</li>
        </ul>
      </InfoPanel>

      <div className="indicator-toolbar">
        <div className="indicator-controls">
          <div className="search-box bt-symbol-input">
            <Search size={16} />
            <input
              placeholder="Symbol daalo — SBIN, RELIANCE..."
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
          </div>

          <div className="tf-tabs">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.id}
                className={`tf-tab ${interval === t.id ? "active" : ""}`}
                onClick={() => setInterval_(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tf-tabs">
            {PERIODS.map((m) => (
              <button key={m} className={`tf-tab ${months === m ? "active" : ""}`} onClick={() => setMonths(m)}>
                {m}M
              </button>
            ))}
          </div>

          <button className="btn-primary indicator-load-btn" onClick={run} disabled={loading}>
            {loading ? "Backtesting..." : "Run Backtest"}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!result && !loading && (
        <div className="empty-state">
          Symbol, timeframe aur period select karke <strong>Run Backtest</strong> click karo.
        </div>
      )}

      {loading && !result && (
        <div className="indicator-loading">
          <LoadingSpinner />
          <p>{symbol || "Stock"} ka {months} months ka data fetch ho raha hai aur trades simulate ho rahe hain...</p>
        </div>
      )}

      {result && (
        <BacktestResultsBoundary key={`${result.tradingsymbol}-${result.interval}-${result.periodTo}`}>
          {loading && (
            <div className="tag-live bt-refreshing">
              <span className="spinner sm" /> Naya scan chal raha hai — purana result dikh raha hai jab tak naya na aa jaaye...
            </div>
          )}

          <div className="indicator-meta">
            <span><strong>{result.tradingsymbol}</strong> · {result.name}</span>
            <span className="tag-muted">{tf?.label}</span>
            <span className="tag-muted">{formatTime(result.periodFrom)} → {formatTime(result.periodTo)}</span>
            {result.truncatedToRetentionLimit && (
              <span className="tag-warn">
                <AlertCircle size={12} /> Data retention limit ki wajah se period truncate hua
              </span>
            )}
          </div>

          <SummaryCards summary={result.summary} />

          <div className="smc-section">
            <h3><Zap size={16} /> Equity Curve — Cumulative P&L %</h3>
            <EquityCurveChart points={result.summary.equityCurve} />
          </div>

          <div className="two-col">
            <div className="card">
              <h3><Target size={16} /> Order Block Trades</h3>
              <MiniSummary summary={result.orderBlockSummary} />
            </div>
            <div className="card">
              <h3><TrendingUp size={16} /> Fair Value Gap Trades</h3>
              <MiniSummary summary={result.fvgSummary} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Trade Log ({trades.length})</h2>
              <div className="tf-tabs">
                {(["all", "Order Block", "Fair Value Gap"] as const).map((f) => (
                  <button key={f} className={`tf-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
            </div>
            <DataTable
              columns={[
                { key: "signal", label: "Signal" },
                { key: "entry", label: "Entry" },
                { key: "stopTarget", label: "SL / Target" },
                { key: "exit", label: "Exit" },
                { key: "reason", label: "Exit Reason" },
                { key: "bars", label: "Bars Held", align: "right" },
                { key: "pnl", label: "P&L %", align: "right" },
              ]}
              rows={tradeRows}
              emptyMessage="Is period mein koi trades nahi mile"
            />
          </div>
        </BacktestResultsBoundary>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: BacktestSummary }) {
  return (
    <div className="stats-row">
      <StatCard label="Total Trades" value={String(summary.totalTrades)} sub={`${summary.wins}W / ${summary.losses}L`} />
      <StatCard
        label="Win Rate"
        value={summary.winRate != null ? `${summary.winRate}%` : "—"}
        trend={summary.winRate != null ? (summary.winRate >= 50 ? "up" : "down") : "neutral"}
      />
      <StatCard
        label="Total P&L"
        value={formatPercent(summary.totalPnlPct)}
        trend={summary.totalPnlPct >= 0 ? "up" : "down"}
      />
      <StatCard
        label="Profit Factor"
        value={summary.profitFactor != null ? summary.profitFactor.toFixed(2) : "—"}
        sub={`Max Drawdown: ${summary.maxDrawdownPct.toFixed(2)}%`}
        trend={summary.profitFactor != null ? (summary.profitFactor >= 1.5 ? "up" : "down") : "neutral"}
      />
    </div>
  );
}

function MiniSummary({ summary }: { summary: BacktestSummary }) {
  if (summary.totalTrades === 0) {
    return <div className="text-muted">Is period mein koi signal nahi bana</div>;
  }
  return (
    <div className="entry-grid">
      <div className="detail-stat">
        <span>Trades</span>
        <strong>{summary.totalTrades}</strong>
      </div>
      <div className="detail-stat">
        <span>Win Rate</span>
        <strong className={summary.winRate != null && summary.winRate >= 50 ? "positive" : "negative"}>
          {summary.winRate != null ? `${summary.winRate}%` : "—"}
        </strong>
      </div>
      <div className="detail-stat">
        <span>Avg Win</span>
        <strong className="positive">{summary.avgWinPct != null ? formatPercent(summary.avgWinPct) : "—"}</strong>
      </div>
      <div className="detail-stat">
        <span>Avg Loss</span>
        <strong className="negative">{summary.avgLossPct != null ? formatPercent(summary.avgLossPct) : "—"}</strong>
      </div>
      <div className="detail-stat">
        <span>Total P&L</span>
        <strong className={pnlClass(summary.totalPnlPct)}>{formatPercent(summary.totalPnlPct)}</strong>
      </div>
      <div className="detail-stat">
        <span>Max Drawdown</span>
        <strong className="negative">{summary.maxDrawdownPct.toFixed(2)}%</strong>
      </div>
    </div>
  );
}
