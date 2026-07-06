// Smart Money Concepts (SMC) analysis — Order Blocks, Fair Value Gaps (FVG),
// Market Structure (BOS/CHoCH), Liquidity Sweeps, Premium/Discount zones,
// combined with the existing technical-indicator snapshot to produce a
// Buy/Avoid verdict, plus historical backtest statistics.
//
// All functions operate on Kite-style daily candles:
// [timestamp, open, high, low, close, volume]

import {
  NIFTY50,
  fetchInstruments,
  fetchHistorical,
} from "./momentum.js";
import { computeIndicatorSnapshot } from "./indicators.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pctChange(from, to) {
  if (!from) return 0;
  return ((to - from) / from) * 100;
}

// ── Swing points (fractals) ──────────────────────────────────────────────

export function findSwingPoints(candles, lookback = 2) {
  const highs = [];
  const lows = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const high = candles[i][2];
    const low = candles[i][3];
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j][2] >= high) isSwingHigh = false;
      if (candles[j][3] <= low) isSwingLow = false;
    }

    if (isSwingHigh) highs.push({ index: i, price: high, date: candles[i][0] });
    if (isSwingLow) lows.push({ index: i, price: low, date: candles[i][0] });
  }

  return { highs, lows };
}

// ── Market structure: Break of Structure (BOS) / Change of Character (CHoCH) ──

export function analyzeMarketStructure(candles, lookback = 2) {
  const { highs, lows } = findSwingPoints(candles, lookback);
  const highsMut = highs.map((h) => ({ ...h, broken: false }));
  const lowsMut = lows.map((l) => ({ ...l, broken: false }));

  const events = [];
  let trend = null;
  let curHighIdx = 0;
  let curLowIdx = 0;

  for (let i = lookback; i < candles.length; i++) {
    const close = candles[i][4];

    while (curHighIdx + 1 < highsMut.length && highsMut[curHighIdx + 1].index < i) {
      curHighIdx++;
    }
    const refHigh = highsMut[curHighIdx] || null;

    while (curLowIdx + 1 < lowsMut.length && lowsMut[curLowIdx + 1].index < i) {
      curLowIdx++;
    }
    const refLow = lowsMut[curLowIdx] || null;

    if (refHigh && refHigh.index < i && !refHigh.broken && close > refHigh.price) {
      const type = trend === "down" ? "CHOCH_BULL" : "BOS_BULL";
      events.push({ index: i, date: candles[i][0], type, brokenLevel: refHigh.price });
      trend = "up";
      refHigh.broken = true;
    }

    if (refLow && refLow.index < i && !refLow.broken && close < refLow.price) {
      const type = trend === "up" ? "CHOCH_BEAR" : "BOS_BEAR";
      events.push({ index: i, date: candles[i][0], type, brokenLevel: refLow.price });
      trend = "down";
      refLow.broken = true;
    }
  }

  return { trend, events, swingHighs: highs, swingLows: lows };
}

// ── Order Blocks ─────────────────────────────────────────────────────────

export function findOrderBlocks(candles, structureEvents, lookbackBars = 15) {
  const blocks = [];

  for (const ev of structureEvents) {
    if (ev.type === "BOS_BULL" || ev.type === "CHOCH_BULL") {
      for (let j = ev.index - 1; j >= Math.max(0, ev.index - lookbackBars); j--) {
        const [date, open, high, low, close] = candles[j];
        if (close < open) {
          blocks.push({
            type: "bullish",
            index: j,
            date,
            open,
            high,
            low,
            close,
            reason: ev.type === "CHOCH_BULL" ? "Caused CHoCH (reversal)" : "Caused BOS (continuation)",
            causedEventType: ev.type,
            causedBreakAt: ev.date,
          });
          break;
        }
      }
    } else if (ev.type === "BOS_BEAR" || ev.type === "CHOCH_BEAR") {
      for (let j = ev.index - 1; j >= Math.max(0, ev.index - lookbackBars); j--) {
        const [date, open, high, low, close] = candles[j];
        if (close > open) {
          blocks.push({
            type: "bearish",
            index: j,
            date,
            open,
            high,
            low,
            close,
            reason: ev.type === "CHOCH_BEAR" ? "Caused CHoCH (reversal)" : "Caused BOS (continuation)",
            causedEventType: ev.type,
            causedBreakAt: ev.date,
          });
          break;
        }
      }
    }
  }

  return blocks;
}

export function markOrderBlockMitigation(blocks, candles, asOfIndex) {
  return blocks
    .filter((b) => b.index <= asOfIndex)
    .map((b) => {
      let mitigated = false;
      let mitigatedAt = null;

      for (let k = b.index + 1; k <= asOfIndex; k++) {
        const low = candles[k][3];
        const high = candles[k][2];
        if (low <= b.high && high >= b.low) {
          mitigated = true;
          mitigatedAt = candles[k][0];
          break;
        }
      }

      return { ...b, mitigated, mitigatedAt };
    });
}

// ── Fair Value Gaps (FVG) ────────────────────────────────────────────────

