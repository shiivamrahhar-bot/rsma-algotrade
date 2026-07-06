import { ReactNode } from "react";
import PriceChart from "./PriceChart";
import type {
  EntryPlan,
  FairValueGap,
  LiquidityPool,
  MarketStructure,
  OrderBlock,
  PremiumDiscountZone,
  SMCCandle,
  Verdict,
} from "../types/smc";
import { formatNumber } from "../utils/format";
import { actionClass, verdictClass, zoneLabel } from "../utils/smcHelpers";
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Crosshair,
  Layers,
  MapPin,
  ShieldAlert,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

export interface SMCDetailShape {
  tradingsymbol: string;
  name: string;
  close: number;
  structure: MarketStructure;
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  liquidity: LiquidityPool[];
  zone: PremiumDiscountZone | null;
  verdict: Verdict;
  entryPlan: EntryPlan;
  candles: SMCCandle[];
}

interface SMCDetailContentProps {
  result: SMCDetailShape;
  subtitle: string;
  chartCaption: string;
  onClose: () => void;
  extraSections?: ReactNode;
}

export default function SMCDetailContent({
  result,
  subtitle,
  chartCaption,
  onClose,
  extraSections,
}: SMCDetailContentProps) {
  const v = result.verdict;
  const zone = result.zone;

  return (
    <>
      <div className="detail-header">
        <div>
          <h2>{result.tradingsymbol}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={18} /></button>
      </div>

      <div className={`verdict-hero ${verdictClass(v.verdict)}`}>
        {v.verdict.includes("BUY") ? <ArrowUpRight size={22} /> : v.verdict.includes("AVOID") ? <ArrowDownRight size={22} /> : <Crosshair size={22} />}
        <div>
          <strong>{v.verdict}</strong>
          <span>Combined score: {v.score > 0 ? "+" : ""}{v.score}</span>
        </div>
      </div>

      <div className="smc-reasons">
        <h3>Kyun {v.verdict}?</h3>
        {v.reasons.map((r, i) => (
          <div key={i} className={`smc-reason-item ${r.sign}`}>
            {r.sign === "positive" ? <ArrowUpRight size={13} /> : r.sign === "negative" ? <ArrowDownRight size={13} /> : <Ban size={13} />}
            {r.text}
          </div>
        ))}
      </div>

      <EntryPlanBox entryPlan={result.entryPlan} />

      {result.candles.length > 0 && (
        <div className="smc-section">
          <h3><Crosshair size={16} /> Chart — Order Blocks, FVG, Entry/SL/Target</h3>
          <PriceChart
            candles={result.candles}
            orderBlocks={result.orderBlocks}
            fvgs={result.fvgs}
            events={result.structure.events}
            entryLow={result.entryPlan.entryLow}
            entryHigh={result.entryPlan.entryHigh}
            stopLoss={result.entryPlan.stopLoss}
            target1={result.entryPlan.target1}
          />
          <p className="backtest-hint">{chartCaption}</p>
        </div>
      )}

      {zone && (
        <div className="premium-discount-box">
          <h3>Premium / Discount Zone</h3>
          <div className="pd-bar">
            <div className="pd-bar-track">
              <div className="pd-bar-fill" style={{ height: `${zone.positionPct}%` }} />
              <div className="pd-bar-eq-line" />
            </div>
            <div className="pd-bar-labels">
              <span>Premium ₹{formatNumber(zone.rangeHigh)}</span>
              <span>Equilibrium ₹{formatNumber(zone.equilibrium)}</span>
              <span>Discount ₹{formatNumber(zone.rangeLow)}</span>
            </div>
          </div>
          <p className="backtest-hint">
            Price is at <strong>{zone.positionPct}%</strong> of its recent range — currently in{" "}
            <strong>{zoneLabel(zone.zone)}</strong> zone.
          </p>
        </div>
      )}

      <div className="smc-section">
        <h3><TrendingUp size={16} /> Market Structure — {result.structure.trend === "up" ? "Bullish" : result.structure.trend === "down" ? "Bearish" : "Unclear"}</h3>
        <div className="smc-events">
          {result.structure.events.slice(-5).reverse().map((e, i) => (
            <div key={i} className={`smc-event-item ${e.type.includes("BULL") ? "positive" : "negative"}`}>
              <span className="event-type">{e.type.replace("_", " ")}</span>
              <span>{e.date}</span>
              <span>Level ₹{formatNumber(e.brokenLevel)}</span>
            </div>
          ))}
          {result.structure.events.length === 0 && <div className="text-muted">No structure breaks detected</div>}
        </div>
      </div>

      <div className="smc-section">
        <h3><Target size={16} /> Order Blocks</h3>
        <div className="smc-zone-list">
          {result.orderBlocks.slice().reverse().map((b, i) => (
            <div key={i} className={`smc-zone-item ${b.type}`}>
              <span className={`zone-badge ${b.type}`}>{b.type === "bullish" ? "Bullish OB" : "Bearish OB"}</span>
              <span>₹{formatNumber(b.low)} – ₹{formatNumber(b.high)}</span>
              <span className="text-muted">{b.date}</span>
              <span className={b.mitigated ? "text-muted" : "positive"}>{b.mitigated ? "Mitigated" : "Fresh"}</span>
            </div>
          ))}
          {result.orderBlocks.length === 0 && <div className="text-muted">No Order Blocks in lookback window</div>}
        </div>
      </div>

      <div className="smc-section">
        <h3><Zap size={16} /> Fair Value Gaps</h3>
        <div className="smc-zone-list">
          {result.fvgs.slice().reverse().map((g, i) => (
            <div key={i} className={`smc-zone-item ${g.type}`}>
              <span className={`zone-badge ${g.type}`}>{g.type === "bullish" ? "Bullish FVG" : "Bearish FVG"}</span>
              <span>₹{formatNumber(g.bottom)} – ₹{formatNumber(g.top)}</span>
              <span className="text-muted">{g.date}</span>
              <span className={g.filled ? "text-muted" : "positive"}>{g.filled ? "Filled" : `${g.fillPercent}% filled`}</span>
            </div>
          ))}
          {result.fvgs.length === 0 && <div className="text-muted">No Fair Value Gaps in lookback window</div>}
        </div>
      </div>

      <div className="smc-section">
        <h3><Layers size={16} /> Liquidity Pools</h3>
        <div className="smc-zone-list">
          {result.liquidity.map((p, i) => (
            <div key={i} className="smc-zone-item">
              <span className="zone-badge liquidity">{p.type === "equal_highs" ? "Equal Highs" : "Equal Lows"}</span>
              <span>₹{formatNumber(p.level)}</span>
              <span className="text-muted">{p.touches} touches</span>
              <span className={p.swept ? "positive" : "text-muted"}>{p.swept ? `Swept (${p.sweptAt})` : "Not swept yet"}</span>
            </div>
          ))}
          {result.liquidity.length === 0 && <div className="text-muted">No equal highs/lows detected</div>}
        </div>
      </div>

      {extraSections}
    </>
  );
}

