import type {
  Holding,
  Margins,
  Order,
  Positions,
  Quote,
  Trade,
  UserProfile,
} from "../types/kite";
import type { MomentumDetail, MomentumScanResult, MomentumUniverse, TriggerLogResult } from "../types/momentum";
import type { IndicatorTableResult } from "../types/indicators";
import type { SMCAnalysisResult, SMCLeaderboardResult } from "../types/smc";
import type { MTFAnalysisResult, MTFInterval, MTFLeaderboardResult } from "../types/mtf";
import type { BacktestInterval, BacktestResult } from "../types/backtest";

const API = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  health: () => fetchJson<{ ok: boolean; configured: boolean }>(`${API}/health`),

  getLoginUrl: () => fetchJson<{ loginUrl: string }>(`${API}/auth/login`),

  me: () =>
    fetchJson<{ authenticated: boolean; user?: UserProfile }>(`${API}/auth/me`),

  logout: () =>
    fetchJson<{ success: boolean }>(`${API}/auth/logout`, { method: "POST" }),

  profile: () => fetchJson<UserProfile>(`${API}/user/profile`),

  margins: () => fetchJson<Margins>(`${API}/user/margins`),

  holdings: () => fetchJson<Holding[]>(`${API}/portfolio/holdings`),

  positions: () => fetchJson<Positions>(`${API}/portfolio/positions`),

  orders: () => fetchJson<Order[]>(`${API}/orders`),

  trades: () => fetchJson<Trade[]>(`${API}/trades`),

  quote: (instruments: string[]) => {
    const params = new URLSearchParams();
    instruments.forEach((i) => params.append("i", i));
    return fetchJson<Record<string, Quote>>(`${API}/quote?${params}`);
  },

  momentumScan: (opts: {
    universe?: MomentumUniverse;
    suddenOnly?: boolean;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (opts.universe) params.set("universe", opts.universe);
    if (opts.suddenOnly) params.set("suddenOnly", "true");
    if (opts.limit) params.set("limit", String(opts.limit));
    return fetchJson<MomentumScanResult>(`${API}/momentum/scan?${params}`);
  },

  momentumDetail: (symbol: string) =>
    fetchJson<MomentumDetail>(`${API}/momentum/detail/${symbol}`),

  momentumTriggersToday: (universe?: string) => {
    const params = universe ? `?universe=${universe}` : "";
    return fetchJson<import("../types/momentum").TriggerLogResult>(
      `${API}/momentum/triggers/today${params}`
    );
  },

  placeOrder: (order: import("../types/alerts").PlaceOrderRequest) =>
    fetchJson<import("../types/alerts").PlaceOrderResponse>(`${API}/orders/place`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    }),

  indicatorsTable: (opts: { date: string; universe?: string; includeOI?: boolean }) => {
    const params = new URLSearchParams();
    params.set("date", opts.date);
    if (opts.universe) params.set("universe", opts.universe);
    if (opts.includeOI) params.set("includeOI", "true");
    return fetchJson<IndicatorTableResult>(`${API}/indicators/table?${params}`);
  },

  smcLeaderboard: (opts: { date: string; universe?: string }) => {
    const params = new URLSearchParams();
    params.set("date", opts.date);
    if (opts.universe) params.set("universe", opts.universe);
    return fetchJson<SMCLeaderboardResult>(`${API}/smc/leaderboard?${params}`);
  },

  smcAnalysis: (symbol: string, opts: { date: string; includeStats?: boolean }) => {
    const params = new URLSearchParams();
    params.set("date", opts.date);
    if (opts.includeStats) params.set("includeStats", "true");
    return fetchJson<SMCAnalysisResult>(`${API}/smc/analysis/${symbol}?${params}`);
  },

  mtfLeaderboard: (interval: MTFInterval, universe = "nifty50") => {
    const params = new URLSearchParams({ interval, universe });
    return fetchJson<MTFLeaderboardResult>(`${API}/mtf/leaderboard?${params}`);
  },

  mtfAnalysis: (symbol: string, interval: MTFInterval) => {
    const params = new URLSearchParams({ interval });
    return fetchJson<MTFAnalysisResult>(`${API}/mtf/analysis/${symbol}?${params}`);
  },

  runBacktest: (symbol: string, opts: { interval: BacktestInterval; months: number }) => {
    const params = new URLSearchParams({ interval: opts.interval, months: String(opts.months) });
    return fetchJson<BacktestResult>(`${API}/backtest/${symbol}?${params}`);
  },
};