export function findFVGs(candles) {
  const fvgs = [];

  for (let i = 1; i < candles.length - 1; i++) {
    const prevHigh = candles[i - 1][2];
    const prevLow = candles[i - 1][3];
    const nextHigh = candles[i + 1][2];
    const nextLow = candles[i + 1][3];

    if (prevHigh < nextLow) {
      fvgs.push({ type: "bullish", index: i, date: candles[i][0], top: nextLow, bottom: prevHigh });
    } else if (prevLow > nextHigh) {
      fvgs.push({ type: "bearish", index: i, date: candles[i][0], top: prevLow, bottom: nextHigh });
    }
  }

  return fvgs;
}

export function markFVGFill(fvgs, candles, asOfIndex) {
  return fvgs
    .filter((g) => g.index <= asOfIndex)
    .map((g) => {
      let fillPercent = 0;
      const range = g.top - g.bottom || 1;

      for (let k = g.index + 1; k <= asOfIndex; k++) {
        const low = candles[k][3];
        const high = candles[k][2];
        const overlapTop = Math.min(high, g.top);
        const overlapBottom = Math.max(low, g.bottom);
        if (overlapTop > overlapBottom) {
          const filledSoFar =
            g.type === "bullish"
              ? (g.top - overlapBottom) / range
              : (overlapTop - g.bottom) / range;
          fillPercent = Math.max(fillPercent, Math.min(1, filledSoFar));
        }
      }

      return { ...g, fillPercent: Math.round(fillPercent * 100), filled: fillPercent >= 0.98 };
    });
}

// ── Liquidity pools (equal highs/lows) + sweeps ──────────────────────────

export function findLiquidityPools(swingHighs, swingLows, candles, asOfIndex, tolerancePct = 0.15) {
  const pools = [];

  const groupEqual = (points, isHigh) => {
    const relevant = points.filter((p) => p.index <= asOfIndex);
    const used = new Set();

    for (let i = 0; i < relevant.length; i++) {
      if (used.has(i)) continue;
      const group = [relevant[i]];

      for (let j = i + 1; j < relevant.length; j++) {
        if (used.has(j)) continue;
        const diffPct = (Math.abs(relevant[j].price - relevant[i].price) / relevant[i].price) * 100;
        if (diffPct <= tolerancePct) {
          group.push(relevant[j]);
          used.add(j);
        }
      }

      if (group.length >= 2) {
        const level = isHigh
          ? Math.max(...group.map((g) => g.price))
          : Math.min(...group.map((g) => g.price));
        const lastIdx = Math.max(...group.map((g) => g.index));

        let swept = false;
        let sweptAt = null;
        for (let k = lastIdx + 1; k <= asOfIndex; k++) {
          const high = candles[k][2];
          const low = candles[k][3];
          const close = candles[k][4];
          if (isHigh && high > level && close < level) {
            swept = true;
            sweptAt = candles[k][0];
            break;
          }
          if (!isHigh && low < level && close > level) {
            swept = true;
            sweptAt = candles[k][0];
            break;
          }
        }

        pools.push({
          type: isHigh ? "equal_highs" : "equal_lows",
          level,
          touches: group.length,
          swept,
          sweptAt,
        });
      }
      used.add(i);
    }
  };

  groupEqual(swingHighs, true);
  groupEqual(swingLows, false);
  return pools;
}

// ── Premium / Discount zones ─────────────────────────────────────────────

export function premiumDiscountZone(swingHighs, swingLows, closePrice, asOfIndex) {
  const recentHighs = swingHighs.filter((h) => h.index <= asOfIndex);
  const recentLows = swingLows.filter((l) => l.index <= asOfIndex);
  if (!recentHighs.length || !recentLows.length) return null;

  const lastHigh = recentHighs[recentHighs.length - 1];
  const lastLow = recentLows[recentLows.length - 1];

  const rangeHigh = Math.max(lastHigh.price, lastLow.price);
  const rangeLow = Math.min(lastHigh.price, lastLow.price);
  const equilibrium = (rangeHigh + rangeLow) / 2;
  const positionPct =
    rangeHigh > rangeLow ? ((closePrice - rangeLow) / (rangeHigh - rangeLow)) * 100 : 50;

  let zone = "equilibrium";
  if (positionPct <= 30) zone = "deep_discount";
  else if (positionPct < 50) zone = "discount";
  else if (positionPct >= 70) zone = "deep_premium";
  else if (positionPct > 50) zone = "premium";

  return {
    rangeHigh,
    rangeLow,
    equilibrium,
    positionPct: Math.round(positionPct * 10) / 10,
    zone,
  };
}

// ── Combined Buy/Avoid verdict (SMC + existing indicator snapshot) ───────

function nearestUnmitigated(blocks, type) {
  return blocks.filter((b) => b.type === type && !b.mitigated).sort((a, b) => b.index - a.index)[0] || null;
}

function nearestUnfilledFVG(fvgs, type) {
  return fvgs.filter((g) => g.type === type && !g.filled).sort((a, b) => b.index - a.index)[0] || null;
}