export function EntryPlanBox({ entryPlan: p }: { entryPlan: EntryPlan }) {
  const cls = actionClass(p.action);

  return (
    <div className="entry-plan-box">
      <h3><MapPin size={16} /> Exact Entry Plan — kab aur kis price pe buy karein</h3>

      <div className={`entry-action-badge ${cls}`}>{p.action}</div>

      {p.bias === "bullish" && (
        <>
          <div className="entry-grid">
            <div className="detail-stat">
              <span>Entry Zone</span>
              <strong className="positive">₹{formatNumber(p.entryLow ?? 0)} – ₹{formatNumber(p.entryHigh ?? 0)}</strong>
              <small className="text-muted">{p.entryType}</small>
            </div>
            <div className="detail-stat">
              <span><ShieldAlert size={11} /> Stop Loss</span>
              <strong className="negative">₹{formatNumber(p.stopLoss ?? 0)}</strong>
              <small className="text-muted">Risk: {p.riskPercent}%</small>
            </div>
            <div className="detail-stat">
              <span>Target 1</span>
              <strong className="positive">₹{formatNumber(p.target1 ?? 0)}</strong>
            </div>
            <div className="detail-stat">
              <span>Target 2</span>
              <strong className="positive">₹{formatNumber(p.target2 ?? 0)}</strong>
            </div>
            <div className="detail-stat">
              <span>Risk : Reward</span>
              <strong className={p.riskReward != null && p.riskReward >= 1.5 ? "positive" : "neutral"}>
                {p.riskReward != null ? `1 : ${p.riskReward}` : "—"}
              </strong>
            </div>
            <div className="detail-stat">
              <span>Current Price</span>
              <strong>₹{formatNumber(p.currentPrice)}</strong>
            </div>
          </div>
          <p className="backtest-hint">{p.notes}</p>
        </>
      )}

      {p.bias === "bearish" && (
        <>
          <div className="entry-grid">
            <div className="detail-stat">
              <span>Current Price</span>
              <strong>₹{formatNumber(p.currentPrice)}</strong>
            </div>
            <div className="detail-stat">
              <span>Watch Level (re-entry trigger)</span>
              <strong className="neutral">₹{formatNumber(p.watchLevel ?? 0)}</strong>
            </div>
          </div>
          <p className="backtest-hint">{p.notes}</p>
        </>
      )}

      {p.bias === "neutral" && <p className="backtest-hint">{p.notes}</p>}
    </div>
  );
}

export function StatsCell({
  label,
  stat,
}: {
  label: string;
  stat: { total: number; wins: number; losses: number; pending: number; winRate: number | null };
}) {
  return (
    <div className="detail-stat">
      <span>{label}</span>
      <strong className={stat.winRate == null ? "" : stat.winRate >= 55 ? "positive" : "negative"}>
        {stat.winRate == null ? "—" : `${stat.winRate.toFixed(1)}% win rate`}
      </strong>
      <small className="text-muted">{stat.wins}W / {stat.losses}L / {stat.pending} pending · {stat.total} total</small>
    </div>
  );
}
