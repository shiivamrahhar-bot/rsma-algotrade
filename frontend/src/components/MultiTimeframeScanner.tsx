import { useCallback, useEffect, useState } from "react";
import { api, demoMTFAnalysis, demoMTFLeaderboard } from "../api/client";
import { DataTable, LoadingSpinner } from "./ui";
import SMCDetailContent from "./SMCDetailContent";
import { InfoPanel } from "./InfoPanel";
import type { MTFAnalysisResult, MTFInterval, MTFLeaderboardResult, MTFLeaderboardRow } from "../types/mtf";
import { formatNumber, pnlClass } from "../utils/format";
import { actionClass, zoneLabel } from "../utils/smcHelpers";
import { Clock, RefreshCw, Search, TrendingDown, TrendingUp, Zap } from "lucide-react";

interface MultiTimeframeScannerProps {
  demoMode?: boolean;
}

const TIMEFRAMES: { id: MTFInterval; label: string; refreshMs: number }[] = [
  { id: "5minute", label: "5 Minute", refreshMs: 90000 },
  { id: "15minute", label: "15 Minute", refreshMs: 90000 },
  { id: "60minute", label: "1 Hour", refreshMs: 90000 },
];

function formatCandleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MultiTimeframeScanner({ demoMode = false }: MultiTimeframeScannerProps) {
  const [interval, setInterval_] = useState<MTFInterval>("15minute");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MTFLeaderboardResult | null>(
    demoMode ? demoMTFLeaderboard : null
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MTFAnalysisResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, silent ? 300 : 600));
        setData({ ...demoMTFLeaderboard, interval, generatedAt: new Date().toISOString() });
      } else {
        const result = await api.mtfLeaderboard(interval, "nifty50");
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load multi-timeframe leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoMode, interval]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const tf = TIMEFRAMES.find((t) => t.id === interval);
    const id = window.setInterval(() => load(true), tf?.refreshMs ?? 90000);
    return () => window.clearInterval(id);
  }, [autoRefresh, interval, load]);

  const openAnalysis = async (row: MTFLeaderboardRow) => {
    setDetailLoading(true);
    setError(null);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 400));
        setSelected({ ...demoMTFAnalysis, tradingsymbol: row.tradingsymbol, name: row.name, interval });
      } else {
        const result = await api.mtfAnalysis(row.tradingsymbol, interval);
        setSelected(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock analysis");
    } finally {
      setDetailLoading(false);
    }
  };

  const rows = (data?.rows || []).filter(
    (r) =>
      !search ||
      r.tradingsymbol.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  const tableRows = rows.map((r) => ({
    stock: (
      <span className="symbol-cell">
        <strong>{r.tradingsymbol}</strong>
        <small>{r.name}</small>
      </span>
    ),
    time: (
      <span className="detected-time">
        <Clock size={11} /> {formatCandleTime(r.lastCandleTime)}
      </span>
    ),
    close: `₹${formatNumber(r.close)}`,
    trend: r.trend ? (
      <span className={r.trend === "up" ? "positive" : "negative"}>
        {r.trend === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {r.trend}
      </span>
    ) : (
      <span className="text-muted">—</span>
    ),
    zone: (
      <span className={r.zone?.includes("discount") ? "positive" : r.zone?.includes("premium") ? "negative" : "neutral"}>
        {zoneLabel(r.zone)}
      </span>
    ),
    proximity:
      r.action === "BUY NOW" ? (
        <span className="proximity-now"><Zap size={12} /> NOW</span>
      ) : r.proximityPct != null ? (
        <span className="proximity-pct">{r.proximityPct}% away</span>
      ) : (
        <span className="text-muted">—</span>
      ),
    score: <span className={pnlClass(r.score)}>{r.score > 0 ? "+" : ""}{r.score}</span>,
    action: <span className={`entry-action-badge sm ${actionClass(r.action)}`}>{r.action}</span>,
    analyze: (
      <button className="btn-detail" onClick={() => openAnalysis(r)}>
        Analyze
      </button>
    ),
  }));

  const tf = TIMEFRAMES.find((t) => t.id === interval)!;

  return (
    <div className="mtf-view">
      <InfoPanel title="Yeh kaise kaam karta hai — Multi-Timeframe Live Entries">
        <h4>Kya hai yeh</h4>
        <ul>
          <li>Yahan <strong>daily nahi</strong>, balki <strong>intraday timeframe</strong> (5-min, 15-min, 1-hour) pe live SMC analysis hota hai</li>
          <li>Har stock ka <strong>abhi ka</strong> Order Block/FVG/Structure/Entry Plan calculate hota hai — koi date pick nahi karna</li>
          <li><strong>Sorting</strong>: sabse pehle "BUY NOW" (entry already trigger ho chuki), fir "WAIT FOR RETEST" proximity ke hisaab se (jiski entry sabse jaldi/najdeek hai wo upar)</li>
        </ul>
        <h4>Timeframe details</h4>
        <ul>
          <li><span className="timeframe-tag">5-MIN</span> — sabse fast signals, zyada noise bhi; last 5 din ka data</li>
          <li><span className="timeframe-tag">15-MIN</span> — balanced, last 10 din ka data (Recommended)</li>
          <li><span className="timeframe-tag">1-HOUR</span> — slower but zyada reliable, last 25 din ka data</li>
        </ul>
        <h4>Auto-Refresh</h4>
        <ul>
          <li>Har 90 second mein naya scan chalta hai jab "Auto-Refresh" ON ho — taaki jaise hi koi entry trigger ho, turant dikhe</li>
        </ul>
      </InfoPanel>

      <div className="indicator-toolbar">
        <div className="indicator-controls">
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

          <button className="btn-primary indicator-load-btn" onClick={() => load()} disabled={loading}>
            {loading ? "Scanning..." : "Scan Now"}
          </button>

          <label className="filter-check watch-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <RefreshCw size={13} className={refreshing ? "spin" : ""} />
            Auto-Refresh (every 90s)
          </label>

          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search stock..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="smc-legend">
          <span>Timeframe: <strong>{tf.label}</strong> · Sorted by imminent entry (kiski entry sabse jaldi hone wali hai)</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!data && !loading && (
        <div className="empty-state">
          Timeframe choose karke <strong>Scan Now</strong> click karo — Nifty 50 stocks ko us timeframe
          pe live scan karke dikhayenge ki kiski entry abhi trigger ho chuki hai ya sabse jaldi hone wali hai.
        </div>
      )}

      {loading && (
        <div className="indicator-loading">
          <LoadingSpinner />
          <p>{tf.label} timeframe pe Nifty 50 scan ho raha hai — ~40-60 sec lagenge...</p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="indicator-meta">
            <span><strong>{data.totalReturned}</strong>/{data.totalRequested} stocks · {tf.label}</span>
            <span className="tag-live">Live — last candle {formatCandleTime(data.generatedAt)}</span>
            {data.cached && <span className="tag-muted">Cached (~90s)</span>}
          </div>
          <DataTable
            columns={[
              { key: "stock", label: "Stock" },
              { key: "time", label: "Last Candle" },
              { key: "close", label: "Price", align: "right" },
              { key: "trend", label: "Structure", align: "right" },
              { key: "zone", label: "Zone", align: "right" },
              { key: "proximity", label: "Entry Proximity", align: "right" },
              { key: "score", label: "Score", align: "right" },
              { key: "action", label: "Action" },
              { key: "analyze", label: "" },
            ]}
            rows={tableRows}
            emptyMessage="No data for this timeframe"
          />
        </>
      )}

      {(selected || detailLoading) && (
        <div className="detail-overlay" onClick={() => !detailLoading && setSelected(null)}>
          <div className="detail-panel smc-detail-panel" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? <LoadingSpinner /> : selected ? (
              <SMCDetailContent
                result={selected}
                subtitle={`${selected.name} · ${tf.label} · ${formatCandleTime(selected.date)} · ₹${formatNumber(selected.close)}`}
                chartCaption={`Chart ${tf.label} candles par based hai (live) — solid lines = fresh Order Blocks, dashed = mitigated, dotted = unfilled FVG.`}
                onClose={() => setSelected(null)}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