export function computeVerdict({ structure, orderBlocks, fvgs, liquidity, zone, close, indicatorSnapshot }) {
  let score = 0;
  const reasons = [];

  if (structure.trend === "up") {
    score += 2;
    reasons.push({ sign: "positive", text: "Market structure is bullish (higher highs & higher lows)" });
  } else if (structure.trend === "down") {
    score -= 2;
    reasons.push({ sign: "negative", text: "Market structure is bearish (lower highs & lower lows)" });
  }

  const lastEvent = structure.events[structure.events.length - 1];
  if (lastEvent) {
    if (lastEvent.type === "BOS_BULL") {
      score += 1.5;
      reasons.push({ sign: "positive", text: `Recent Break of Structure (bullish) at ${lastEvent.date}` });
    } else if (lastEvent.type === "CHOCH_BULL") {
      score += 2.5;
      reasons.push({ sign: "positive", text: `Change of Character (bullish reversal) at ${lastEvent.date}` });
    } else if (lastEvent.type === "BOS_BEAR") {
      score -= 1.5;
      reasons.push({ sign: "negative", text: `Recent Break of Structure (bearish) at ${lastEvent.date}` });
    } else if (lastEvent.type === "CHOCH_BEAR") {
      score -= 2.5;
      reasons.push({ sign: "negative", text: `Change of Character (bearish reversal) at ${lastEvent.date}` });
    }
  }

  const bullOB = nearestUnmitigated(orderBlocks, "bullish");
  if (bullOB) {
    const proximity = pctChange(bullOB.high, close);
    if (proximity >= 0 && proximity <= 3) {
      score += 2;
      reasons.push({ sign: "positive", text: `Price near unmitigated bullish Order Block (₹${bullOB.low.toFixed(2)}–₹${bullOB.high.toFixed(2)})` });
    }
  }
  const bearOB = nearestUnmitigated(orderBlocks, "bearish");
  if (bearOB) {
    const proximity = pctChange(close, bearOB.low);
    if (proximity >= 0 && proximity <= 3) {
      score -= 2;
      reasons.push({ sign: "negative", text: `Price near unmitigated bearish Order Block (₹${bearOB.low.toFixed(2)}–₹${bearOB.high.toFixed(2)})` });
    }
  }

  const bullFVG = nearestUnfilledFVG(fvgs, "bullish");
  if (bullFVG && close >= bullFVG.bottom * 0.98) {
    score += 1;
    reasons.push({ sign: "positive", text: `Unfilled bullish Fair Value Gap below (₹${bullFVG.bottom.toFixed(2)}–₹${bullFVG.top.toFixed(2)}) acting as support` });
  }
  const bearFVG = nearestUnfilledFVG(fvgs, "bearish");
  if (bearFVG && close <= bearFVG.top * 1.02) {
    score -= 1;
    reasons.push({ sign: "negative", text: `Unfilled bearish Fair Value Gap above (₹${bearFVG.bottom.toFixed(2)}–₹${bearFVG.top.toFixed(2)}) acting as resistance` });
  }

  if (zone) {
    if (zone.zone === "deep_discount") {
      score += 2.5;
      reasons.push({ sign: "positive", text: `Price in deep discount zone (${zone.positionPct}% of range) — favourable buy area` });
    } else if (zone.zone === "discount") {
      score += 1;
      reasons.push({ sign: "positive", text: `Price in discount zone (${zone.positionPct}% of range)` });
    } else if (zone.zone === "deep_premium") {
      score -= 2.5;
      reasons.push({ sign: "negative", text: `Price in deep premium zone (${zone.positionPct}% of range) — favourable sell area, risky to buy` });
    } else if (zone.zone === "premium") {
      score -= 1;
      reasons.push({ sign: "negative", text: `Price in premium zone (${zone.positionPct}% of range)` });
    }
  }

  const recentSweptLow = liquidity.find((p) => p.type === "equal_lows" && p.swept);
  if (recentSweptLow) {
    score += 1.5;
    reasons.push({ sign: "positive", text: `Liquidity sweep below equal lows (₹${recentSweptLow.level.toFixed(2)}) — possible stop-hunt reversal` });
  }
  const recentSweptHigh = liquidity.find((p) => p.type === "equal_highs" && p.swept);
  if (recentSweptHigh) {
    score -= 1.5;
    reasons.push({ sign: "negative", text: `Liquidity sweep above equal highs (₹${recentSweptHigh.level.toFixed(2)}) — possible stop-hunt reversal down` });
  }

  if (indicatorSnapshot) {
    let indicatorScore = 0;
    if (indicatorSnapshot.rsi14 != null) {
      if (indicatorSnapshot.rsi14 >= 55 && indicatorSnapshot.rsi14 < 70) indicatorScore += 1;
      if (indicatorSnapshot.rsi14 <= 45 && indicatorSnapshot.rsi14 > 30) indicatorScore -= 1;
    }
    if (indicatorSnapshot.macdHistogram != null) {
      indicatorScore += indicatorSnapshot.macdHistogram > 0 ? 1 : -1;
    }
    if (indicatorSnapshot.supertrendDirection === 1) indicatorScore += 1;
    if (indicatorSnapshot.supertrendDirection === -1) indicatorScore -= 1;

    if (indicatorScore !== 0) {
      score += indicatorScore;
      reasons.push({
        sign: indicatorScore > 0 ? "positive" : "negative",
        text: `Technical indicators (RSI/MACD/Supertrend) lean ${indicatorScore > 0 ? "bullish" : "bearish"}`,
      });
    }
  }

  score = Math.round(score * 10) / 10;

  let verdict = "NEUTRAL";
  if (score >= 5) verdict = "STRONG BUY";
  else if (score >= 2) verdict = "BUY";
  else if (score <= -5) verdict = "STRONG AVOID";
  else if (score <= -2) verdict = "AVOID";

  if (reasons.length === 0) {
    reasons.push({ sign: "neutral", text: "No strong SMC or indicator signals — setup is mixed" });
  }

  return { score, verdict, reasons };
}

