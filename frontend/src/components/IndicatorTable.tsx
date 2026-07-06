import { useState } from "react";
import { api, demoIndicatorTable } from "../api/client";
import { DataTable, LoadingSpinner } from "./ui";
import type { IndicatorRow, IndicatorTableResult, IndicatorColumnGroup } from "../types/indicators";
import { formatNumber, formatPercent, pnlClass } from "../utils/format";
import {
  adxRead,
  bbRead,
  fmtOrDash,
  macdRead,
  priceStructureSummary,
  rsiRead,
  stochRead,
  supertrendRead,
  trendVsMA,
} from "../utils/indicatorInterpret";
import { IndicatorInfoPanel } from "./InfoPanel";
import {
  AlertCircle,
  BarChart3,
  Gauge,
  LineChart,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

interface IndicatorTableProps {
  demoMode?: boolean;
}

const GROUP_LABELS: Record<IndicatorColumnGroup, { label: string; icon: typeof TrendingUp }> = {
  trend: { label: "Trend (MA/Supertrend)", icon: TrendingUp },
  momentum: { label: "Momentum (RSI/MACD/Stoch)", icon: Gauge },
  volatility: { label: "Volatility (BB/ATR/ADX)", icon: BarChart3 },
  volume: { label: "Volume/VWAP/Live", icon: LineChart },
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function twoLine(top: string, bottomLabel: string, bottomCls: string) {
  return (
    <span className="ind-cell">
      <strong>{top}</strong>
      <small className={bottomCls}>{bottomLabel}</small>
    </span>
  );
}

export default function IndicatorTable({ demoMode = false }: IndicatorTableProps) {
  const [date, setDate] = useState(todayStr());
  const [includeOI, setIncludeOI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IndicatorTableResult | null>(demoMode ? demoIndicatorTable : null);
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<Set<IndicatorColumnGroup>>(
    new Set<IndicatorColumnGroup>(["trend", "momentum", "volatility", "volume"])
  );
  const [selected, setSelected] = useState<IndicatorRow | null>(null);

  const toggleGroup = (g: IndicatorColumnGroup) => {
    setGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 600));
        setData({ ...demoIndicatorTable, date });
      } else {
        const result = await api.indicatorsTable({ date, universe: "nifty50", includeOI });
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load indicator table");
    } finally {
      setLoading(false);
    }
  };

  const rows = (data?.rows || []).filter(
    (r) =>
      !search ||
      r.tradingsymbol.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: { key: string; label: string; align?: "left" | "right" }[] = [
    { key: "symbol", label: "Stock" },
    { key: "close", label: "Close", align: "right" },
    { key: "priceDelta", label: "Price Δ%", align: "right" },
    { key: "volumeDelta", label: "Volume Δ%", align: "right" },
  ];

  if (groups.has("trend")) {
    columns.push(
      { key: "sma20", label: "vs SMA20", align: "right" },
      { key: "sma50", label: "vs SMA50", align: "right" },
      { key: "sma200", label: "vs SMA200", align: "right" },
      { key: "supertrend", label: "Supertrend", align: "right" }
    );
  }
  if (groups.has("momentum")) {
    columns.push(
      { key: "rsi", label: "RSI(14)", align: "right" },
      { key: "macd", label: "MACD", align: "right" },
      { key: "stoch", label: "Stoch %K", align: "right" }
    );
  }
  if (groups.has("volatility")) {
    columns.push(
      { key: "bb", label: "Bollinger %B", align: "right" },
      { key: "atr", label: "ATR(14)", align: "right" },
      { key: "adx", label: "ADX(14)", align: "right" }
    );
  }
  if (groups.has("volume")) {
    columns.push({ key: "vwap", label: "VWAP", align: "right" });
    if (data?.includeOI) columns.push({ key: "oi", label: "OI Δ% (FUT)", align: "right" });
    if (data?.isToday) columns.push({ key: "imbalance", label: "Order Imbalance (live)", align: "right" });
  }
  columns.push({ key: "action", label: "" });

  const tableRows = rows.map((r) => {
    const rsi = rsiRead(r.rsi14);
    const macd = macdRead(r.macdHistogram);
    const stoch = stochRead(r.stochK);
    const bb = bbRead(r.bbPercentB);
    const adx = adxRead(r.adx);
    const st = supertrendRead(r.supertrendDirection);
    const vsSma20 = trendVsMA(r.close, r.sma20);
    const vsSma50 = trendVsMA(r.close, r.sma50);
    const vsSma200 = trendVsMA(r.close, r.sma200);

    return {
      symbol: (
        <span className="symbol-cell">
          <strong>{r.tradingsymbol}</strong>
          <small>{r.name}</small>
        </span>
      ),
      close: `₹${formatNumber(r.close)}`,
      priceDelta: <span className={pnlClass(r.priceDelta)}>{formatPercent(r.priceDelta)}</span>,
      volumeDelta:
        r.volumeDelta == null ? (
          <span className="text-muted">—</span>
        ) : (
          <span className={pnlClass(r.volumeDelta)}>{formatPercent(r.volumeDelta)}</span>
        ),
      sma20: twoLine(fmtOrDash(r.sma20), vsSma20.label, vsSma20.cls),
      sma50: twoLine(fmtOrDash(r.sma50), vsSma50.label, vsSma50.cls),
      sma200: twoLine(fmtOrDash(r.sma200), vsSma200.label, vsSma200.cls),
      supertrend: twoLine(fmtOrDash(r.supertrendValue), st.label, st.cls),
      rsi: <span className={rsi.cls}>{rsi.label}</span>,
      macd: twoLine(fmtOrDash(r.macdHistogram), macd.label, macd.cls),
      stoch: <span className={stoch.cls}>{stoch.label}</span>,
      bb: <span className={bb.cls}>{r.bbPercentB == null ? "—" : r.bbPercentB.toFixed(2)} · {bb.label}</span>,
      atr: fmtOrDash(r.atr14),
      adx: <span className={adx.cls}>{adx.label}</span>,
      vwap: r.vwap == null ? <span className="text-muted">N/A (60d limit)</span> : `₹${formatNumber(r.vwap)}`,
      oi: r.oi == null ? (
        <span className="text-muted">—</span>
      ) : r.oi.oiChange == null ? (
        <span className="text-muted">{r.oi.contract}</span>
      ) : (
        <span className={pnlClass(r.oi.oiChange)}>{formatPercent(r.oi.oiChange)}</span>
      ),
      imbalance: r.liveExtras == null ? (
        <span className="text-muted">—</span>
      ) : (
        <span className={pnlClass(r.liveExtras.orderImbalance)}>
          {formatPercent(r.liveExtras.orderImbalance)}
        </span>
      ),
      action: (
        <button className="btn-detail" onClick={() => setSelected(r)}>
          Details
        </button>
      ),
    };
  });

  return (
    <div className="indicator-table-view">
      <IndicatorInfoPanel />

      <div className="indicator-toolbar">
        <div className="indicator-controls">
          <label className="date-picker-label">
            Date
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="filter-check">
            <input type="checkbox" checked={includeOI} onChange={(e) => setIncludeOI(e.target.checked)} />
            Include F&O OI (slower)
          </label>

          <button className="btn-primary indicator-load-btn" onClick={load} disabled={loading}>
            {loading ? "Scanning..." : "Load Indicators"}
          </button>

          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search stock..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="group-toggles">
          {(Object.keys(GROUP_LABELS) as IndicatorColumnGroup[]).map((g) => {
            const { label, icon: Icon } = GROUP_LABELS[g];
            const active = groups.has(g);
            return (
              <button
                key={g}
                className={`group-chip ${active ? "active" : ""}`}
                onClick={() => toggleGroup(g)}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!data && !loading && (
        <div className="empty-state">
          Date select karke <strong>Load Indicators</strong> click karo — Nifty 50 ke saare stocks ke
          liye RSI, MACD, Bollinger, ATR, Moving Averages, Stochastic, ADX, Supertrend, VWAP calculate honge.
        </div>
      )}

      {loading && (
        <div className="indicator-loading">
          <LoadingSpinner />
          <p>Nifty 50 ke ~50 stocks scan ho rahe hain — historical candles + indicators calculate ho rahe hain, ~30-45 sec lagenge...</p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="indicator-meta">
            <span>
              <strong>{data.totalReturned}</strong>/{data.totalRequested} stocks · {data.date}
            </span>
            {!data.isToday && <span className="tag-muted">Historical (as of {data.date})</span>}
            {data.isToday && <span className="tag-live">Live extras included</span>}
            {!data.intradayRetentionOk && (
              <span className="tag-warn">
                <AlertCircle size={12} /> VWAP N/A — beyond 60-day intraday retention
              </span>
            )}
            {data.skippedNoData > 0 && (
              <span className="tag-warn">{data.skippedNoData} skipped (no data for this date)</span>
            )}
          </div>

          <DataTable columns={columns} rows={tableRows} emptyMessage="No stock data for this date" />
        </>
      )}

      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <IndicatorDetail row={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function IndicatorDetail({ row, onClose }: { row: IndicatorRow; onClose: () => void }) {
  const notes = priceStructureSummary(row);
  const rsi = rsiRead(row.rsi14);
  const macd = macdRead(row.macdHistogram);
  const stoch = stochRead(row.stochK);
  const bb = bbRead(row.bbPercentB);
  const adx = adxRead(row.adx);
  const st = supertrendRead(row.supertrendDirection);

  return (
    <>
      <div className="detail-header">
        <div>
          <h2>{row.tradingsymbol}</h2>
          <p>{row.name} · {row.date}</p>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="backtest-box">
        <h3>Plain-language summary</h3>
        {notes.map((n) => (
          <div key={n} className="backtest-row" style={{ display: "block", padding: "6px 0" }}>
            {n}
          </div>
        ))}
      </div>

      <div className="detail-grid">
        <IndDetailStat label="Close" value={`₹${formatNumber(row.close)}`} />
        <IndDetailStat label="Price Δ" value={formatPercent(row.priceDelta)} trend={row.priceDelta} />
        <IndDetailStat label="Volume Δ vs 20d avg" value={row.volumeDelta == null ? "—" : formatPercent(row.volumeDelta)} trend={row.volumeDelta ?? undefined} />
        <IndDetailStat label="RSI(14)" value={rsi.label} trendCls={rsi.cls} />
        <IndDetailStat label="MACD Histogram" value={fmtOrDash(row.macdHistogram)} trendCls={macd.cls} sub={macd.label} />
        <IndDetailStat label="Stochastic %K" value={stoch.label} trendCls={stoch.cls} />
        <IndDetailStat label="Bollinger %B" value={row.bbPercentB == null ? "—" : row.bbPercentB.toFixed(2)} trendCls={bb.cls} sub={bb.label} />
        <IndDetailStat label="ATR(14)" value={fmtOrDash(row.atr14)} />
        <IndDetailStat label="ADX(14)" value={adx.label} trendCls={adx.cls} />
        <IndDetailStat label="+DI / -DI" value={`${fmtOrDash(row.plusDI, 1)} / ${fmtOrDash(row.minusDI, 1)}`} />
        <IndDetailStat label="Supertrend" value={fmtOrDash(row.supertrendValue)} trendCls={st.cls} sub={st.label} />
        <IndDetailStat label="SMA 20/50/200" value={`${fmtOrDash(row.sma20)} / ${fmtOrDash(row.sma50)} / ${fmtOrDash(row.sma200)}`} />
        <IndDetailStat label="EMA 20/50" value={`${fmtOrDash(row.ema20)} / ${fmtOrDash(row.ema50)}`} />
        <IndDetailStat label="VWAP" value={row.vwap == null ? "N/A" : `₹${formatNumber(row.vwap)}`} />
        {row.oi && (
          <IndDetailStat
            label={`OI (${row.oi.contract})`}
            value={row.oi.oi == null ? "—" : formatNumber(row.oi.oi, 0)}
            sub={row.oi.oiChange == null ? undefined : `Δ ${formatPercent(row.oi.oiChange)}`}
            trend={row.oi.oiChange ?? undefined}
          />
        )}
        {row.liveExtras && (
          <>
            <IndDetailStat label="Bid Qty (live)" value={formatNumber(row.liveExtras.bidQty, 0)} />
            <IndDetailStat label="Ask Qty (live)" value={formatNumber(row.liveExtras.askQty, 0)} />
            <IndDetailStat
              label="Order Imbalance"
              value={formatPercent(row.liveExtras.orderImbalance)}
              trend={row.liveExtras.orderImbalance}
            />
          </>
        )}
      </div>
    </>
  );
}

function IndDetailStat({
  label,
  value,
  sub,
  trend,
  trendCls,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  trendCls?: string;
}) {
  const cls = trendCls ?? (trend !== undefined ? pnlClass(trend) : "");
  return (
    <div className="detail-stat">
      <span>{label}</span>
      <strong className={cls}>{value}</strong>
      {sub && <small className={cls}>{sub}</small>}
    </div>
  );
}
