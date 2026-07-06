export interface LiveDepthExtras {
  bidQty: number;
  askQty: number;
  orderImbalance: number;
}

export interface OpenInterestInfo {
  contract: string;
  expiry: string;
  oi: number | null;
  oiChange: number | null;
}

export interface IndicatorRow {
  tradingsymbol: string;
  name: string;
  date: string;
  close: number;
  priceDelta: number;
  volume: number;
  avgVolume20: number | null;
  volumeDelta: number | null;

  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  ema50: number | null;

  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;

  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  bbPercentB: number | null;

  atr14: number | null;
  stochK: number | null;
  stochD: number | null;
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;

  supertrendValue: number | null;
  supertrendDirection: number | null;

  vwap: number | null;
  oi: OpenInterestInfo | null;
  liveExtras: LiveDepthExtras | null;
}

export interface IndicatorTableResult {
  date: string;
  universe: string;
  isToday: boolean;
  intradayRetentionOk: boolean;
  includeOI: boolean;
  totalRequested: number;
  totalReturned: number;
  skippedNoData: number;
  generatedAt: string;
  rows: IndicatorRow[];
  cached: boolean;
}

export type IndicatorColumnGroup = "trend" | "momentum" | "volatility" | "volume";