// ── Exact Entry Plan: buy zone, stop-loss, targets, risk:reward ─────────
// Answers "at what exact point should I buy" — derived from the same
// OB/FVG/structure/zone data used for the verdict above.

export function computeEntryPlan({ verdict, orderBlocks, fvgs, zone, close }) {
  const isBullishBias = verdict.verdict === "STRONG BUY" || verdict.verdict === "BUY";
  const isBearishBias = verdict.verdict === "STRONG AVOID" || verdict.verdict === "AVOID";

  if (!isBullishBias && !isBearishBias) {
    return {
      action: "WAIT",
      bias: "neutral",
      currentPrice: close,
      notes: "Signals are mixed/neutral right now — no clear high-probability entry. Wait for a clearer Order Block, FVG or structure break to form.",
    };
  }

  if (isBullishBias) {
    const bullOB = nearestUnmitigated(orderBlocks, "bullish");
    const bullFVG = nearestUnfilledFVG(fvgs, "bullish");

    let entryLow;
    let entryHigh;
    let entryType;
    if (bullOB) {
      entryLow = bullOB.low;
      entryHigh = bullOB.high;
      entryType = "Retest of unmitigated bullish Order Block";
    } else if (bullFVG) {
      entryLow = bullFVG.bottom;
      entryHigh = bullFVG.top;
      entryType = "Retest of unfilled bullish Fair Value Gap";
    } else {
      entryLow = close * 0.995;
      entryHigh = close * 1.005;
      entryType = "Market price (no clear OB/FVG zone nearby)";
    }

    const alreadyInZone = close <= entryHigh * 1.01 && close >= entryLow * 0.99;
    const stopLoss = (bullOB ? bullOB.low : entryLow) * 0.985;
    const riskAmount = entryHigh - stopLoss;
    const riskPercent = (riskAmount / entryHigh) * 100;

    const target1 = zone ? Math.max(zone.equilibrium, entryHigh * 1.015) : entryHigh * 1.02;
    const target2 = zone ? Math.max(zone.rangeHigh, target1 * 1.01) : entryHigh * 1.04;
    const rrRatio = riskAmount > 0 ? Math.round(((target1 - entryHigh) / riskAmount) * 100) / 100 : null;

    return {
      action: alreadyInZone ? "BUY NOW" : "WAIT FOR RETEST",
      bias: "bullish",
      entryType,
      entryLow: Math.round(entryLow * 100) / 100,
      entryHigh: Math.round(entryHigh * 100) / 100,
      currentPrice: close,
      stopLoss: Math.round(stopLoss * 100) / 100,
      target1: Math.round(target1 * 100) / 100,
      target2: Math.round(target2 * 100) / 100,
      riskPercent: Math.round(riskPercent * 100) / 100,
      riskReward: rrRatio,
      notes: alreadyInZone
        ? "Price is already inside the entry zone — can buy at current market price."
        : `Wait for price to pull back into ₹${entryLow.toFixed(2)}–₹${entryHigh.toFixed(2)} before buying — don't chase.`,
    };
  }

  const bearOB = nearestUnmitigated(orderBlocks, "bearish");
  const watchLevel = bearOB ? bearOB.low : zone ? zone.rangeLow : close * 0.95;

  return {
    action: "AVOID BUYING",
    bias: "bearish",
    currentPrice: close,
    watchLevel: Math.round(watchLevel * 100) / 100,
    notes: `Structure/zone signals are bearish right now — buying here is low-probability. Re-evaluate only if price drops toward ₹${watchLevel.toFixed(2)} with a bullish CHoCH confirmation.`,
  };
}

// ── Historical backtest stats (Order Block / FVG follow-through) ────────

function backtestZones(zones, candles, { lookaheadBars = 10, targetPct = 2, stopPct = 1.5 } = {}) {
  let wins = 0;
  let losses = 0;
  let pending = 0;

  for (const z of zones) {
    const isBull = z.type === "bullish";
    const entry = isBull ? (z.high ?? z.top) : (z.low ?? z.bottom);
    const stopBase = isBull ? (z.low ?? z.bottom) : (z.high ?? z.top);
    const target = isBull ? entry * (1 + targetPct / 100) : entry * (1 - targetPct / 100);
    const stop = isBull ? stopBase * (1 - stopPct / 100) : stopBase * (1 + stopPct / 100);

    let outcome = null;
    const endIdx = Math.min(z.index + lookaheadBars, candles.length - 1);
    for (let k = z.index + 1; k <= endIdx; k++) {
      const high = candles[k][2];
      const low = candles[k][3];
      if (isBull) {
        if (low <= stop) { outcome = "loss"; break; }
        if (high >= target) { outcome = "win"; break; }
      } else {
        if (high >= stop) { outcome = "loss"; break; }
        if (low <= target) { outcome = "win"; break; }
      }
    }

    if (outcome === "win") wins++;
    else if (outcome === "loss") losses++;
    else pending++;
  }

  const decided = wins + losses;
  return {
    total: zones.length,
    wins,
    losses,
    pending,
    winRate: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null,
  };
}

