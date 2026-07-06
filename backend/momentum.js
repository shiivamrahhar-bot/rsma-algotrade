// Nifty 50 constituents for fast scan
export const NIFTY50 = [
  "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK",
  "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BEL", "BHARTIARTL",
  "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "ETERNAL",
  "GRASIM", "HCLTECH", "HDFCBANK", "HDFCLIFE", "HEROMOTOCO",
  "HINDALCO", "HINDUNILVR", "ICICIBANK", "ITC", "INDUSINDBK",
  "INFY", "JSWSTEEL", "JIOFIN", "KOTAKBANK", "LT",
  "M&M", "MARUTI", "NTPC", "NESTLEIND", "ONGC",
  "POWERGRID", "RELIANCE", "SBILIFE", "SHRIRAMFIN", "SBIN",
  "SUNPHARMA", "TCS", "TATACONSUM", "TATAMOTORS", "TATASTEEL",
  "TECHM", "TITAN", "TRENT", "ULTRACEMCO", "WIPRO",
];

const instrumentsCacheByExchange = new Map();
let scanCache = { data: null, key: "", fetchedAt: 0 };

const CACHE_TTL = 3 * 60 * 1000;
const INSTRUMENTS_TTL = 12 * 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pctChange(from, to) {
  if (!from || from === 0) return 0;
  return ((to - from) / from) * 100;
}

export function formatKiteDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseInstrumentsCsv(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");
  const idx = (name) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      instrument_token: Number(cols[idx("instrument_token")]),
      tradingsymbol: cols[idx("tradingsymbol")],
      name: cols[idx("name")],
      instrument_type: cols[idx("instrument_type")],
      segment: cols[idx("segment")],
      exchange: cols[idx("exchange")],
      lot_size: Number(cols[idx("lot_size")]),
      expiry: cols[idx("expiry")] || null,
    };
  });
}

/**
 * Fetch & cache the instrument dump for an exchange. NSE requests are filtered
 * down to plain equity (used by the momentum scanner); other exchanges (e.g.
 * NFO for futures/options OI lookups) are returned unfiltered aside from the
 * exchange match itself.
 */
