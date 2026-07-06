// Pure technical-indicator calculators + the /api/indicators/table orchestration.
// All calculator functions operate on Kite-style daily candles:
// [timestamp, open, high, low, close, volume] or on plain arrays of closes,
// depending on the function. Every calculator returns a series aligned to the
// input array (early values are `null` until enough data exists), so callers
// can always pick "value as of a given index/date".

import {
  NIFTY50,
  fetchInstruments,
  fetchHistorical,
  batchQuote,
  formatKiteDate,
} from "./momentum.js";

function closesOf(candles) {
  return candles.map((c) => c[4]);
}

export function calcSMA(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function calcEMA(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let emaPrev = null;

  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      emaPrev = seed;
      out[i] = seed;
    } else if (i >= period) {
      emaPrev = values[i] * k + emaPrev * (1 - k);
      out[i] = emaPrev;
    }
  }
  return out;
}

export function calcRSI(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function calcMACD(closes, fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macdLine = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
  );

  const macdValues = macdLine.filter((v) => v != null);
  const signalOnValues = calcEMA(macdValues, signalPeriod);

  const signalLine = new Array(closes.length).fill(null);
  const histogram = new Array(closes.length).fill(null);
  let vi = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] != null) {
      const sig = signalOnValues[vi];
      if (sig != null) {
        signalLine[i] = sig;
        histogram[i] = macdLine[i] - sig;
      }
      vi++;
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

export function calcBollingerBands(closes, period = 20, stdDevMult = 2) {
  const middle = calcSMA(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  const percentB = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i] = mean + stdDevMult * sd;
    lower[i] = mean - stdDevMult * sd;
    const range = upper[i] - lower[i];
    percentB[i] = range > 0 ? (closes[i] - lower[i]) / range : 0.5;
  }

  return { upper, middle, lower, percentB };
}

export function calcATR(candles, period = 14) {
  const out = new Array(candles.length).fill(null);
  const trueRanges = [];

  for (let i = 0; i < candles.length; i++) {
    const [, , high, low, close] = candles[i];
    if (i === 0) {
      trueRanges.push(high - low);
      continue;
    }
    const prevClose = candles[i - 1][4];
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  let atrPrev = null;
  for (let i = 0; i < trueRanges.length; i++) {
    if (i === period - 1) {
      atrPrev = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
      out[i] = atrPrev;
    } else if (i >= period) {
      atrPrev = (atrPrev * (period - 1) + trueRanges[i]) / period;
      out[i] = atrPrev;
    }
  }
  return out;
}

export function calcStochastic(candles, period = 14, smoothK = 3, smoothD = 3) {
  const rawK = new Array(candles.length).fill(null);

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const highs = slice.map((c) => c[2]);
    const lows = slice.map((c) => c[3]);
    const highest = Math.max(...highs);
    const lowest = Math.min(...lows);
    const close = candles[i][4];
    rawK[i] = highest > lowest ? ((close - lowest) / (highest - lowest)) * 100 : 50;
  }

  const validK = rawK.filter((v) => v != null);
  const smoothedKValues = calcSMA(validK, smoothK);
  const kLine = new Array(candles.length).fill(null);
  let vi = 0;
  for (let i = 0; i < candles.length; i++) {
    if (rawK[i] != null) {
      kLine[i] = smoothedKValues[vi];
      vi++;
    }
  }

  const validSmoothedK = kLine.filter((v) => v != null);
  const dValues = calcSMA(validSmoothedK, smoothD);
  const dLine = new Array(candles.length).fill(null);
  vi = 0;
  for (let i = 0; i < candles.length; i++) {
    if (kLine[i] != null) {
      dLine[i] = dValues[vi];
      vi++;
    }
  }

  return { k: kLine, d: dLine };
}