export const demoData = {
  profile: {
    user_id: "BKF711",
    user_name: "RSMA Trader",
    email: "trader@rsma.in",
    user_type: "individual",
    broker: "ZERODHA",
    exchanges: ["NSE", "BSE", "NFO", "BFO", "MCX"],
    products: ["CNC", "NRML", "MIS", "BO", "CO"],
    order_types: ["MARKET", "LIMIT", "SL", "SL-M"],
  } satisfies UserProfile,

  margins: {
    equity: {
      enabled: true,
      net: 485230.5,
      available: {
        adhoc_margin: 0,
        cash: 312450.25,
        opening_balance: 298000,
        live_balance: 312450.25,
        collateral: 125000,
        intraday_payin: 14450.25,
      },
      utilised: {
        debits: 48219.75,
        exposure: 12500,
        m2m_realised: 8420.5,
        m2m_unrealised: 15230.25,
        option_premium: 0,
        payout: 0,
        span: 8500,
        holding_sales: 0,
        turnover: 2450000,
      },
    },
    commodity: {
      enabled: true,
      net: 125000,
      available: {
        adhoc_margin: 0,
        cash: 98000,
        opening_balance: 95000,
        live_balance: 98000,
        collateral: 0,
        intraday_payin: 3000,
      },
      utilised: {
        debits: 12000,
        exposure: 8000,
        m2m_realised: 2500,
        m2m_unrealised: -1200,
        option_premium: 0,
        payout: 0,
        span: 5000,
        holding_sales: 0,
        turnover: 450000,
      },
    },
  } satisfies Margins,

  holdings: [
    {
      tradingsymbol: "RELIANCE",
      exchange: "NSE",
      isin: "INE002A01018",
      quantity: 50,
      average_price: 2450.5,
      last_price: 2685.3,
      close_price: 2660,
      pnl: 11740,
      day_change: 25.3,
      day_change_percentage: 0.95,
      product: "CNC",
      collateral_quantity: 0,
      collateral_type: "",
      t1_quantity: 0,
    },
    {
      tradingsymbol: "INFY",
      exchange: "NSE",
      isin: "INE009A01021",
      quantity: 100,
      average_price: 1520,
      last_price: 1685.75,
      close_price: 1670,
      pnl: 16575,
      day_change: 15.75,
      day_change_percentage: 0.94,
      product: "CNC",
      collateral_quantity: 0,
      collateral_type: "",
      t1_quantity: 0,
    },
    {
      tradingsymbol: "TCS",
      exchange: "NSE",
      isin: "INE467B01029",
      quantity: 25,
      average_price: 3850,
      last_price: 4120.5,
      close_price: 4095,
      pnl: 6762.5,
      day_change: 25.5,
      day_change_percentage: 0.62,
      product: "CNC",
      collateral_quantity: 0,
      collateral_type: "",
      t1_quantity: 0,
    },
  ] satisfies Holding[],

  positions: {
    net: [
      {
        tradingsymbol: "NIFTY25JULFUT",
        exchange: "NFO",
        instrument_token: 256265,
        product: "NRML",
        quantity: 50,
        overnight_quantity: 50,
        multiplier: 1,
        average_price: 24150,
        close_price: 24280,
        last_price: 24385,
        value: 1219250,
        pnl: 11750,
        m2m: 5250,
        unrealised: 11750,
        realised: 0,
        buy_quantity: 50,
        sell_quantity: 0,
        buy_price: 24150,
        sell_price: 0,
        buy_value: 1207500,
        sell_value: 0,
      },
    ],
    day: [
      {
        tradingsymbol: "BANKNIFTY25JULFUT",
        exchange: "NFO",
        instrument_token: 260105,
        product: "MIS",
        quantity: 15,
        overnight_quantity: 0,
        multiplier: 1,
        average_price: 51200,
        close_price: 51150,
        last_price: 51320,
        value: 769800,
        pnl: 1800,
        m2m: 1800,
        unrealised: 1800,
        realised: 0,
        buy_quantity: 15,
        sell_quantity: 0,
        buy_price: 51200,
        sell_price: 0,
        buy_value: 768000,
        sell_value: 0,
      },
    ],
  } satisfies Positions,

  orders: [
    {
      order_id: "240706000123456",
      parent_order_id: null,
      exchange_order_id: "191234567890",
      placed_by: "BKF711",
      variety: "regular",
      status: "COMPLETE",
      status_message: null,
      order_timestamp: "2026-07-06T09:32:15+05:30",
      exchange: "NSE",
      tradingsymbol: "RELIANCE",
      instrument_token: 738561,
      transaction_type: "BUY",
      order_type: "LIMIT",
      product: "CNC",
      quantity: 10,
      filled_quantity: 10,
      pending_quantity: 0,
      cancelled_quantity: 0,
      price: 2675,
      trigger_price: 0,
      average_price: 2674.5,
    },
    {
      order_id: "240706000123457",
      parent_order_id: null,
      exchange_order_id: "191234567891",
      placed_by: "BKF711",
      variety: "regular",
      status: "OPEN",
      status_message: null,
      order_timestamp: "2026-07-06T10:15:42+05:30",
      exchange: "NFO",
      tradingsymbol: "NIFTY25JUL24500CE",
      instrument_token: 12345678,
      transaction_type: "BUY",
      order_type: "LIMIT",
      product: "MIS",
      quantity: 50,
      filled_quantity: 0,
      pending_quantity: 50,
      cancelled_quantity: 0,
      price: 125.5,
      trigger_price: 0,
      average_price: 0,
    },
  ] satisfies Order[],

  trades: [
    {
      trade_id: "240706000987654",
      order_id: "240706000123456",
      exchange: "NSE",
      tradingsymbol: "RELIANCE",
      instrument_token: 738561,
      product: "CNC",
      average_price: 2674.5,
      quantity: 10,
      fill_timestamp: "2026-07-06T09:32:18+05:30",
      exchange_timestamp: "2026-07-06T09:32:18+05:30",
      transaction_type: "BUY",
    },
  ] satisfies Trade[],

  quotes: {
    "NSE:NIFTY 50": {
      instrument_token: 256265,
      timestamp: "2026-07-06T13:45:00+05:30",
      last_price: 24385.65,
      last_quantity: 50,
      buy_quantity: 125000,
      sell_quantity: 98000,
      volume: 245000000,
      average_price: 24320.5,
      oi: 0,
      oi_day_high: 0,
      oi_day_low: 0,
      net_change: 105.65,
      lower_circuit_limit: 21947,
      upper_circuit_limit: 26824,
      ohlc: { open: 24250, high: 24420, low: 24210, close: 24280 },
      depth: { buy: [], sell: [] },
    },
    "NSE:BANKNIFTY": {
      instrument_token: 260105,
      timestamp: "2026-07-06T13:45:00+05:30",
      last_price: 51320.4,
      last_quantity: 15,
      buy_quantity: 45000,
      sell_quantity: 38000,
      volume: 85000000,
      average_price: 51250,
      oi: 0,
      oi_day_high: 0,
      oi_day_low: 0,
      net_change: 170.4,
      lower_circuit_limit: 46188,
      upper_circuit_limit: 56452,
      ohlc: { open: 51100, high: 51450, low: 51050, close: 51150 },
      depth: { buy: [], sell: [] },
    },
    "NSE:RELIANCE": {
      instrument_token: 738561,
      timestamp: "2026-07-06T13:45:00+05:30",
      last_price: 2685.3,
      last_quantity: 25,
      buy_quantity: 125000,
      sell_quantity: 98000,
      volume: 4500000,
      average_price: 2675,
      oi: 0,
      oi_day_high: 0,
      oi_day_low: 0,
      net_change: 25.3,
      lower_circuit_limit: 2415,
      upper_circuit_limit: 2955,
      ohlc: { open: 2665, high: 2695, low: 2658, close: 2660 },
      depth: { buy: [], sell: [] },
    },
  } satisfies Record<string, Quote>,
};