export async function fetchInstruments(req, kiteRequest, exchange = "NSE") {
  const now = Date.now();
  const cached = instrumentsCacheByExchange.get(exchange);
  if (cached && now - cached.fetchedAt < INSTRUMENTS_TTL) {
    return cached.data;
  }

  const url = `https://api.kite.trade/instruments/${exchange}`;
  const response = await fetch(url, {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${process.env.KITE_API_KEY}:${req.session.accessToken}`,
    },
  });
  const csv = await response.text();
  const all = parseInstrumentsCsv(csv);

  const parsed =
    exchange === "NSE"
      ? all.filter(
          (i) =>
            i.exchange === "NSE" &&
            i.instrument_type === "EQ" &&
            i.segment === "NSE" &&
            !i.tradingsymbol.includes("-") &&
            !i.tradingsymbol.endsWith("BE")
        )
      : all.filter((i) => i.exchange === exchange);

  instrumentsCacheByExchange.set(exchange, { data: parsed, fetchedAt: now });
  return parsed;
}

export async function batchQuote(kiteRequest, req, symbols) {
  const result = {};
  const batchSize = 400;

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const params = new URLSearchParams();
    batch.forEach((s) => params.append("i", `NSE:${s}`));
    const data = await kiteRequest(req, `/quote?${params.toString()}`);
    Object.assign(result, data);
    if (i + batchSize < symbols.length) await sleep(300);
  }

  return result;
}

/**
 * Fetch historical candles. Pass `toDate` (Date or ISO string) to pull data
 * "as of" a past date instead of "up to now" — used by the indicator table
 * to compute snapshots for a user-selected date.
 */
export async function fetchHistorical(
  kiteRequest,
  req,
  token,
  days = 30,
  interval = "day",
  toDate = null
) {
  const to = toDate ? new Date(toDate) : new Date();
  const from = new Date(to);

  if (interval === "day") {
    from.setDate(from.getDate() - days);
    to.setHours(23, 59, 59, 999);
  } else {
    from.setHours(9, 15, 0, 0);
    if (toDate) to.setHours(15, 30, 0, 0);
  }

  const params = new URLSearchParams({
    from: formatKiteDate(from),
    to: formatKiteDate(to),
  });

  try {
    const data = await kiteRequest(
      req,
      `/instruments/historical/${token}/${interval}?${params.toString()}`
    );
    return data.candles || [];
  } catch {
    return [];
  }
}

function istMarketMinutes(isoDate) {
  const d = new Date(isoDate);
  const h = d.getHours();
  const m = d.getMinutes();
  return (h - 9) * 60 + (m - 15);
}

function findMomentumTrigger(intradayCandles, prevClose, avgDailyVolume) {
  if (!intradayCandles.length || !prevClose) return null;

  const sessionMinutes = 375;
  let cumVolume = 0;

  for (let i = 0; i < intradayCandles.length; i++) {
    const [date, open, , , close, volume] = intradayCandles[i];
    cumVolume += volume;

    const minutes = istMarketMinutes(date);
    if (minutes < 0) continue;

    const dayCh = pctChange(prevClose, close);
    const expectedVol = avgDailyVolume * (minutes / sessionMinutes);
    const volSurge = expectedVol > 0 ? cumVolume / expectedVol : 1;
    const barsSoFar = i + 1;
    const avgBarVol = avgDailyVolume / 75;
    const barVolSurge = volume / avgBarVol;

    const suddenHit =
      dayCh >= 1.5 &&
      volSurge >= 1.8 &&
      barVolSurge >= 1.5 &&
      close > open &&
      dayCh > 0;

    if (suddenHit) {
      return {
        triggeredAt: date,
        triggerPrice: close,
        triggerDayChange: Math.round(dayCh * 100) / 100,
        triggerVolumeSurge: Math.round(volSurge * 100) / 100,
        triggerIntradayChange: Math.round(pctChange(open, close) * 100) / 100,
      };
    }
  }

  return null;
}

async function enrichWithTrigger(kiteRequest, req, metrics, dailyCandles) {
  const intraday = await fetchHistorical(
    kiteRequest,
    req,
    metrics.instrument_token,
    0,
    "5minute"
  );

  const volumes = dailyCandles.map((c) => c[5]);
  const avgDailyVolume =
    volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length) || 1;

  const trigger = findMomentumTrigger(intraday, metrics.prevClose, avgDailyVolume);

  if (trigger) {
    return {
      ...metrics,
      ...trigger,
      gainSinceTrigger: Math.round(pctChange(trigger.triggerPrice, metrics.ltp) * 100) / 100,
    };
  }

  return {
    ...metrics,
    triggeredAt: null,
    triggerPrice: null,
    triggerDayChange: null,
    triggerVolumeSurge: null,
    triggerIntradayChange: null,
    gainSinceTrigger: null,
  };
}

function computeMetrics(instrument, quote, candles) {
  const key = `NSE:${instrument.tradingsymbol}`;
  const q = quote[key];
  if (!q) return null;

  const ltp = q.last_price;
  const prevClose = q.ohlc?.close || ltp;
  const open = q.ohlc?.open || ltp;
  const high = q.ohlc?.high || ltp;
  const low = q.ohlc?.low || ltp;
  const volume = q.volume || 0;

  const dayChange = pctChange(prevClose, ltp);
  const intradayChange = pctChange(open, ltp);
  const gapPercent = pctChange(prevClose, open);

  let momentum5d = 0;
  let momentum10d = 0;
  let momentum20d = 0;
  let volumeSurge = 1;
  let acceleration = 0;
  let high20d = ltp;
  let low20d = ltp;
  let avgVolume20d = volume;
  let recentCandles = [];

  if (candles.length >= 2) {
    const closes = candles.map((c) => c[4]);
    const volumes = candles.map((c) => c[5]);
    const n = closes.length;
    const lastClose = closes[n - 1];

    momentum5d = n >= 6 ? pctChange(closes[n - 6], lastClose) : pctChange(closes[0], lastClose);
    momentum10d = n >= 11 ? pctChange(closes[n - 11], lastClose) : pctChange(closes[0], lastClose);
    momentum20d = n >= 21 ? pctChange(closes[n - 21], lastClose) : pctChange(closes[0], lastClose);

    const volSlice = volumes.slice(-20);
    avgVolume20d = volSlice.reduce((a, b) => a + b, 0) / volSlice.length || 1;
    volumeSurge = volume / avgVolume20d;

    const priceSlice20 = closes.slice(-20);
    high20d = Math.max(...priceSlice20);
    low20d = Math.min(...priceSlice20);

    if (n >= 11) {
      const recent5 = pctChange(closes[n - 6], lastClose);
      const prior5 = pctChange(closes[n - 11], closes[n - 6]);
      acceleration = recent5 - prior5;
    }

    recentCandles = candles.slice(-10).map((c) => ({
      date: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    }));
  }

  const distFromHigh20d = pctChange(high20d, ltp);
  const distFromLow20d = pctChange(low20d, ltp);

  const momentumScore =
    dayChange * 0.2 +
    momentum5d * 0.25 +
    momentum10d * 0.2 +
    momentum20d * 0.15 +
    Math.min(volumeSurge, 5) * 2 +
    intradayChange * 0.15 +
    acceleration * 0.1;

  const suddenMomentum =
    volumeSurge >= 1.8 &&
    (Math.abs(dayChange) >= 1.5 || Math.abs(intradayChange) >= 1.5) &&
    dayChange > 0;

  const strongMomentum =
    momentumScore >= 8 &&
    momentum5d > 0 &&
    momentum10d > 0 &&
    dayChange > 0;

  let signal = "WATCH";
  if (suddenMomentum && strongMomentum) signal = "HOT — Sudden + Sustained";
  else if (suddenMomentum) signal = "SUDDEN MOMENTUM";
  else if (strongMomentum) signal = "STRONG MOMENTUM";
  else if (momentumScore >= 5 && dayChange > 0) signal = "BUILDING";

  return {
    tradingsymbol: instrument.tradingsymbol,
    name: instrument.name,
    instrument_token: instrument.instrument_token,
    exchange: "NSE",
    ltp,
    open,
    high,
    low,
    prevClose,
    volume,
    dayChange,
    intradayChange,
    gapPercent,
    momentum5d,
    momentum10d,
    momentum20d,
    volumeSurge,
    acceleration,
    high20d,
    low20d,
    distFromHigh20d,
    distFromLow20d,
    avgVolume20d: Math.round(avgVolume20d),
    momentumScore: Math.round(momentumScore * 100) / 100,
    suddenMomentum,
    strongMomentum,
    signal,
    upperCircuit: q.upper_circuit_limit,
    lowerCircuit: q.lower_circuit_limit,
    buyQty: q.buy_quantity,
    sellQty: q.sell_quantity,
    recentCandles,
  };
}

function getUniverseSymbols(universe, instruments) {
  if (universe === "nifty50") return NIFTY50;

  if (universe === "fno") {
    return instruments
      .filter((i) => i.lot_size > 1 || NIFTY50.includes(i.tradingsymbol))
      .map((i) => i.tradingsymbol)
      .slice(0, 200);
  }

  if (universe === "nse_all") {
    return instruments.map((i) => i.tradingsymbol);
  }

  return instruments.map((i) => i.tradingsymbol);
}

export async function scanMomentum(kiteRequest, req, options = {}) {
  const universe = options.universe || "nifty50";
  const limit = Number(options.limit) || 30;
  const suddenOnly = options.suddenOnly === "true" || options.suddenOnly === true;
  const cacheKey = `${universe}-${limit}-${suddenOnly}`;

  const now = Date.now();
  if (
    scanCache.data &&
    scanCache.key === cacheKey &&
    now - scanCache.fetchedAt < CACHE_TTL
  ) {
    return { ...scanCache.data, cached: true };
  }

  const instruments = await fetchInstruments(req, kiteRequest);
  const symbolToInstrument = Object.fromEntries(
    instruments.map((i) => [i.tradingsymbol, i])
  );

  let symbols = getUniverseSymbols(universe, instruments);
  symbols = symbols.filter((s) => symbolToInstrument[s]);

  const quotes = await batchQuote(kiteRequest, req, symbols);

  const prelim = symbols
    .map((sym) => {
      const key = `NSE:${sym}`;
      const q = quotes[key];
      if (!q || !q.volume) return null;
      const dayCh = pctChange(q.ohlc?.close || q.last_price, q.last_price);
      const intraCh = pctChange(q.ohlc?.open || q.last_price, q.last_price);
      const score = Math.abs(dayCh) * 2 + Math.abs(intraCh) + Math.log10(q.volume + 1);
      return { sym, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const candidateCount = universe === "nifty50" ? symbols.length : 50;
  const candidates = prelim.slice(0, candidateCount).map((p) => p.sym);

  const results = [];
  for (const sym of candidates) {
    const inst = symbolToInstrument[sym];
    const candles = await fetchHistorical(
      kiteRequest,
      req,
      inst.instrument_token,
      35,
      "day"
    );
    let metrics = computeMetrics(inst, quotes, candles);
    if (metrics && (metrics.suddenMomentum || metrics.momentumScore >= 8)) {
      metrics = await enrichWithTrigger(kiteRequest, req, metrics, candles);
      await sleep(200);
    }
    if (metrics) results.push(metrics);
    await sleep(350);
  }

  let ranked = results.sort((a, b) => b.momentumScore - a.momentumScore);
  if (suddenOnly) ranked = ranked.filter((r) => r.suddenMomentum);
  ranked = ranked.slice(0, limit);

  const payload = {
    scannedAt: new Date().toISOString(),
    universe,
    totalScanned: candidates.length,
    suddenCount: results.filter((r) => r.suddenMomentum).length,
    stocks: ranked,
    cached: false,
  };

  scanCache = { data: payload, key: cacheKey, fetchedAt: now };
  return payload;
}

export async function getMomentumDetail(kiteRequest, req, symbol) {
  const instruments = await fetchInstruments(req, kiteRequest);
  const inst = instruments.find(
    (i) => i.tradingsymbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!inst) throw new Error("Stock not found");

  const quotes = await batchQuote(kiteRequest, req, [inst.tradingsymbol]);
  const candles = await fetchHistorical(
    kiteRequest,
    req,
    inst.instrument_token,
    60
  );

  const metrics = computeMetrics(inst, quotes, candles);
  if (!metrics) throw new Error("Quote data unavailable");

  const enriched = await enrichWithTrigger(kiteRequest, req, metrics, candles);
  const intraday = await fetchHistorical(
    kiteRequest,
    req,
    inst.instrument_token,
    0,
    "5minute"
  );

  return {
    ...enriched,
    candles: candles.map((c) => ({
      date: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    })),
    intradayCandles: intraday.map((c) => ({
      date: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
    })),
    buyChecklist: {
      priceAboveOpen: metrics.ltp > metrics.open,
      volumeSurge: metrics.volumeSurge >= 1.5,
      positive5d: metrics.momentum5d > 0,
      positive10d: metrics.momentum10d > 0,
      notAtCircuit: metrics.ltp < metrics.upperCircuit * 0.995,
      momentumAccelerating: metrics.acceleration > 0,
    },
  };
}

export async function getTodayTriggers(kiteRequest, req, options = {}) {
  const scan = await scanMomentum(kiteRequest, req, {
    universe: options.universe || "nifty50",
    limit: 50,
    suddenOnly: false,
  });

  const triggers = scan.stocks
    .filter((s) => s.triggeredAt)
    .map((s) => ({
      tradingsymbol: s.tradingsymbol,
      name: s.name,
      triggeredAt: s.triggeredAt,
      triggerPrice: s.triggerPrice,
      triggerDayChange: s.triggerDayChange,
      triggerVolumeSurge: s.triggerVolumeSurge,
      currentPrice: s.ltp,
      gainSinceTrigger: s.gainSinceTrigger,
      signal: s.signal,
      momentumScore: s.momentumScore,
    }))
    .sort((a, b) => new Date(a.triggeredAt) - new Date(b.triggeredAt));

  return {
    date: new Date().toISOString().split("T")[0],
    market: "NSE",
    triggers,
    scannedAt: scan.scannedAt,
  };
}