export function calcADX(candles, period = 14) {
  const len = candles.length;
  const plusDM = new Array(len).fill(0);
  const minusDM = new Array(len).fill(0);
  const tr = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = candles[i][2] - candles[i - 1][2];
    const downMove = candles[i - 1][3] - candles[i][3];
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

    const high = candles[i][2];
    const low = candles[i][3];
    const prevClose = candles[i - 1][4];
    tr[i] = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  const smooth = (arr) => {
    const out = new Array(len).fill(null);
    let sum = 0;
    for (let i = 1; i <= period; i++) sum += arr[i] || 0;
    out[period] = sum;
    for (let i = period + 1; i < len; i++) {
      out[i] = out[i - 1] - out[i - 1] / period + arr[i];
    }
    return out;
  };

  const trSmooth = smooth(tr);
  const plusDMSmooth = smooth(plusDM);
  const minusDMSmooth = smooth(minusDM);

  const plusDI = new Array(len).fill(null);
  const minusDI = new Array(len).fill(null);
  const dx = new Array(len).fill(null);

  for (let i = period; i < len; i++) {
    if (trSmooth[i] > 0) {
      plusDI[i] = (plusDMSmooth[i] / trSmooth[i]) * 100;
      minusDI[i] = (minusDMSmooth[i] / trSmooth[i]) * 100;
      const diSum = plusDI[i] + minusDI[i];
      dx[i] = diSum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100 : 0;
    }
  }

  const validDx = dx.filter((v) => v != null);
  const adxValues = calcSMA(validDx, period);
  const adx = new Array(len).fill(null);
  let vi = 0;
  for (let i = 0; i < len; i++) {
    if (dx[i] != null) {
      adx[i] = adxValues[vi];
      vi++;
    }
  }

  return { adx, plusDI, minusDI };
}

export function calcSupertrend(candles, period = 10, multiplier = 3) {
  const len = candles.length;
  const atr = calcATR(candles, period);
  const value = new Array(len).fill(null);
  const direction = new Array(len).fill(null);

  let prevUpperBand = null;
  let prevLowerBand = null;
  let prevSupertrend = null;
  let prevDirection = 1;

  for (let i = 0; i < len; i++) {
    if (atr[i] == null) continue;

    const hl2 = (candles[i][2] + candles[i][3]) / 2;
    let upperBand = hl2 + multiplier * atr[i];
    let lowerBand = hl2 - multiplier * atr[i];
    const close = candles[i][4];

    if (prevUpperBand != null) {
      upperBand =
        upperBand < prevUpperBand || candles[i - 1][4] > prevUpperBand
          ? upperBand
          : prevUpperBand;
      lowerBand =
        lowerBand > prevLowerBand || candles[i - 1][4] < prevLowerBand
          ? lowerBand
          : prevLowerBand;
    }

    let dir = prevDirection;
    if (prevSupertrend != null) {
      if (prevDirection === 1 && close < lowerBand) dir = -1;
      else if (prevDirection === -1 && close > upperBand) dir = 1;
    } else {
      dir = close > hl2 ? 1 : -1;
    }

    const st = dir === 1 ? lowerBand : upperBand;

    value[i] = st;
    direction[i] = dir;

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = st;
    prevDirection = dir;
  }

  return { value, direction };
}

export function calcVWAP(intradayCandles) {
  if (!intradayCandles.length) return null;

  let cumPV = 0;
  let cumVolume = 0;
  for (const [, open, high, low, close, volume] of intradayCandles) {
    const typicalPrice = (high + low + close) / 3;
    cumPV += typicalPrice * volume;
    cumVolume += volume;
  }

  return cumVolume > 0 ? cumPV / cumVolume : null;
}

function lastValid(series, idx) {
  for (let i = idx; i >= 0; i--) {
    if (series[i] != null) return series[i];
  }
  return null;
}

function findIndexForDate(candles, asOfDate) {
  const target = new Date(asOfDate).setHours(23, 59, 59, 999);
  let idx = -1;
  for (let i = 0; i < candles.length; i++) {
    if (new Date(candles[i][0]).getTime() <= target) idx = i;
    else break;
  }
  return idx;
}

/**
 * Compute every indicator "as of" a given date from a daily candle series.
 * Returns null values for indicators that don't have enough lookback yet.
 */
