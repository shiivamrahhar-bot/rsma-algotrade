import type { IndicatorRow } from "../types/indicators";

export function fmtOrDash(value: number | null | undefined, decimals = 2): string {
  return value == null ? "—" : value.toFixed(decimals);
}

export function rsiRead(rsi: number | null) {
  if (rsi == null) return { label: "—", cls: "neutral" };
  if (rsi >= 70) return { label: `${rsi.toFixed(1)} · Overbought`, cls: "negative" };
  if (rsi <= 30) return { label: `${rsi.toFixed(1)} · Oversold`, cls: "positive" };
  return { label: `${rsi.toFixed(1)} · Neutral`, cls: "neutral" };
}

export function macdRead(hist: number | null) {
  if (hist == null) return { label: "—", cls: "neutral" };
  if (hist > 0) return { label: "Bullish crossover", cls: "positive" };
  if (hist < 0) return { label: "Bearish crossover", cls: "negative" };
  return { label: "Flat", cls: "neutral" };
}

export function bbRead(percentB: number | null) {
  if (percentB == null) return { label: "—", cls: "neutral" };
  if (percentB >= 1) return { label: "Above upper band", cls: "negative" };
  if (percentB <= 0) return { label: "Below lower band", cls: "positive" };
  if (percentB >= 0.8) return { label: "Near upper band", cls: "negative" };
  if (percentB <= 0.2) return { label: "Near lower band", cls: "positive" };
  return { label: "Mid-range", cls: "neutral" };
}

export function stochRead(k: number | null) {
  if (k == null) return { label: "—", cls: "neutral" };
  if (k >= 80) return { label: `${k.toFixed(1)} · Overbought`, cls: "negative" };
  if (k <= 20) return { label: `${k.toFixed(1)} · Oversold`, cls: "positive" };
  return { label: `${k.toFixed(1)} · Neutral`, cls: "neutral" };
}

export function adxRead(adx: number | null) {
  if (adx == null) return { label: "—", cls: "neutral" };
  if (adx >= 25) return { label: `${adx.toFixed(1)} · Strong trend`, cls: "positive" };
  if (adx >= 20) return { label: `${adx.toFixed(1)} · Developing`, cls: "neutral" };
  return { label: `${adx.toFixed(1)} · Weak/No trend`, cls: "neutral" };
}

export function supertrendRead(direction: number | null) {
  if (direction == null) return { label: "—", cls: "neutral" };
  return direction === 1
    ? { label: "Bullish (below price)", cls: "positive" }
    : { label: "Bearish (above price)", cls: "negative" };
}

export function trendVsMA(close: number, ma: number | null) {
  if (ma == null) return { label: "—", cls: "neutral" };
  const pct = ((close - ma) / ma) * 100;
  return {
    label: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% ${pct >= 0 ? "above" : "below"}`,
    cls: pct >= 0 ? "positive" : "negative",
  };
}

export function priceStructureSummary(row: IndicatorRow): string[] {
  const notes: string[] = [];

  if (row.sma20 != null && row.sma50 != null && row.sma200 != null) {
    if (row.close > row.sma20 && row.sma20 > row.sma50 && row.sma50 > row.sma200) {
      notes.push("Price above SMA20 > SMA50 > SMA200 — strong uptrend structure");
    } else if (row.close < row.sma20 && row.sma20 < row.sma50 && row.sma50 < row.sma200) {
      notes.push("Price below SMA20 < SMA50 < SMA200 — strong downtrend structure");
    }
  }

  if (row.rsi14 != null && row.rsi14 >= 70) notes.push("RSI overbought — momentum may be stretched");
  if (row.rsi14 != null && row.rsi14 <= 30) notes.push("RSI oversold — potential bounce zone");

  if (row.macdHistogram != null && row.macd != null && row.macdSignal != null) {
    if (row.macdHistogram > 0 && row.macd > 0) notes.push("MACD bullish and above zero line");
    if (row.macdHistogram < 0 && row.macd < 0) notes.push("MACD bearish and below zero line");
  }

  if (row.supertrendDirection === 1) notes.push("Supertrend flipped bullish — trend-following buy zone");
  if (row.supertrendDirection === -1) notes.push("Supertrend flipped bearish — trend-following sell zone");

  if (row.volumeDelta != null && row.volumeDelta >= 80) {
    notes.push(`Volume ${row.volumeDelta.toFixed(0)}% above 20-day average — unusual activity`);
  }

  if (row.liveExtras && Math.abs(row.liveExtras.orderImbalance) >= 25) {
    notes.push(
      row.liveExtras.orderImbalance > 0
        ? "Order book heavily buy-skewed (live)"
        : "Order book heavily sell-skewed (live)"
    );
  }

  if (notes.length === 0) notes.push("No strong signal — indicators are mixed/neutral");
  return notes;
}