const demoCandles = [
  { date: "2026-06-25", open: 2400, high: 2420, low: 2385, close: 2410, volume: 1200000 },
  { date: "2026-06-26", open: 2410, high: 2445, low: 2405, close: 2438, volume: 1350000 },
  { date: "2026-06-27", open: 2438, high: 2460, low: 2420, close: 2455, volume: 1100000 },
  { date: "2026-06-30", open: 2455, high: 2480, low: 2440, close: 2470, volume: 980000 },
  { date: "2026-07-01", open: 2470, high: 2495, low: 2460, close: 2488, volume: 1050000 },
  { date: "2026-07-02", open: 2488, high: 2510, low: 2475, close: 2502, volume: 1400000 },
  { date: "2026-07-03", open: 2502, high: 2530, low: 2495, close: 2520, volume: 1600000 },
  { date: "2026-07-04", open: 2520, high: 2545, low: 2510, close: 2535, volume: 1250000 },
  { date: "2026-07-05", open: 2535, high: 2550, low: 2520, close: 2540, volume: 1180000 },
  { date: "2026-07-06", open: 2540, high: 2595, low: 2535, close: 2585, volume: 2800000 },
];

function demoTriggerIST(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const demoMomentumScan: MomentumScanResult = {
  scannedAt: new Date().toISOString(),
  universe: "nifty50",
  totalScanned: 50,
  suddenCount: 3,
  cached: false,
  stocks: [
    {
      tradingsymbol: "TRENT", name: "Trent Ltd", instrument_token: 502785, exchange: "NSE",
      ltp: 2585, open: 2540, high: 2595, low: 2535, prevClose: 2540, volume: 2800000,
      dayChange: 1.77, intradayChange: 1.77, gapPercent: 0, momentum5d: 6.8, momentum10d: 12.4, momentum20d: 18.2,
      volumeSurge: 2.4, acceleration: 2.1, high20d: 2595, low20d: 2280, distFromHigh20d: -0.38, distFromLow20d: 13.4,
      avgVolume20d: 1166667, momentumScore: 14.2, suddenMomentum: true, strongMomentum: true,
      signal: "HOT — Sudden + Sustained", upperCircuit: 2794, lowerCircuit: 2286, buyQty: 45000, sellQty: 32000,
      recentCandles: demoCandles,
      triggeredAt: demoTriggerIST(11, 20),
      triggerPrice: 2488,
      triggerDayChange: 1.52,
      triggerVolumeSurge: 2.1,
      gainSinceTrigger: 3.9,
    },
    {
      tradingsymbol: "BEL", name: "Bharat Electronics", instrument_token: 98049, exchange: "NSE",
      ltp: 412.5, open: 398, high: 415, low: 396, prevClose: 395, volume: 18500000,
      dayChange: 4.43, intradayChange: 3.64, gapPercent: 0.76, momentum5d: 8.2, momentum10d: 15.1, momentum20d: 22.5,
      volumeSurge: 3.1, acceleration: 3.5, high20d: 415, low20d: 320, distFromHigh20d: -0.6, distFromLow20d: 28.9,
      avgVolume20d: 5967742, momentumScore: 18.5, suddenMomentum: true, strongMomentum: true,
      signal: "SUDDEN MOMENTUM", upperCircuit: 434, lowerCircuit: 356, buyQty: 890000, sellQty: 420000,
      recentCandles: demoCandles.map((c) => ({ ...c, close: c.close * 0.16 })),
      triggeredAt: demoTriggerIST(13, 35),
      triggerPrice: 398.5,
      triggerDayChange: 1.52,
      triggerVolumeSurge: 2.4,
      gainSinceTrigger: 3.51,
    },
    {
      tradingsymbol: "RELIANCE", name: "Reliance Industries", instrument_token: 738561, exchange: "NSE",
      ltp: 2685.3, open: 2665, high: 2695, low: 2658, prevClose: 2660, volume: 4500000,
      dayChange: 0.95, intradayChange: 0.76, gapPercent: 0.19, momentum5d: 3.2, momentum10d: 5.8, momentum20d: 8.1,
      volumeSurge: 1.4, acceleration: 0.8, high20d: 2720, low20d: 2450, distFromHigh20d: -1.28, distFromLow20d: 9.6,
      avgVolume20d: 3214286, momentumScore: 7.8, suddenMomentum: false, strongMomentum: false,
      signal: "BUILDING", upperCircuit: 2955, lowerCircuit: 2415, buyQty: 125000, sellQty: 98000,
      recentCandles: demoCandles.map((c) => ({ ...c, close: c.close * 1.04 })),
    },
    {
      tradingsymbol: "INFY", name: "Infosys Ltd", instrument_token: 408065, exchange: "NSE",
      ltp: 1685.75, open: 1670, high: 1695, low: 1665, prevClose: 1670, volume: 3200000,
      dayChange: 0.94, intradayChange: 0.94, gapPercent: 0, momentum5d: 2.1, momentum10d: 4.5, momentum20d: 6.2,
      volumeSurge: 1.2, acceleration: 0.3, high20d: 1710, low20d: 1580, distFromHigh20d: -1.42, distFromLow20d: 6.7,
      avgVolume20d: 2666667, momentumScore: 5.4, suddenMomentum: false, strongMomentum: false,
      signal: "BUILDING", upperCircuit: 1837, lowerCircuit: 1503, buyQty: 98000, sellQty: 76000,
      recentCandles: demoCandles.map((c) => ({ ...c, close: c.close * 0.66 })),
    },
  ],
};

export const demoTriggerLog: TriggerLogResult = {
  date: new Date().toISOString().split("T")[0],
  market: "NSE",
  scannedAt: new Date().toISOString(),
  triggers: [
    {
      tradingsymbol: "TRENT",
      name: "Trent Ltd",
      triggeredAt: demoTriggerIST(11, 20),
      triggerPrice: 2488,
      triggerDayChange: 1.52,
      triggerVolumeSurge: 2.1,
      currentPrice: 2585,
      gainSinceTrigger: 3.9,
      signal: "HOT — Sudden + Sustained",
      momentumScore: 14.2,
    },
    {
      tradingsymbol: "BEL",
      name: "Bharat Electronics",
      triggeredAt: demoTriggerIST(13, 35),
      triggerPrice: 398.5,
      triggerDayChange: 1.52,
      triggerVolumeSurge: 2.4,
      currentPrice: 412.5,
      gainSinceTrigger: 3.51,
      signal: "SUDDEN MOMENTUM",
      momentumScore: 18.5,
    },
  ],
};

function demoIndicatorRow(overrides: Partial<import("../types/indicators").IndicatorRow>): import("../types/indicators").IndicatorRow {
  return {
    tradingsymbol: "RELIANCE",
    name: "Reliance Industries",
    date: new Date().toISOString().split("T")[0],
    close: 2685.3,
    priceDelta: 0.95,
    volume: 4500000,
    avgVolume20: 3214286,
    volumeDelta: 40.02,
    sma20: 2610.4,
    sma50: 2540.1,
    sma200: 2380.6,
    ema20: 2625.8,
    ema50: 2555.2,
    rsi14: 58.3,
    macd: 12.4,
    macdSignal: 8.1,
    macdHistogram: 4.3,
    bbUpper: 2705.2,
    bbMiddle: 2610.4,
    bbLower: 2515.6,
    bbPercentB: 0.89,
    atr14: 42.6,
    stochK: 68.2,
    stochD: 61.5,
    adx: 24.8,
    plusDI: 28.4,
    minusDI: 15.2,
    supertrendValue: 2560.1,
    supertrendDirection: 1,
    vwap: 2678.4,
    oi: null,
    liveExtras: { bidQty: 125000, askQty: 98000, orderImbalance: 12.1 },
    ...overrides,
  };
}

export const demoIndicatorTable: IndicatorTableResult = {
  date: new Date().toISOString().split("T")[0],
  universe: "nifty50",
  isToday: true,
  intradayRetentionOk: true,
  includeOI: false,
  totalRequested: 50,
  totalReturned: 8,
  skippedNoData: 0,
  generatedAt: new Date().toISOString(),
  cached: false,
  rows: [
    demoIndicatorRow({
      tradingsymbol: "TRENT", name: "Trent Ltd", close: 2585, priceDelta: 1.77,
      volumeDelta: 140.2, rsi14: 74.5, macd: 28.1, macdSignal: 15.4, macdHistogram: 12.7,
      bbPercentB: 0.98, adx: 34.2, plusDI: 36.1, minusDI: 12.4, stochK: 88.4, stochD: 79.2,
      supertrendDirection: 1, supertrendValue: 2420.5, atr14: 58.2,
      sma20: 2450.1, sma50: 2320.4, sma200: 2180.6, ema20: 2495.3, ema50: 2360.8,
      vwap: 2570.2, liveExtras: { bidQty: 45000, askQty: 18000, orderImbalance: 42.9 },
    }),
    demoIndicatorRow({
      tradingsymbol: "BEL", name: "Bharat Electronics", close: 412.5, priceDelta: 4.43,
      volumeDelta: 210.5, rsi14: 79.8, macd: 6.2, macdSignal: 3.1, macdHistogram: 3.1,
      bbPercentB: 1.05, adx: 41.5, plusDI: 40.2, minusDI: 9.8, stochK: 94.1, stochD: 85.6,
      supertrendDirection: 1, supertrendValue: 375.4, atr14: 9.8,
      sma20: 385.2, sma50: 360.4, sma200: 320.1, ema20: 392.6, ema50: 368.2,
      vwap: 406.8, liveExtras: { bidQty: 890000, askQty: 320000, orderImbalance: 44.2 },
    }),
    demoIndicatorRow({
      tradingsymbol: "RELIANCE",
    }),
    demoIndicatorRow({
      tradingsymbol: "INFY", name: "Infosys Ltd", close: 1685.75, priceDelta: 0.94,
      volumeDelta: 20.1, rsi14: 52.1, macd: 3.2, macdSignal: 4.1, macdHistogram: -0.9,
      bbPercentB: 0.62, adx: 16.2, plusDI: 19.4, minusDI: 18.1, stochK: 48.2, stochD: 51.4,
      supertrendDirection: 1, supertrendValue: 1610.2, atr14: 24.1,
      sma20: 1660.4, sma50: 1625.8, sma200: 1540.2, ema20: 1670.1, ema50: 1635.6,
      vwap: 1680.4, liveExtras: { bidQty: 98000, askQty: 76000, orderImbalance: 12.6 },
    }),
    demoIndicatorRow({
      tradingsymbol: "TCS", name: "Tata Consultancy Services", close: 4120.5, priceDelta: 0.62,
      volumeDelta: -8.4, rsi14: 44.6, macd: -2.1, macdSignal: -0.8, macdHistogram: -1.3,
      bbPercentB: 0.38, adx: 12.4, plusDI: 14.2, minusDI: 18.6, stochK: 32.1, stochD: 38.4,
      supertrendDirection: -1, supertrendValue: 4180.2, atr14: 45.6,
      sma20: 4145.2, sma50: 4180.4, sma200: 4050.1, ema20: 4138.6, ema50: 4165.2,
      vwap: 4115.8, liveExtras: { bidQty: 54000, askQty: 61000, orderImbalance: -6.1 },
    }),
    demoIndicatorRow({
      tradingsymbol: "TATASTEEL", name: "Tata Steel Ltd", close: 168.4, priceDelta: -1.24,
      volumeDelta: 15.2, rsi14: 38.2, macd: -1.8, macdSignal: -1.1, macdHistogram: -0.7,
      bbPercentB: 0.22, adx: 19.6, plusDI: 12.1, minusDI: 24.5, stochK: 21.4, stochD: 26.8,
      supertrendDirection: -1, supertrendValue: 172.6, atr14: 3.2,
      sma20: 170.2, sma50: 165.8, sma200: 158.4, ema20: 169.8, ema50: 166.5,
      vwap: 169.1, liveExtras: { bidQty: 210000, askQty: 265000, orderImbalance: -11.5 },
    }),
    demoIndicatorRow({
      tradingsymbol: "HDFCBANK", name: "HDFC Bank Ltd", close: 1745.2, priceDelta: 0.28,
      volumeDelta: 5.6, rsi14: 55.8, macd: 4.1, macdSignal: 3.8, macdHistogram: 0.3,
      bbPercentB: 0.58, adx: 14.8, plusDI: 17.2, minusDI: 15.9, stochK: 55.6, stochD: 53.2,
      supertrendDirection: 1, supertrendValue: 1690.4, atr14: 18.6,
      sma20: 1720.4, sma50: 1698.2, sma200: 1650.8, ema20: 1728.6, ema50: 1705.4,
      vwap: 1742.6, liveExtras: { bidQty: 145000, askQty: 138000, orderImbalance: 2.5 },
    }),
    demoIndicatorRow({
      tradingsymbol: "ONGC", name: "Oil & Natural Gas Corp", close: 245.6, priceDelta: -0.35,
      volumeDelta: -12.4, rsi14: 41.2, macd: -0.6, macdSignal: -0.2, macdHistogram: -0.4,
      bbPercentB: 0.31, adx: 11.2, plusDI: 13.4, minusDI: 16.8, stochK: 28.6, stochD: 33.1,
      supertrendDirection: -1, supertrendValue: 249.8, atr14: 4.1,
      sma20: 248.2, sma50: 244.6, sma200: 238.1, ema20: 247.4, ema50: 245.8,
      vwap: 246.2, liveExtras: { bidQty: 320000, askQty: 298000, orderImbalance: 3.6 },
    }),
  ],
};

export const demoSMCLeaderboard: SMCLeaderboardResult = {
  date: new Date().toISOString().split("T")[0],
  universe: "nifty50",
  totalRequested: 50,
  totalReturned: 8,
  skipped: 0,
  generatedAt: new Date().toISOString(),
  cached: false,
  rows: [
    { tradingsymbol: "TRENT", name: "Trent Ltd", close: 2585, trend: "up", zone: "deep_discount", zonePositionPct: 24.5, unmitigatedBullishOB: 2, unmitigatedBearishOB: 0, unfilledBullishFVG: 3, unfilledBearishFVG: 0, score: 8.5, verdict: "STRONG BUY", topReason: "Change of Character (bullish reversal) at 2026-06-28" },
    { tradingsymbol: "BEL", name: "Bharat Electronics", close: 412.5, trend: "up", zone: "discount", zonePositionPct: 38.2, unmitigatedBullishOB: 1, unmitigatedBearishOB: 0, unfilledBullishFVG: 2, unfilledBearishFVG: 0, score: 6.5, verdict: "STRONG BUY", topReason: "Market structure is bullish (higher highs & higher lows)" },
    { tradingsymbol: "HDFCBANK", name: "HDFC Bank Ltd", close: 1745.2, trend: "up", zone: "equilibrium", zonePositionPct: 52.1, unmitigatedBullishOB: 1, unmitigatedBearishOB: 0, unfilledBullishFVG: 1, unfilledBearishFVG: 1, score: 3.0, verdict: "BUY", topReason: "Recent Break of Structure (bullish) at 2026-07-02" },
    { tradingsymbol: "RELIANCE", name: "Reliance Industries", close: 2685.3, trend: "up", zone: "premium", zonePositionPct: 61.4, unmitigatedBullishOB: 0, unmitigatedBearishOB: 1, unfilledBullishFVG: 1, unfilledBearishFVG: 1, score: 1.0, verdict: "NEUTRAL", topReason: "Technical indicators (RSI/MACD/Supertrend) lean bullish" },
    { tradingsymbol: "INFY", name: "Infosys Ltd", close: 1685.75, trend: null, zone: "equilibrium", zonePositionPct: 49.8, unmitigatedBullishOB: 0, unmitigatedBearishOB: 0, unfilledBullishFVG: 0, unfilledBearishFVG: 0, score: 0, verdict: "NEUTRAL", topReason: "No strong SMC or indicator signals — setup is mixed" },
    { tradingsymbol: "TCS", name: "Tata Consultancy Services", close: 4120.5, trend: "down", zone: "premium", zonePositionPct: 68.4, unmitigatedBullishOB: 0, unmitigatedBearishOB: 1, unfilledBullishFVG: 0, unfilledBearishFVG: 2, score: -3.5, verdict: "AVOID", topReason: "Market structure is bearish (lower highs & lower lows)" },
    { tradingsymbol: "ONGC", name: "Oil & Natural Gas Corp", close: 245.6, trend: "down", zone: "premium", zonePositionPct: 71.2, unmitigatedBullishOB: 0, unmitigatedBearishOB: 1, unfilledBullishFVG: 0, unfilledBearishFVG: 1, score: -4.5, verdict: "AVOID", topReason: "Price in deep premium zone (71.2% of range) — favourable sell area, risky to buy" },
    { tradingsymbol: "TATASTEEL", name: "Tata Steel Ltd", close: 168.4, trend: "down", zone: "deep_premium", zonePositionPct: 78.6, unmitigatedBullishOB: 0, unmitigatedBearishOB: 2, unfilledBullishFVG: 0, unfilledBearishFVG: 1, score: -7.0, verdict: "STRONG AVOID", topReason: "Change of Character (bearish reversal) at 2026-07-01" },
  ],
};

export const demoSMCAnalysis: SMCAnalysisResult = {
  tradingsymbol: "TRENT",
  name: "Trent Ltd",
  date: new Date().toISOString().split("T")[0],
  close: 2585,
  structure: {
    trend: "up",
    events: [
      { index: 40, date: "2026-06-18", type: "BOS_BEAR", brokenLevel: 2280 },
      { index: 52, date: "2026-06-28", type: "CHOCH_BULL", brokenLevel: 2410 },
      { index: 58, date: "2026-07-04", type: "BOS_BULL", brokenLevel: 2470 },
    ],
    swingHighs: [
      { index: 30, date: "2026-06-05", price: 2460 },
      { index: 52, date: "2026-06-28", price: 2410 },
      { index: 58, date: "2026-07-04", price: 2470 },
    ],
    swingLows: [
      { index: 25, date: "2026-05-30", price: 2280 },
      { index: 45, date: "2026-06-20", price: 2320 },
      { index: 55, date: "2026-07-01", price: 2410 },
    ],
  },
  orderBlocks: [
    { type: "bullish", index: 51, date: "2026-06-27", open: 2420, high: 2428, low: 2395, close: 2400, reason: "Caused CHoCH (reversal)", causedEventType: "CHOCH_BULL", causedBreakAt: "2026-06-28", mitigated: false, mitigatedAt: null },
    { type: "bullish", index: 57, date: "2026-07-03", open: 2450, high: 2460, low: 2432, close: 2438, reason: "Caused BOS (continuation)", causedEventType: "BOS_BULL", causedBreakAt: "2026-07-04", mitigated: false, mitigatedAt: null },
    { type: "bearish", index: 39, date: "2026-06-17", open: 2350, high: 2365, low: 2330, close: 2340, reason: "Caused BOS (continuation)", causedEventType: "BOS_BEAR", causedBreakAt: "2026-06-18", mitigated: true, mitigatedAt: "2026-06-25" },
  ],
  fvgs: [
    { type: "bullish", index: 53, date: "2026-06-29", top: 2455, bottom: 2438, fillPercent: 20, filled: false },
    { type: "bullish", index: 58, date: "2026-07-04", top: 2540, bottom: 2510, fillPercent: 0, filled: false },
    { type: "bearish", index: 37, date: "2026-06-15", top: 2370, bottom: 2340, fillPercent: 100, filled: true },
  ],
  liquidity: [
    { type: "equal_lows", level: 2282, touches: 2, swept: true, sweptAt: "2026-06-27" },
    { type: "equal_highs", level: 2465, touches: 2, swept: false, sweptAt: null },
  ],
  zone: { rangeHigh: 2470, rangeLow: 2280, equilibrium: 2375, positionPct: 24.5, zone: "deep_discount" },
  verdict: {
    score: 8.5,
    verdict: "STRONG BUY",
    reasons: [
      { sign: "positive", text: "Change of Character (bullish reversal) at 2026-06-28" },
      { sign: "positive", text: "Market structure is bullish (higher highs & higher lows)" },
      { sign: "positive", text: "Price near unmitigated bullish Order Block (₹2432.00–₹2460.00)" },
      { sign: "positive", text: "Unfilled bullish Fair Value Gap below (₹2438.00–₹2455.00) acting as support" },
      { sign: "positive", text: "Price in deep discount zone (24.5% of range) — favourable buy area" },
      { sign: "positive", text: "Liquidity sweep below equal lows (₹2282.00) — possible stop-hunt reversal" },
      { sign: "positive", text: "Technical indicators (RSI/MACD/Supertrend) lean bullish" },
    ],
  },
  indicatorSnapshot: {
    rsi14: 74.5,
    macdHistogram: 12.7,
    supertrendDirection: 1,
    sma20: 2450.1,
    sma50: 2320.4,
    sma200: 2180.6,
  },
  stats: {
    lookbackCandles: 400,
    orderBlocks: {
      bullish: { total: 14, wins: 10, losses: 3, pending: 1, winRate: 76.9 },
      bearish: { total: 11, wins: 6, losses: 4, pending: 1, winRate: 60.0 },
    },
    fvgs: {
      bullish: { total: 22, wins: 15, losses: 6, pending: 1, winRate: 71.4 },
      bearish: { total: 19, wins: 9, losses: 8, pending: 2, winRate: 52.9 },
    },
  },
  entryPlan: {
    action: "BUY NOW",
    bias: "bullish",
    entryType: "Retest of unmitigated bullish Order Block",
    entryLow: 2432,
    entryHigh: 2460,
    currentPrice: 2585,
    stopLoss: 2395.75,
    target1: 2470,
    target2: 2542,
    riskPercent: 2.6,
    riskReward: 2.34,
    notes: "Price is already inside the entry zone — can buy at current market price.",
  },
  candles: (() => {
    const out: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
    let price = 2280;
    const start = new Date();
    start.setDate(start.getDate() - 60);
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const drift = i < 40 ? 1.5 : 6.5;
      const noise = Math.sin(i * 0.7) * 8;
      const open = price;
      const close = open + drift + noise * 0.3;
      const high = Math.max(open, close) + Math.abs(noise) * 0.4 + 3;
      const low = Math.min(open, close) - Math.abs(noise) * 0.4 - 3;
      out.push({
        date: d.toISOString().split("T")[0],
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: 1000000 + Math.round(Math.abs(noise) * 100000),
      });
      price = close;
    }
    out[out.length - 1].close = 2585;
    return out;
  })(),
};