export function getSMCStats(candles, structureEvents) {
  const orderBlocks = findOrderBlocks(candles, structureEvents);
  const fvgs = findFVGs(candles);

  const bullOB = orderBlocks.filter((b) => b.type === "bullish");
  const bearOB = orderBlocks.filter((b) => b.type === "bearish");
  const bullFVG = fvgs.filter((g) => g.type === "bullish");
  const bearFVG = fvgs.filter((g) => g.type === "bearish");

  return {
    lookbackCandles: candles.length,
    orderBlocks: {
      bullish: backtestZones(bullOB, candles),
      bearish: backtestZones(bearOB, candles),
    },
    fvgs: {
      bullish: backtestZones(bullFVG, candles),
      bearish: backtestZones(bearFVG, candles),
    },
  };
}

// ── Backtest Studio: full trade-by-trade simulation & report ────────────
// Applies the exact same Order Block / FVG entry logic used live (entry at
// zone edge, stop beyond the zone, target at a fixed R:R) to every historical
// signal, producing a per-trade log + equity curve + summary stats.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function simulateTrades(zones, candles, signalType, { lookaheadBars = 15, targetPct = 2.5, stopPct = 1.5 } = {}) {
  const trades = [];

  for (const z of zones) {
    const isBull = z.type === "bullish";
    const entryPrice = isBull ? (z.high ?? z.top) : (z.low ?? z.bottom);
    const stopBase = isBull ? (z.low ?? z.bottom) : (z.high ?? z.top);
    const target = isBull ? entryPrice * (1 + targetPct / 100) : entryPrice * (1 - targetPct / 100);
    const stop = isBull ? stopBase * (1 - stopPct / 100) : stopBase * (1 + stopPct / 100);

    let exitPrice = null;
    let exitDate = null;
    let exitReason = null;
    let exitIndex = null;
    const endIdx = Math.min(z.index + lookaheadBars, candles.length - 1);

    for (let k = z.index + 1; k <= endIdx; k++) {
      const high = candles[k][2];
      const low = candles[k][3];
      if (isBull) {
        if (low <= stop) { exitPrice = stop; exitDate = candles[k][0]; exitReason = "STOP_LOSS"; exitIndex = k; break; }
        if (high >= target) { exitPrice = target; exitDate = candles[k][0]; exitReason = "TARGET_HIT"; exitIndex = k; break; }
      } else {
        if (high >= stop) { exitPrice = stop; exitDate = candles[k][0]; exitReason = "STOP_LOSS"; exitIndex = k; break; }
        if (low <= target) { exitPrice = target; exitDate = candles[k][0]; exitReason = "TARGET_HIT"; exitIndex = k; break; }
      }
    }

    if (exitPrice == null) {
      exitIndex = endIdx;
      exitPrice = candles[endIdx][4];
      exitDate = candles[endIdx][0];
      exitReason = endIdx >= candles.length - 1 ? "END_OF_DATA" : "TIME_EXIT";
    }

    const pnlPct = isBull
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;

    trades.push({
      signalType,
      direction: isBull ? "bullish" : "bearish",
      entryDate: z.date,
      entryPrice: round2(entryPrice),
      stopLoss: round2(stop),
      target: round2(target),
      exitDate,
      exitPrice: round2(exitPrice),
      exitReason,
      pnlPct: round2(pnlPct),
      barsHeld: exitIndex - z.index,
    });
  }

  return trades;
}

function summarizeTrades(trades) {
  const closed = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  const wins = closed.filter((t) => t.pnlPct > 0);
  const losses = closed.filter((t) => t.pnlPct <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnlPct, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPct, 0));
  const totalPnlPct = closed.reduce((s, t) => s + t.pnlPct, 0);

  // Build equity curve in exit-date order so chart timestamps are ascending.
  const closedByExit = [...closed].sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equityCurve = [];
  for (const t of closedByExit) {
    cumulative += t.pnlPct;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
    equityCurve.push({ date: t.exitDate, cumulativePnlPct: round2(cumulative) });
  }

  const best = closed.reduce((a, b) => (a && a.pnlPct > b.pnlPct ? a : b), closed[0] || null);
  const worst = closed.reduce((a, b) => (a && a.pnlPct < b.pnlPct ? a : b), closed[0] || null);

  return {
    totalTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? round2((wins.length / closed.length) * 100) : null,
    avgWinPct: wins.length ? round2(grossProfit / wins.length) : null,
    avgLossPct: losses.length ? round2(-grossLoss / losses.length) : null,
    profitFactor: grossLoss > 0 ? round2(grossProfit / grossLoss) : null,
    totalPnlPct: round2(totalPnlPct),
    maxDrawdownPct: round2(maxDrawdown),
    bestTrade: best || null,
    worstTrade: worst || null,
    equityCurve,
  };
}

const BACKTEST_MAX_DAYS = {
  day: null, // no practical cap — Kite retains years of daily data
  "60minute": 380,
  "15minute": 190,
  "5minute": 90,
};