export function computeIndicatorSnapshot(dailyCandles, asOfDate) {
  const idx = findIndexForDate(dailyCandles, asOfDate);
  if (idx < 0) return null;

  const closes = closesOf(dailyCandles);
  const volumes = dailyCandles.map((c) => c[5]);

  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const rsi14 = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const bb = calcBollingerBands(closes, 20, 2);
  const atr14 = calcATR(dailyCandles, 14);
  const stoch = calcStochastic(dailyCandles, 14, 3, 3);
  const adxRes = calcADX(dailyCandles, 14);
  const supertrend = calcSupertrend(dailyCandles, 10, 3);

  const close = closes[idx];
  const prevClose = idx > 0 ? closes[idx - 1] : close;
  const volume = volumes[idx];
  const avgVolume20 = lastValid(calcSMA(volumes, 20), idx);

  return {
    date: dailyCandles[idx][0],
    close,
    priceDelta: prevClose ? ((close - prevClose) / prevClose) * 100 : 0,
    volume,
    avgVolume20: avgVolume20 != null ? Math.round(avgVolume20) : null,
    volumeDelta: avgVolume20 ? ((volume - avgVolume20) / avgVolume20) * 100 : null,
    sma20: sma20[idx],
    sma50: sma50[idx],
    sma200: sma200[idx],
    ema20: ema20[idx],
    ema50: ema50[idx],
    rsi14: rsi14[idx],
    macd: macd.macd[idx],
    macdSignal: macd.signal[idx],
    macdHistogram: macd.histogram[idx],
    bbUpper: bb.upper[idx],
    bbMiddle: bb.middle[idx],
    bbLower: bb.lower[idx],
    bbPercentB: bb.percentB[idx],
    atr14: atr14[idx],
    stochK: stoch.k[idx],
    stochD: stoch.d[idx],
    adx: adxRes.adx[idx],
    plusDI: adxRes.plusDI[idx],
    minusDI: adxRes.minusDI[idx],
    supertrendValue: supertrend.value[idx],
    supertrendDirection: supertrend.direction[idx],
  };
}