function demoMtfCandleSeries(base: number, bars: number, minutesPerBar: number) {
  const out: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  let price = base * 0.985;
  const now = new Date();
  for (let i = 0; i < bars; i++) {
    const t = new Date(now.getTime() - (bars - i) * minutesPerBar * 60000);
    const drift = i > bars - 15 ? 0.35 : 0.05;
    const noise = Math.sin(i * 0.6) * (base * 0.0015);
    const open = price;
    const close = open + drift + noise * 0.3;
    const high = Math.max(open, close) + Math.abs(noise) * 0.5;
    const low = Math.min(open, close) - Math.abs(noise) * 0.5;
    out.push({
      date: t.toISOString(),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: 50000 + Math.round(Math.abs(noise) * 20000),
    });
    price = close;
  }
  out[out.length - 1].close = base;
  return out;
}

export const demoMTFLeaderboard: MTFLeaderboardResult = {
  interval: "15minute",
  universe: "nifty50",
  lookbackDays: 10,
  totalRequested: 50,
  totalReturned: 8,
  skipped: 0,
  generatedAt: new Date().toISOString(),
  cached: false,
  rows: [
    { tradingsymbol: "BEL", name: "Bharat Electronics", close: 412.5, lastCandleTime: new Date().toISOString(), trend: "up", zone: "discount", action: "BUY NOW", bias: "bullish", entryLow: 408, entryHigh: 413, proximityPct: 0, score: 7.5, verdict: "STRONG BUY", topReason: "Price near unmitigated bullish Order Block" },
    { tradingsymbol: "TRENT", name: "Trent Ltd", close: 2585, lastCandleTime: new Date().toISOString(), trend: "up", zone: "discount", action: "WAIT FOR RETEST", bias: "bullish", entryLow: 2560, entryHigh: 2572, proximityPct: 0.5, score: 5.5, verdict: "BUY", topReason: "Market structure is bullish" },
    { tradingsymbol: "HDFCBANK", name: "HDFC Bank Ltd", close: 1745.2, lastCandleTime: new Date().toISOString(), trend: "up", zone: "equilibrium", action: "WAIT FOR RETEST", bias: "bullish", entryLow: 1725, entryHigh: 1738, proximityPct: 1.2, score: 3.0, verdict: "BUY", topReason: "Recent Break of Structure (bullish)" },
    { tradingsymbol: "RELIANCE", name: "Reliance Industries", close: 2685.3, lastCandleTime: new Date().toISOString(), trend: "up", zone: "equilibrium", action: "WAIT FOR RETEST", bias: "bullish", entryLow: 2645, entryHigh: 2665, proximityPct: 2.8, score: 2.5, verdict: "BUY", topReason: "Technical indicators lean bullish" },
    { tradingsymbol: "INFY", name: "Infosys Ltd", close: 1685.75, lastCandleTime: new Date().toISOString(), trend: null, zone: "equilibrium", action: "WAIT", bias: "neutral", entryLow: null, entryHigh: null, proximityPct: null, score: 0, verdict: "NEUTRAL", topReason: null },
    { tradingsymbol: "TCS", name: "Tata Consultancy Services", close: 4120.5, lastCandleTime: new Date().toISOString(), trend: "down", zone: "premium", action: "AVOID BUYING", bias: "bearish", entryLow: null, entryHigh: null, proximityPct: null, score: -3.0, verdict: "AVOID", topReason: "Market structure is bearish" },
    { tradingsymbol: "ONGC", name: "Oil & Natural Gas Corp", close: 245.6, lastCandleTime: new Date().toISOString(), trend: "down", zone: "premium", action: "AVOID BUYING", bias: "bearish", entryLow: null, entryHigh: null, proximityPct: null, score: -4.0, verdict: "AVOID", topReason: "Price in premium zone" },
    { tradingsymbol: "TATASTEEL", name: "Tata Steel Ltd", close: 168.4, lastCandleTime: new Date().toISOString(), trend: "down", zone: "deep_premium", action: "AVOID BUYING", bias: "bearish", entryLow: null, entryHigh: null, proximityPct: null, score: -6.5, verdict: "STRONG AVOID", topReason: "Change of Character (bearish reversal)" },
  ],
};