const BACKTEST_LOOKAHEAD_BARS = {
  day: 12,
  "60minute": 20,
  "15minute": 30,
  "5minute": 40,
};

export async function runBacktest(kiteRequest, req, symbol, options = {}) {
  const interval = ["day", "60minute", "15minute", "5minute"].includes(options.interval)
    ? options.interval
    : "day";
  const monthsRequested = Math.min(Math.max(Number(options.months) || 6, 1), 12);

  const instruments = await fetchInstruments(req, kiteRequest, "NSE");
  const inst = instruments.find((i) => i.tradingsymbol.toUpperCase() === symbol.toUpperCase());
  if (!inst) throw Object.assign(new Error("Stock not found on NSE"), { status: 404 });

  let requestDays = monthsRequested * 31;
  const cap = BACKTEST_MAX_DAYS[interval];
  const truncated = cap != null && requestDays > cap;
  if (truncated) requestDays = cap;

  const candles = await fetchHistorical(kiteRequest, req, inst.instrument_token, requestDays, interval);
  if (candles.length < 40) {
    throw Object.assign(
      new Error("Not enough historical data for this symbol/timeframe/period combination"),
      { status: 404 }
    );
  }

  const structureFull = analyzeMarketStructure(candles);
  const orderBlocksRaw = findOrderBlocks(candles, structureFull.events);
  const fvgsRaw = findFVGs(candles);

  const lookaheadBars = BACKTEST_LOOKAHEAD_BARS[interval];
  const obTrades = simulateTrades(orderBlocksRaw, candles, "Order Block", { lookaheadBars });
  const fvgTrades = simulateTrades(fvgsRaw, candles, "Fair Value Gap", { lookaheadBars });
  const allTrades = [...obTrades, ...fvgTrades].sort(
    (a, b) => new Date(a.entryDate) - new Date(b.entryDate)
  );

  return {
    tradingsymbol: inst.tradingsymbol,
    name: inst.name,
    interval,
    monthsRequested,
    truncatedToRetentionLimit: truncated,
    candleCount: candles.length,
    periodFrom: candles[0][0],
    periodTo: candles[candles.length - 1][0],
    trades: allTrades,
    summary: summarizeTrades(allTrades),
    orderBlockSummary: summarizeTrades(obTrades),
    fvgSummary: summarizeTrades(fvgTrades),
  };
}

// ── Per-stock full analysis ("as of" a date) ─────────────────────────────

function findIndexForDate(candles, asOfDate) {
  const target = new Date(asOfDate).setHours(23, 59, 59, 999);
  let idx = -1;
  for (let i = 0; i < candles.length; i++) {
    if (new Date(candles[i][0]).getTime() <= target) idx = i;
    else break;
  }
  return idx;
}

export function analyzeStock(dailyCandles, asOfDate, includeCandles = true) {
  const idx = findIndexForDate(dailyCandles, asOfDate);
  if (idx < 0) return null;

  const closePrice = dailyCandles[idx][4];
  const structureFull = analyzeMarketStructure(dailyCandles);
  const structure = {
    trend: structureFull.trend,
    events: structureFull.events.filter((e) => e.index <= idx),
    swingHighs: structureFull.swingHighs.filter((h) => h.index <= idx),
    swingLows: structureFull.swingLows.filter((l) => l.index <= idx),
  };
  // Recompute trend "as of" idx using only events up to idx
  structure.trend = structure.events.length
    ? (structure.events[structure.events.length - 1].type.includes("BULL") ? "up" : "down")
    : null;

  const allOrderBlocks = findOrderBlocks(dailyCandles, structureFull.events);
  const orderBlocks = markOrderBlockMitigation(allOrderBlocks, dailyCandles, idx);

  const allFvgs = findFVGs(dailyCandles);
  const fvgs = markFVGFill(allFvgs, dailyCandles, idx);

  const liquidity = findLiquidityPools(structureFull.swingHighs, structureFull.swingLows, dailyCandles, idx);
  const zone = premiumDiscountZone(structureFull.swingHighs, structureFull.swingLows, closePrice, idx);

  const indicatorSnapshot = computeIndicatorSnapshot(dailyCandles, asOfDate);

  const verdict = computeVerdict({
    structure,
    orderBlocks,
    fvgs,
    liquidity,
    zone,
    close: closePrice,
    indicatorSnapshot,
  });

  const entryPlan = computeEntryPlan({ verdict, orderBlocks, fvgs, zone, close: closePrice });

  const chartCandles = includeCandles
    ? dailyCandles.slice(Math.max(0, idx - 119), idx + 1).map((c) => ({
        date: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
      }))
    : [];

  return {
    date: dailyCandles[idx][0],
    close: closePrice,
    structure,
    orderBlocks: orderBlocks.slice(-8),
    fvgs: fvgs.slice(-8),
    liquidity,
    zone,
    verdict,
    entryPlan,
    indicatorSnapshot,
    candles: chartCandles,
  };
}

// ── Live "as of latest candle" analysis — timeframe-agnostic ────────────
// Used for the multi-timeframe (5min/15min/60min) live entry scanner. Unlike
// analyzeStock() above (which snapshots "as of" a picked calendar date on
// daily candles), this always looks at the most recent candle — i.e. "right
// now" on whatever intraday timeframe was fetched.

