import { useCallback, useEffect, useState } from "react";
import { api, demoMomentumScan } from "../api/client";
import { DataTable, LoadingSpinner } from "../components/ui";
import TradeModal from "../components/TradeModal";
import TriggerLogPanel from "./TriggerLogPanel";
import { MomentumInfoPanel } from "./InfoPanel";
import { useAlerts } from "../context/AlertContext";
import type { MomentumDetail, MomentumStock, MomentumUniverse } from "../types/momentum";
import { formatMarketTime, formatNumber, formatPercent, pnlClass } from "../utils/format";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
  Zap,
} from "lucide-react";

interface MomentumScannerProps {
  demoMode?: boolean;
}

type ScannerView = "scanner" | "trigger-log";

export default function MomentumScanner({ demoMode = false }: MomentumScannerProps) {
  const {
    ingestStocks,
    getTriggerTime,
    watchEnabled,
    setWatchEnabled,
    requestNotifications,
    pendingSymbol,
    openStock,
    pendingTrade,
    setPendingTrade,
    markOrderPlaced,
  } = useAlerts();

  const [view, setView] = useState<ScannerView>("scanner");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stocks, setStocks] = useState<MomentumStock[]>([]);
  const [meta, setMeta] = useState({ scannedAt: "", suddenCount: 0, totalScanned: 0, cached: false });
  const [universe, setUniverse] = useState<MomentumUniverse>("nifty50");
  const [suddenOnly, setSuddenOnly] = useState(false);
  const [selected, setSelected] = useState<MomentumDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [search, setSearch] = useState("");

  const loadScan = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      let stockList: MomentumStock[];
      if (demoMode) {
        stockList = demoMomentumScan.stocks;
        setMeta({
          scannedAt: demoMomentumScan.scannedAt,
          suddenCount: demoMomentumScan.suddenCount,
          totalScanned: demoMomentumScan.totalScanned,
          cached: false,
        });
      } else {
        const data = await api.momentumScan({ universe, suddenOnly, limit: 40 });
        stockList = data.stocks;
        setMeta({
          scannedAt: data.scannedAt,
          suddenCount: data.suddenCount,
          totalScanned: data.totalScanned,
          cached: data.cached,
        });
      }
      setStocks(stockList);
      ingestStocks(stockList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoMode, universe, suddenOnly, ingestStocks]);

  useEffect(() => {
    loadScan();
  }, [loadScan]);

  const openDetail = async (stock: MomentumStock) => {
    setDetailLoading(true);
    try {
      if (demoMode) {
        setSelected({
          ...stock,
          candles: stock.recentCandles,
          buyChecklist: {
            priceAboveOpen: stock.ltp > stock.open,
            volumeSurge: stock.volumeSurge >= 1.5,
            positive5d: stock.momentum5d > 0,
            positive10d: stock.momentum10d > 0,
            notAtCircuit: stock.ltp < stock.upperCircuit * 0.995,
            momentumAccelerating: stock.acceleration > 0,
          },
        });
      } else {
        const detail = await api.momentumDetail(stock.tradingsymbol);
        setSelected(detail);
      }
    } catch {
      setError("Could not load stock detail");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingSymbol) return;
    const stock = stocks.find((s) => s.tradingsymbol === pendingSymbol);
    if (stock) {
      openDetail(stock);
      openStock(null);
    }
  }, [pendingSymbol, stocks, openStock]);

  useEffect(() => {
    if (!pendingTrade) return;
    const stock = stocks.find((s) => s.tradingsymbol === pendingTrade.tradingsymbol);
    if (stock) {
      openDetail(stock).then(() => setShowTrade(true));
      setPendingTrade(null);
    }
  }, [pendingTrade, stocks]);

  const enableWatch = async () => {
    await requestNotifications();
    setWatchEnabled(true);
  };

  const filtered = stocks.filter(
    (s) =>
      !search ||
      s.tradingsymbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="momentum-loading">
        <LoadingSpinner />
        <p>Scanning stocks — fetching quotes & 20-day history...</p>
      </div>
    );
  }

  const rows = filtered.map((s) => ({
    rank: (
      <span className={`momentum-score ${s.momentumScore >= 8 ? "hot" : ""}`}>
        {s.momentumScore.toFixed(1)}
      </span>
    ),
    stock: (
      <span className="symbol-cell">
        <strong>{s.tradingsymbol}</strong>
        <small>{s.name}</small>
      </span>
    ),
    signal: (
      <span className={`signal-badge ${s.suddenMomentum ? "sudden" : s.strongMomentum ? "strong" : ""}`}>
        {s.suddenMomentum && <Flame size={12} />}
        {s.signal}
      </span>
    ),
    ltp: formatNumber(s.ltp),
    day: <span className={pnlClass(s.dayChange)}>{formatPercent(s.dayChange)}</span>,
    intra: <span className={pnlClass(s.intradayChange)}>{formatPercent(s.intradayChange)}</span>,
    m5: <span className={pnlClass(s.momentum5d)}>{formatPercent(s.momentum5d)}</span>,
    m10: <span className={pnlClass(s.momentum10d)}>{formatPercent(s.momentum10d)}</span>,
    m20: <span className={pnlClass(s.momentum20d)}>{formatPercent(s.momentum20d)}</span>,
    vol: <span className={s.volumeSurge >= 1.8 ? "positive" : ""}>{s.volumeSurge.toFixed(1)}x</span>,
    detected: (() => {
      const t = s.triggeredAt || getTriggerTime(s.tradingsymbol);
      return t ? (
        <span className="detected-time" title="Market trigger time (IST)">
          <Clock size={11} />{formatMarketTime(t)}
        </span>
      ) : (
        <span className="text-muted">—</span>
      );
    })(),
    buyAt: s.triggerPrice ? (
      <span className="buy-price">₹{formatNumber(s.triggerPrice)}</span>
    ) : (
      <span className="text-muted">—</span>
    ),
    action: (
      <button className="btn-detail" onClick={() => openDetail(s)}>
        Details <ArrowUpRight size={14} />
      </button>
    ),
  }));

  return (
    <div className="momentum-scanner">
      <MomentumInfoPanel />

      <div className="scanner-view-tabs">
        <button className={view === "scanner" ? "active" : ""} onClick={() => setView("scanner")}>
          Live Scanner
        </button>
        <button className={view === "trigger-log" ? "active" : ""} onClick={() => setView("trigger-log")}>
          <Clock size={14} /> Buy Trigger Log (Backtest)
        </button>
      </div>

      {view === "trigger-log" ? (
        <TriggerLogPanel
          demoMode={demoMode}
          universe={universe}
          onSelect={(sym) => {
            setView("scanner");
            openStock(sym);
          }}
        />
      ) : (
        <>
      <div className="momentum-toolbar">
        <div className="momentum-filters">
          <select value={universe} onChange={(e) => setUniverse(e.target.value as MomentumUniverse)}>
            <option value="nifty50">Nifty 50 (Fast)</option>
            <option value="fno">F&O Stocks (~200)</option>
            <option value="nse_all">All NSE Liquid</option>
          </select>
          <label className="filter-check">
            <input
              type="checkbox"
              checked={suddenOnly}
              onChange={(e) => setSuddenOnly(e.target.checked)}
            />
            <Flame size={14} />
            Sudden Momentum Only
          </label>
          <label className="filter-check watch-toggle">
            <input
              type="checkbox"
              checked={watchEnabled}
              onChange={(e) => (e.target.checked ? enableWatch() : setWatchEnabled(false))}
            />
            <Bell size={14} />
            Auto-Watch + Notify (2 min)
          </label>
          <div className="search-box">
            <Search size={16} />
            <input
              placeholder="Search stock..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="momentum-meta">
          <span>
            <Zap size={14} /> {meta.suddenCount} sudden momentum detected
          </span>
          <span>Scanned {meta.totalScanned} stocks</span>
          {meta.cached && <span className="cached-tag">Cached</span>}
          <button className="btn-icon" onClick={() => loadScan(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="momentum-legend">
        <span><strong>Score</strong> = Day% + 5D/10D/20D momentum + Volume surge + Acceleration</span>
        <span className="legend-sudden"><Flame size={12} /> Sudden = Volume 1.8x+ avg + Price spike today</span>
      </div>

      <DataTable
        columns={[
          { key: "rank", label: "Score", align: "right" },
          { key: "stock", label: "Stock" },
          { key: "signal", label: "Signal" },
          { key: "ltp", label: "LTP", align: "right" },
          { key: "day", label: "Today %", align: "right" },
          { key: "intra", label: "Intraday %", align: "right" },
          { key: "m5", label: "5D %", align: "right" },
          { key: "m10", label: "10D %", align: "right" },
          { key: "m20", label: "20D %", align: "right" },
          { key: "vol", label: "Vol Surge", align: "right" },
          { key: "detected", label: "🕐 Trigger Time" },
          { key: "buyAt", label: "Buy @", align: "right" },
          { key: "action", label: "" },
        ]}
        rows={rows}
        emptyMessage="No momentum stocks found for this filter"
      />
        </>
      )}

      {(selected || detailLoading) && (
        <div className="detail-overlay" onClick={() => !detailLoading && setSelected(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <LoadingSpinner />
            ) : selected ? (
              <StockDetail
                stock={selected}
                demoMode={demoMode}
                onClose={() => { setSelected(null); setShowTrade(false); }}
                onBuy={() => setShowTrade(true)}
              />
            ) : null}
          </div>
        </div>
      )}

      {showTrade && selected && (
        <TradeModal
          stock={selected}
          demoMode={demoMode}
          onClose={() => setShowTrade(false)}
          onSuccess={(sym) => markOrderPlaced(sym)}
        />
      )}
    </div>
  );
}

function StockDetail({
  stock,
  onClose,
  onBuy,
}: {
  stock: MomentumDetail;
  demoMode?: boolean;
  onClose: () => void;
  onBuy: () => void;
}) {
  const checks = stock.buyChecklist;
  const checklist = [
    { label: "Price above today's open", ok: checks.priceAboveOpen },
    { label: "Volume surge (1.5x+ avg)", ok: checks.volumeSurge },
    { label: "5-day momentum positive", ok: checks.positive5d },
    { label: "10-day momentum positive", ok: checks.positive10d },
    { label: "Not at upper circuit", ok: checks.notAtCircuit },
    { label: "Momentum accelerating", ok: checks.momentumAccelerating },
  ];
  const passCount = checklist.filter((c) => c.ok).length;

  return (
    <>
      <div className="detail-header">
        <div>
          <h2>{stock.tradingsymbol}</h2>
          <p>{stock.name}</p>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={18} /></button>
      </div>

      <div className={`detail-signal ${stock.suddenMomentum ? "sudden" : ""}`}>
        {stock.suddenMomentum ? <Flame size={18} /> : <Zap size={18} />}
        <div>
          <strong>{stock.signal}</strong>
          <span>Momentum Score: {stock.momentumScore}</span>
        </div>
      </div>

      {stock.triggeredAt && (
        <div className="backtest-box">
          <h3><Clock size={16} /> Backtest — Buy Signal</h3>
          <div className="backtest-row">
            <span>Trigger Time (IST)</span>
            <strong className="trigger-highlight">{formatMarketTime(stock.triggeredAt)}</strong>
          </div>
          <div className="backtest-row">
            <span>Buy Price @ Trigger</span>
            <strong>₹{formatNumber(stock.triggerPrice ?? 0)}</strong>
          </div>
          <div className="backtest-row">
            <span>Day % at Trigger</span>
            <strong className="positive">{formatPercent(stock.triggerDayChange ?? 0)}</strong>
          </div>
          <div className="backtest-row">
            <span>Current Price</span>
            <strong>₹{formatNumber(stock.ltp)}</strong>
          </div>
          {stock.gainSinceTrigger != null && (
            <div className="backtest-row">
              <span>If bought at trigger</span>
              <strong className={pnlClass(stock.gainSinceTrigger)}>
                {formatPercent(stock.gainSinceTrigger)}
              </strong>
            </div>
          )}
          <p className="backtest-hint">
            Is time pe buy karte to aaj yeh return hota — chart se verify karo
          </p>
        </div>
      )}

      <div className="detail-grid">
        <DetailStat label="LTP" value={`₹${formatNumber(stock.ltp)}`} />
        <DetailStat label="Today" value={formatPercent(stock.dayChange)} trend={stock.dayChange} />
        <DetailStat label="Intraday" value={formatPercent(stock.intradayChange)} trend={stock.intradayChange} />
        <DetailStat label="5 Day" value={formatPercent(stock.momentum5d)} trend={stock.momentum5d} />
        <DetailStat label="10 Day" value={formatPercent(stock.momentum10d)} trend={stock.momentum10d} />
        <DetailStat label="20 Day" value={formatPercent(stock.momentum20d)} trend={stock.momentum20d} />
        <DetailStat label="Volume Surge" value={`${stock.volumeSurge.toFixed(1)}x`} />
        <DetailStat label="Acceleration" value={formatPercent(stock.acceleration)} trend={stock.acceleration} />
        <DetailStat label="Gap %" value={formatPercent(stock.gapPercent)} trend={stock.gapPercent} />
        <DetailStat label="From 20D High" value={formatPercent(stock.distFromHigh20d)} />
        <DetailStat label="Upper Circuit" value={`₹${formatNumber(stock.upperCircuit)}`} />
        <DetailStat label="Lower Circuit" value={`₹${formatNumber(stock.lowerCircuit)}`} />
      </div>

      <div className="buy-checklist">
        <h3>
          <CheckCircle2 size={16} />
          Buy Checklist — {passCount}/{checklist.length} passed
        </h3>
        <div className="checklist-grid">
          {checklist.map((c) => (
            <div key={c.label} className={`check-item ${c.ok ? "pass" : "fail"}`}>
              {c.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mini-chart">
        <h3>Last 10 Days — Close Price</h3>
        <div className="chart-bars">
          {(stock.candles?.length ? stock.candles.slice(-10) : stock.recentCandles).map((c, i) => {
            const prices = (stock.candles?.length ? stock.candles.slice(-10) : stock.recentCandles).map((x) => x.close);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const h = max > min ? ((c.close - min) / (max - min)) * 100 : 50;
            return (
              <div key={i} className="chart-bar-wrap" title={`${c.date}: ₹${c.close}`}>
                <div className="chart-bar" style={{ height: `${Math.max(h, 8)}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="detail-ohlc">
        <span>Open: ₹{formatNumber(stock.open)}</span>
        <span>High: ₹{formatNumber(stock.high)}</span>
        <span>Low: ₹{formatNumber(stock.low)}</span>
        <span>Prev Close: ₹{formatNumber(stock.prevClose)}</span>
        <span>Vol: {(stock.volume / 100000).toFixed(2)}L</span>
        <span>Avg Vol 20D: {(stock.avgVolume20d / 100000).toFixed(2)}L</span>
      </div>

      <button className="btn-buy-execute" onClick={onBuy}>
        <ShoppingCart size={18} />
        Execute Buy Order
      </button>
    </>
  );
}

function DetailStat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: number;
}) {
  return (
    <div className="detail-stat">
      <span>{label}</span>
      <strong className={trend !== undefined ? pnlClass(trend) : ""}>{value}</strong>
    </div>
  );
}
