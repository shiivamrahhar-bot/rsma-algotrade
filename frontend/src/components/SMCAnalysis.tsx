import { useState } from "react";
import { api, demoSMCAnalysis, demoSMCLeaderboard } from "../api/client";
import { DataTable, LoadingSpinner } from "./ui";
import { SMCInfoPanel } from "./InfoPanel";
import SMCDetailContent, { StatsCell } from "./SMCDetailContent";
import type {
  SMCAnalysisResult,
  SMCLeaderboardResult,
  SMCLeaderboardRow,
} from "../types/smc";
import { formatNumber, pnlClass } from "../utils/format";
import { verdictClass, zoneLabel } from "../utils/smcHelpers";
import { Layers, Search, TrendingDown, TrendingUp } from "lucide-react";

interface SMCAnalysisProps {
  demoMode?: boolean;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function SMCAnalysis({ demoMode = false }: SMCAnalysisProps) {
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SMCLeaderboardResult | null>(
    demoMode ? demoSMCLeaderboard : null
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SMCAnalysisResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 500));
        setData({ ...demoSMCLeaderboard, date });
      } else {
        const result = await api.smcLeaderboard({ date, universe: "nifty50" });
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SMC leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const openAnalysis = async (row: SMCLeaderboardRow) => {
    setDetailLoading(true);
    setError(null);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 400));
        setSelected({ ...demoSMCAnalysis, tradingsymbol: row.tradingsymbol, name: row.name });
      } else {
        const result = await api.smcAnalysis(row.tradingsymbol, { date, includeStats: true });
        setSelected(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock SMC analysis");
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
        {zoneLabel(r.zone)} {r.zonePositionPct != null && `(${r.zonePositionPct}%)`}
      </span>
    ),
    ob: (
      <span className="ob-fvg-counts">
        <span className="positive">{r.unmitigatedBullishOB} OB↑</span>
        <span className="negative">{r.unmitigatedBearishOB} OB↓</span>
      </span>
    ),
    fvg: (
      <span className="ob-fvg-counts">
        <span className="positive">{r.unfilledBullishFVG} FVG↑</span>
        <span className="negative">{r.unfilledBearishFVG} FVG↓</span>
      </span>
    ),
    score: <span className={pnlClass(r.score)}>{r.score > 0 ? "+" : ""}{r.score}</span>,
    verdict: <span className={`verdict-badge ${verdictClass(r.verdict)}`}>{r.verdict}</span>,
    action: (
      <button className="btn-detail" onClick={() => openAnalysis(r)}>
        Analyze
      </button>
    ),
  }));

  return (
    <div className="smc-view">
      <SMCInfoPanel />

      <div className="indicator-toolbar">
        <div className="indicator-controls">
          <label className="date-picker-label">
            Date
            <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          </label>

          <button className="btn-primary indicator-load-btn" onClick={load} disabled={loading}>
            {loading ? "Scanning..." : "Load SMC Leaderboard"}
          </button>

          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search stock..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="smc-legend">
          <span><Layers size={12} /> OB = Order Block · FVG = Fair Value Gap</span>
          <span>Verdict = Market Structure + OB/FVG + Liquidity + Premium/Discount + Indicators combined</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!data && !loading && (
        <div className="empty-state">
          Date select karke <strong>Load SMC Leaderboard</strong> click karo — Nifty 50 stocks ko Order
          Blocks, Fair Value Gaps, Market Structure (BOS/CHoCH), Liquidity aur Premium/Discount zones ke
          basis pe Buy/Avoid verdict milega.
        </div>
      )}

      {loading && (
        <div className="indicator-loading">
          <LoadingSpinner />
          <p>Nifty 50 ke stocks ka SMC structure analyze ho raha hai — Order Blocks, FVGs, swing points calculate ho rahe hain, ~40-60 sec lagenge...</p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="indicator-meta">
            <span><strong>{data.totalReturned}</strong>/{data.totalRequested} stocks · {data.date}</span>
            {data.cached && <span className="tag-muted">Cached</span>}
          </div>
          <DataTable
            columns={[
              { key: "stock", label: "Stock" },
              { key: "close", label: "Close", align: "right" },
              { key: "trend", label: "Structure", align: "right" },
              { key: "zone", label: "Premium/Discount", align: "right" },
              { key: "ob", label: "Order Blocks" },
              { key: "fvg", label: "Fair Value Gaps" },
              { key: "score", label: "Score", align: "right" },
              { key: "verdict", label: "Verdict" },
              { key: "action", label: "" },
            ]}
            rows={tableRows}
            emptyMessage="No SMC data for this date"
          />
        </>
      )}

      {(selected || detailLoading) && (
        <div className="detail-overlay" onClick={() => !detailLoading && setSelected(null)}>
          <div className="detail-panel smc-detail-panel" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? <LoadingSpinner /> : selected ? (
              <SMCDetailContent
                result={selected}
                subtitle={`${selected.name} · ${selected.date} · ₹${formatNumber(selected.close)}`}
                chartCaption="Chart daily (1D) candles par based hai — solid lines = fresh Order Blocks, dashed = mitigated, dotted = unfilled FVG. Green arrow = bullish BOS/CHoCH, Red arrow = bearish."
                onClose={() => setSelected(null)}
                extraSections={
                  selected.stats && (
                    <div className="smc-section">
                      <h3>Historical Success Rate (backtest)</h3>
                      <p className="backtest-hint">
                        Pichle {selected.stats.lookbackCandles} trading days mein is stock ke Order
                        Blocks/FVGs ne kitni baar follow-through diya (target hit before stop):
                      </p>
                      <div className="stats-grid">
                        <StatsCell label="Bullish Order Blocks" stat={selected.stats.orderBlocks.bullish} />
                        <StatsCell label="Bearish Order Blocks" stat={selected.stats.orderBlocks.bearish} />
                        <StatsCell label="Bullish FVGs" stat={selected.stats.fvgs.bullish} />
                        <StatsCell label="Bearish FVGs" stat={selected.stats.fvgs.bearish} />
                      </div>
                    </div>
                  )
                }
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