export function analyzeStockLive(candles, includeCandles = true) {
  if (!candles.length) return null;
  const idx = candles.length - 1;
  const closePrice = candles[idx][4];

  const structureFull = analyzeMarketStructure(candles);
  const structure = {
    trend: structureFull.trend,
    events: structureFull.events,
    swingHighs: structureFull.swingHighs,
    swingLows: structureFull.swingLows,
  };

  const allOrderBlocks = findOrderBlocks(candles, structureFull.events);
  const orderBlocks = markOrderBlockMitigation(allOrderBlocks, candles, idx);

  const allFvgs = findFVGs(candles);
  const fvgs = markFVGFill(allFvgs, candles, idx);

  const liquidity = findLiquidityPools(structureFull.swingHighs, structureFull.swingLows, candles, idx);
  const zone = premiumDiscountZone(structureFull.swingHighs, structureFull.swingLows, closePrice, idx);

  const verdict = computeVerdict({
    structure,
    orderBlocks,
    fvgs,
    liquidity,
    zone,
    close: closePrice,
    indicatorSnapshot: null,
  });

  const entryPlan = computeEntryPlan({ verdict, orderBlocks, fvgs, zone, close: closePrice });

  // How close is price to actually triggering the entry right now? Smaller = sooner.
  let proximityPct = null;
  if (entryPlan.bias === "bullish" && entryPlan.entryHigh != null) {
    proximityPct =
      entryPlan.action === "BUY NOW" ? 0 : Math.round(Math.abs(pctChange(entryPlan.entryHigh, closePrice)) * 100) / 100;
  }

  const chartCandles = includeCandles
    ? candles.slice(-150).map((c) => ({
        date: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
      }))
    : [];

  return {
    date: candles[idx][0],
    close: closePrice,
    structure,
    orderBlocks: orderBlocks.slice(-8),
    fvgs: fvgs.slice(-8),
    liquidity,
    zone,
    verdict,
    entryPlan,
    proximityPct,
    candles: chartCandles,
  };
}

// ── Orchestration: single stock full analysis (with optional stats) ─────

export async function getStockSMC(kiteRequest, req, symbol, options = {}) {
  const date = options.date || new Date().toISOString().split("T")[0];
  const includeStats = options.includeStats === "true" || options.includeStats === true;

  const instruments = await fetchInstruments(req, kiteRequest, "NSE");
  const inst = instruments.find((i) => i.tradingsymbol.toUpperCase() === symbol.toUpperCase());
  if (!inst) throw Object.assign(new Error("Stock not found"), { status: 404 });

  const requestedDate = new Date(`${date}T00:00:00`);
  const dailyCandles = await fetchHistorical(kiteRequest, req, inst.instrument_token, 400, "day", requestedDate);
  if (!dailyCandles.length) {
    throw Object.assign(new Error("No historical data for this date"), { status: 404 });
  }

  const analysis = analyzeStock(dailyCandles, date);
  if (!analysis) {
    throw Object.assign(new Error("Not enough data to analyze this date"), { status: 404 });
  }

  let stats = null;
  if (includeStats) {
    const structureFull = analyzeMarketStructure(dailyCandles);
    stats = getSMCStats(dailyCandles, structureFull.events);
  }

  return {
    tradingsymbol: inst.tradingsymbol,
    name: inst.name,
    ...analysis,
    stats,
  };
}

// ── Orchestration: Nifty 50 leaderboard ranked by SMC+indicator verdict ─

const leaderboardCache = new Map();
const LEADERBOARD_TTL = 3 * 60 * 1000;

export async function getSMCLeaderboard(kiteRequest, req, options = {}) {
  const date = options.date || new Date().toISOString().split("T")[0];
  const universe = options.universe || "nifty50";
  const cacheKey = `${universe}-${date}`;

  const cached = leaderboardCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < LEADERBOARD_TTL) {
    return { ...cached.data, cached: true };
  }

  const instruments = await fetchInstruments(req, kiteRequest, "NSE");
  const symbolToInstrument = Object.fromEntries(instruments.map((i) => [i.tradingsymbol, i]));
  const symbols = (universe === "nifty50" ? NIFTY50 : instruments.map((i) => i.tradingsymbol)).filter(
    (s) => symbolToInstrument[s]
  );

  const requestedDate = new Date(`${date}T00:00:00`);
  const rows = [];
  let skipped = 0;

  for (const sym of symbols) {
    const inst = symbolToInstrument[sym];
    const candles = await fetchHistorical(kiteRequest, req, inst.instrument_token, 400, "day", requestedDate);
    const analysis = candles.length ? analyzeStock(candles, date, false) : null;

    if (!analysis) {
      skipped++;
      await sleep(150);
      continue;
    }

    rows.push({
      tradingsymbol: sym,
      name: inst.name,
      close: analysis.close,
      trend: analysis.structure.trend,
      zone: analysis.zone?.zone || null,
      zonePositionPct: analysis.zone?.positionPct ?? null,
      unmitigatedBullishOB: analysis.orderBlocks.filter((b) => b.type === "bullish" && !b.mitigated).length,
      unmitigatedBearishOB: analysis.orderBlocks.filter((b) => b.type === "bearish" && !b.mitigated).length,
      unfilledBullishFVG: analysis.fvgs.filter((g) => g.type === "bullish" && !g.filled).length,
      unfilledBearishFVG: analysis.fvgs.filter((g) => g.type === "bearish" && !g.filled).length,
      score: analysis.verdict.score,
      verdict: analysis.verdict.verdict,
      topReason: analysis.verdict.reasons[0]?.text || null,
    });

    await sleep(200);
  }

  rows.sort((a, b) => b.score - a.score);

  const payload = {
    date,
    universe,
    totalRequested: symbols.length,
    totalReturned: rows.length,
    skipped,
    generatedAt: new Date().toISOString(),
    rows,
    cached: false,
  };

  leaderboardCache.set(cacheKey, { data: payload, fetchedAt: Date.now() });
  return payload;
}