// ── /api/indicators/table orchestration ─────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function daysBetween(a, b) {
  return Math.abs((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

const INTRADAY_RETENTION_DAYS = 59;
const TODAY_CACHE_TTL = 3 * 60 * 1000;
const tableCache = new Map();

/**
 * Resolve the current (or nearest-upcoming) monthly Futures contract for an
 * equity's underlying `name`, then pull its OI history to compute OI + OI delta
 * as of the requested date. Best-effort — returns null on any lookup failure.
 */
async function fetchOIForUnderlying(kiteRequest, req, underlyingName, requestedDate) {
  try {
    const nfoInstruments = await fetchInstruments(req, kiteRequest, "NFO");
    const futures = nfoInstruments.filter(
      (i) => i.instrument_type === "FUT" && i.name === underlyingName && i.expiry
    );
    if (!futures.length) return null;

    const target = new Date(requestedDate);
    const withExpiry = futures.map((f) => ({ ...f, expiryDate: new Date(f.expiry) }));
    const upcoming = withExpiry
      .filter((f) => f.expiryDate >= target)
      .sort((a, b) => a.expiryDate - b.expiryDate);
    const contract =
      upcoming[0] ||
      withExpiry.sort((a, b) => b.expiryDate - a.expiryDate)[0];
    if (!contract) return null;

    const to = new Date(requestedDate);
    to.setHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setDate(from.getDate() - 12);

    const params = new URLSearchParams({
      from: formatKiteDate(from),
      to: formatKiteDate(to),
      oi: "1",
    });

    const data = await kiteRequest(
      req,
      `/instruments/historical/${contract.instrument_token}/day?${params.toString()}`
    );
    const candles = data.candles || [];
    if (!candles.length) return null;

    const last = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : null;
    const oiValue = last[6] ?? null;
    const oiPrevValue = prev ? prev[6] ?? null : null;

    return {
      contract: contract.tradingsymbol,
      expiry: contract.expiry,
      oi: oiValue,
      oiChange:
        oiValue != null && oiPrevValue
          ? ((oiValue - oiPrevValue) / oiPrevValue) * 100
          : null,
    };
  } catch {
    return null;
  }
}

function extractLiveExtras(quote) {
  if (!quote || !quote.depth) return null;
  const bidQty = (quote.depth.buy || []).reduce((s, l) => s + (l.quantity || 0), 0);
  const askQty = (quote.depth.sell || []).reduce((s, l) => s + (l.quantity || 0), 0);
  const total = bidQty + askQty;
  return {
    bidQty,
    askQty,
    orderImbalance: total > 0 ? ((bidQty - askQty) / total) * 100 : 0,
  };
}

/**
 * Build the full indicator table for a universe of stocks, "as of" a given date.
 * See backend/momentum.js for the sibling momentum-scan implementation this
 * mirrors (same rate-limit-safe sequential fetch + sleep pattern).
 */
export async function getIndicatorTable(kiteRequest, req, options = {}) {
  const universe = options.universe || "nifty50";
  const date = options.date || new Date().toISOString().split("T")[0];
  const includeOI = options.includeOI === "true" || options.includeOI === true;

  const requestedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(requestedDate.getTime())) {
    throw Object.assign(new Error("Invalid date"), { status: 400 });
  }
  const now = new Date();
  if (requestedDate > now) {
    throw Object.assign(new Error("Selected date is in the future"), { status: 400 });
  }

  const cacheKey = `${universe}-${date}-${includeOI}`;
  const isTodayDate = isSameDay(date, now);
  const ttl = isTodayDate ? TODAY_CACHE_TTL : Infinity;
  const cached = tableCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ttl) {
    return { ...cached.data, cached: true };
  }

  const instruments = await fetchInstruments(req, kiteRequest, "NSE");
  const symbolToInstrument = Object.fromEntries(
    instruments.map((i) => [i.tradingsymbol, i])
  );

  const universeSymbols = universe === "nifty50" ? NIFTY50 : instruments.map((i) => i.tradingsymbol);
  const symbols = universeSymbols.filter((s) => symbolToInstrument[s]);

  const intradayRetentionOk = daysBetween(date, now) <= INTRADAY_RETENTION_DAYS;

  let liveQuotes = {};
  if (isTodayDate) {
    liveQuotes = await batchQuote(kiteRequest, req, symbols);
  }

  const rows = [];
  let skippedNoData = 0;

  for (const sym of symbols) {
    const inst = symbolToInstrument[sym];

    const dailyCandles = await fetchHistorical(
      kiteRequest,
      req,
      inst.instrument_token,
      320,
      "day",
      requestedDate
    );

    const snapshot = dailyCandles.length
      ? computeIndicatorSnapshot(dailyCandles, date)
      : null;

    if (!snapshot) {
      skippedNoData++;
      await sleep(150);
      continue;
    }

    let vwap = null;
    if (intradayRetentionOk) {
      const intraday = await fetchHistorical(
        kiteRequest,
        req,
        inst.instrument_token,
        0,
        "5minute",
        requestedDate
      );
      vwap = calcVWAP(intraday);
      await sleep(150);
    }

    let oi = null;
    if (includeOI) {
      oi = await fetchOIForUnderlying(kiteRequest, req, inst.name, requestedDate);
      await sleep(150);
    }

    const liveExtras = isTodayDate
      ? extractLiveExtras(liveQuotes[`NSE:${sym}`])
      : null;

    rows.push({
      tradingsymbol: sym,
      name: inst.name,
      ...snapshot,
      vwap,
      oi,
      liveExtras,
    });

    await sleep(200);
  }

  const payload = {
    date,
    universe,
    isToday: isTodayDate,
    intradayRetentionOk,
    includeOI,
    totalRequested: symbols.length,
    totalReturned: rows.length,
    skippedNoData,
    generatedAt: new Date().toISOString(),
    rows,
    cached: false,
  };

  tableCache.set(cacheKey, { data: payload, fetchedAt: Date.now() });
  return payload;
}