export const demoMTFAnalysis: MTFAnalysisResult = {
  tradingsymbol: "BEL",
  name: "Bharat Electronics",
  interval: "15minute",
  date: new Date().toISOString(),
  close: 412.5,
  structure: {
    trend: "up",
    events: [
      { index: 40, date: new Date(Date.now() - 5 * 3600000).toISOString(), type: "BOS_BEAR", brokenLevel: 402 },
      { index: 55, date: new Date(Date.now() - 2 * 3600000).toISOString(), type: "CHOCH_BULL", brokenLevel: 408 },
      { index: 68, date: new Date(Date.now() - 45 * 60000).toISOString(), type: "BOS_BULL", brokenLevel: 411 },
    ],
    swingHighs: [
      { index: 30, date: new Date(Date.now() - 7 * 3600000).toISOString(), price: 410 },
      { index: 55, date: new Date(Date.now() - 2 * 3600000).toISOString(), price: 408 },
      { index: 68, date: new Date(Date.now() - 45 * 60000).toISOString(), price: 411 },
    ],
    swingLows: [
      { index: 25, date: new Date(Date.now() - 8 * 3600000).toISOString(), price: 400 },
      { index: 45, date: new Date(Date.now() - 4 * 3600000).toISOString(), price: 402 },
      { index: 60, date: new Date(Date.now() - 1.5 * 3600000).toISOString(), price: 407 },
    ],
  },
  orderBlocks: [
    { type: "bullish", index: 54, date: new Date(Date.now() - 2.2 * 3600000).toISOString(), open: 406, high: 408, low: 404.5, close: 405, reason: "Caused CHoCH (reversal)", causedEventType: "CHOCH_BULL", causedBreakAt: new Date(Date.now() - 2 * 3600000).toISOString(), mitigated: false, mitigatedAt: null },
    { type: "bearish", index: 39, date: new Date(Date.now() - 5.2 * 3600000).toISOString(), open: 404, high: 405.5, low: 402.5, close: 403, reason: "Caused BOS (continuation)", causedEventType: "BOS_BEAR", causedBreakAt: new Date(Date.now() - 5 * 3600000).toISOString(), mitigated: true, mitigatedAt: new Date(Date.now() - 3 * 3600000).toISOString() },
  ],
  fvgs: [
    { type: "bullish", index: 56, date: new Date(Date.now() - 1.9 * 3600000).toISOString(), top: 409, bottom: 407, fillPercent: 15, filled: false },
  ],
  liquidity: [
    { type: "equal_lows", level: 401.8, touches: 2, swept: true, sweptAt: new Date(Date.now() - 4.5 * 3600000).toISOString() },
  ],
  zone: { rangeHigh: 411, rangeLow: 400, equilibrium: 405.5, positionPct: 38.2, zone: "discount" },
  verdict: {
    score: 7.5,
    verdict: "STRONG BUY",
    reasons: [
      { sign: "positive", text: "Change of Character (bullish reversal)" },
      { sign: "positive", text: "Market structure is bullish (higher highs & higher lows)" },
      { sign: "positive", text: "Price near unmitigated bullish Order Block (₹404.50–₹408.00)" },
      { sign: "positive", text: "Unfilled bullish Fair Value Gap below (₹407.00–₹409.00) acting as support" },
      { sign: "positive", text: "Price in discount zone (38.2% of range)" },
      { sign: "positive", text: "Liquidity sweep below equal lows (₹401.80) — possible stop-hunt reversal" },
    ],
  },
  entryPlan: {
    action: "BUY NOW",
    bias: "bullish",
    entryType: "Retest of unmitigated bullish Order Block",
    entryLow: 404.5,
    entryHigh: 408,
    currentPrice: 412.5,
    stopLoss: 398.43,
    target1: 411,
    target2: 415.5,
    riskPercent: 2.36,
    riskReward: 3.15,
    notes: "Price is already inside the entry zone — can buy at current market price.",
  },
  proximityPct: 0,
  candles: demoMtfCandleSeries(412.5, 100, 15),
};