// ── Multi-timeframe live entry scanner (5min / 15min / 60min) ───────────
// "Kiski entry jaldi hone wali hai" — scans the chosen intraday timeframe
// right now (not a picked date) and ranks stocks by how imminent their SMC
// entry is: BUY NOW first, then WAIT FOR RETEST sorted by proximity to the
// entry zone (closest = soonest), then everything else by score.

const TIMEFRAME_LOOKBACK_DAYS = {
  "5minute": 5,
  "15minute": 10,
  "60minute": 25,
};

const MTF_CACHE_TTL = 90 * 1000;
const mtfCache = new Map();

function actionRank(action) {
  if (action === "BUY NOW") return 0;
  if (action === "WAIT FOR RETEST") return 1;
  if (action === "WAIT") return 2;
  return 3; // AVOID BUYING
}

export async function getMultiTimeframeLeaderboard(kiteRequest, req, options = {}) {
  const interval = TIMEFRAME_LOOKBACK_DAYS[options.interval] ? options.interval : "15minute";
  const universe = options.universe || "nifty50";
  const lookbackDays = TIMEFRAME_LOOKBACK_DAYS[interval];
  const cacheKey = `${interval}-${universe}`;

  const cached = mtfCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < MTF_CACHE_TTL) {
    return { ...cached.data, cached: true };
  }

  const instruments = await fetchInstruments(req, kiteRequest, "NSE");
  const symbolToInstrument = Object.fromEntries(instruments.map((i) => [i.tradingsymbol, i]));
  const symbols = (universe === "nifty50" ? NIFTY50 : instruments.map((i) => i.tradingsymbol)).filter(
    (s) => symbolToInstrument[s]
  );

  const rows = [];
  let skipped = 0;

  for (const sym of symbols) {
    const inst = symbolToInstrument[sym];
    const candles = await fetchHistorical(kiteRequest, req, inst.instrument_token, lookbackDays, interval);
    const analysis = candles.length >= 30 ? analyzeStockLive(candles, false) : null;

    if (!analysis) {
      skipped++;
      await sleep(150);
      continue;
    }

    rows.push({
      tradingsymbol: sym,
      name: inst.name,
      close: analysis.close,
      lastCandleTime: analysis.date,
      trend: analysis.structure.trend,
      zone: analysis.zone?.zone || null,
      action: analysis.entryPlan.action,
      bias: analysis.entryPlan.bias,
      entryLow: analysis.entryPlan.entryLow ?? null,
      entryHigh: analysis.entryPlan.entryHigh ?? null,
      proximityPct: analysis.proximityPct,
      score: analysis.verdict.score,
      verdict: analysis.verdict.verdict,
      topReason: analysis.verdict.reasons[0]?.text || null,
    });

    await sleep(200);
  }

  rows.sort((a, b) => {
    const ra = actionRank(a.action);
    const rb = actionRank(b.action);
    if (ra !== rb) return ra - rb;
    if (ra === 1) return (a.proximityPct ?? 999) - (b.proximityPct ?? 999);
    return b.score - a.score;
  });

  const payload = {
    interval,
    universe,
    lookbackDays,
    totalRequested: symbols.length,
    totalReturned: rows.length,
    skipped,
    generatedAt: new Date().toISOString(),
    rows,
    cached: false,
  };

  mtfCache.set(cacheKey, { data: payload, fetchedAt: Date.now() });
  return payload;
}

export async function getStockMultiTimeframe(kiteRequest, req, symbol, options = {}) {
  const interval = TIMEFRAME_LOOKBACK_DAYS[options.interval] ? options.interval : "15minute";
  const lookbackDays = TIMEFRAME_LOOKBACK_DAYS[interval];

  const instruments = await fetchInstruments(req, kiteRequest, "NSE");
  const inst = instruments.find((i) => i.tradingsymbol.toUpperCase() === symbol.toUpperCase());
  if (!inst) throw Object.assign(new Error("Stock not found"), { status: 404 });

  const candles = await fetchHistorical(kiteRequest, req, inst.instrument_token, lookbackDays, interval);
  if (candles.length < 30) {
    throw Object.assign(new Error("Not enough intraday data for this timeframe"), { status: 404 });
  }

  const analysis = analyzeStockLive(candles, true);

  return {
    tradingsymbol: inst.tradingsymbol,
    name: inst.name,
    interval,
    ...analysis,
  };
}