export const demoBacktest: BacktestResult = (() => {
  const signalTypes: ("Order Block" | "Fair Value Gap")[] = ["Order Block", "Fair Value Gap"];
  const exitReasons: import("../types/backtest").ExitReason[] = ["TARGET_HIT", "STOP_LOSS", "TARGET_HIT", "TARGET_HIT", "STOP_LOSS"];
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 6);

  const trades: import("../types/backtest").BacktestTrade[] = [];
  let price = 780;
  const totalTrades = 24;

  for (let i = 0; i < totalTrades; i++) {
    const entryDate = new Date(start.getTime() + (i / totalTrades) * (now.getTime() - start.getTime()));
    const direction: "bullish" | "bearish" = i % 3 === 0 ? "bearish" : "bullish";
    const signalType = signalTypes[i % 2];
    const exitReason = exitReasons[i % exitReasons.length];
    const entryPrice = Math.round(price * 100) / 100;

    const isWin = exitReason === "TARGET_HIT";
    const pnlPct = direction === "bullish"
      ? (isWin ? 2.3 + Math.random() * 0.6 : -(1.2 + Math.random() * 0.5))
      : (isWin ? 2.1 + Math.random() * 0.5 : -(1.3 + Math.random() * 0.4));

    const stopLoss = direction === "bullish" ? entryPrice * 0.985 : entryPrice * 1.015;
    const target = direction === "bullish" ? entryPrice * 1.025 : entryPrice * 0.975;
    const exitPrice = Math.round(entryPrice * (1 + (direction === "bullish" ? pnlPct : -pnlPct) / 100) * 100) / 100;
    const exitDate = new Date(entryDate.getTime() + (2 + (i % 5)) * 24 * 3600000);

    trades.push({
      signalType,
      direction,
      entryDate: entryDate.toISOString(),
      entryPrice,
      stopLoss: Math.round(stopLoss * 100) / 100,
      target: Math.round(target * 100) / 100,
      exitDate: exitDate.toISOString(),
      exitPrice,
      exitReason,
      pnlPct: Math.round(pnlPct * 100) / 100,
      barsHeld: 2 + (i % 5),
    });

    price = price * (1 + (direction === "bullish" ? 0.004 : -0.001));
  }

  const summarize = (list: import("../types/backtest").BacktestTrade[]): import("../types/backtest").BacktestSummary => {
    const wins = list.filter((t) => t.pnlPct > 0);
    const losses = list.filter((t) => t.pnlPct <= 0);
    const grossProfit = wins.reduce((s, t) => s + t.pnlPct, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPct, 0));
    let cumulative = 0, peak = 0, maxDD = 0;
    const equityCurve = list.map((t) => {
      cumulative += t.pnlPct;
      peak = Math.max(peak, cumulative);
      maxDD = Math.max(maxDD, peak - cumulative);
      return { date: t.exitDate, cumulativePnlPct: Math.round(cumulative * 100) / 100 };
    });
    const best = list.reduce((a, b) => (a && a.pnlPct > b.pnlPct ? a : b), list[0] || null);
    const worst = list.reduce((a, b) => (a && a.pnlPct < b.pnlPct ? a : b), list[0] || null);
    return {
      totalTrades: list.length,
      wins: wins.length,
      losses: losses.length,
      winRate: list.length ? Math.round((wins.length / list.length) * 1000) / 10 : null,
      avgWinPct: wins.length ? Math.round((grossProfit / wins.length) * 100) / 100 : null,
      avgLossPct: losses.length ? Math.round((-grossLoss / losses.length) * 100) / 100 : null,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : null,
      totalPnlPct: Math.round(list.reduce((s, t) => s + t.pnlPct, 0) * 100) / 100,
      maxDrawdownPct: Math.round(maxDD * 100) / 100,
      bestTrade: best,
      worstTrade: worst,
      equityCurve,
    };
  };

  return {
    tradingsymbol: "SBIN",
    name: "State Bank of India",
    interval: "day",
    monthsRequested: 6,
    truncatedToRetentionLimit: false,
    candleCount: 128,
    periodFrom: start.toISOString(),
    periodTo: now.toISOString(),
    trades,
    summary: summarize(trades),
    orderBlockSummary: summarize(trades.filter((t) => t.signalType === "Order Block")),
    fvgSummary: summarize(trades.filter((t) => t.signalType === "Fair Value Gap")),
  };
})();
