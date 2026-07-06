export type SMCZoneType = "bullish" | "bearish";

export interface OrderBlock {
  type: SMCZoneType;
  index: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  reason: string;
  causedEventType: string;
  causedBreakAt: string;
  mitigated: boolean;
  mitigatedAt: string | null;
}

export interface FairValueGap {
  type: SMCZoneType;
  index: number;
  date: string;
  top: number;
  bottom: number;
  fillPercent: number;
  filled: boolean;
}

export interface LiquidityPool {
  type: "equal_highs" | "equal_lows";
  level: number;
  touches: number;
  swept: boolean;
  sweptAt: string | null;
}

export interface PremiumDiscountZone {
  rangeHigh: number;
  rangeLow: number;
  equilibrium: number;
  positionPct: number;
  zone: "deep_discount" | "discount" | "equilibrium" | "premium" | "deep_premium";
}

export interface StructureEvent {
  index: number;
  date: string;
  type: "BOS_BULL" | "BOS_BEAR" | "CHOCH_BULL" | "CHOCH_BEAR";
  brokenLevel: number;
}

export interface SwingPoint {
  index: number;
  date: string;
  price: number;
}

export interface MarketStructure {
  trend: "up" | "down" | null;
  events: StructureEvent[];
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
}

export interface VerdictReason {
  sign: "positive" | "negative" | "neutral";
  text: string;
}

export interface Verdict {
  score: number;
  verdict: "STRONG BUY" | "BUY" | "NEUTRAL" | "AVOID" | "STRONG AVOID";
  reasons: VerdictReason[];
}

export interface BacktestResult {
  total: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number | null;
}

export interface SMCStats {
  lookbackCandles: number;
  orderBlocks: { bullish: BacktestResult; bearish: BacktestResult };
  fvgs: { bullish: BacktestResult; bearish: BacktestResult };
}

export interface IndicatorSnapshotLite {
  rsi14: number | null;
  macdHistogram: number | null;
  supertrendDirection: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
}

export interface EntryPlan {
  action: "BUY NOW" | "WAIT FOR RETEST" | "AVOID BUYING" | "WAIT";
  bias: "bullish" | "bearish" | "neutral";
  entryType?: string;
  entryLow?: number;
  entryHigh?: number;
  currentPrice: number;
  stopLoss?: number;
  target1?: number;
  target2?: number;
  riskPercent?: number;
  riskReward?: number | null;
  watchLevel?: number;
  notes: string;
}

export interface SMCCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMCAnalysisResult {
  tradingsymbol: string;
  name: string;
  date: string;
  close: number;
  structure: MarketStructure;
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  liquidity: LiquidityPool[];
  zone: PremiumDiscountZone | null;
  verdict: Verdict;
  entryPlan: EntryPlan;
  indicatorSnapshot: IndicatorSnapshotLite | null;
  stats: SMCStats | null;
  candles: SMCCandle[];
}

export interface SMCLeaderboardRow {
  tradingsymbol: string;
  name: string;
  close: number;
  trend: "up" | "down" | null;
  zone: string | null;
  zonePositionPct: number | null;
  unmitigatedBullishOB: number;
  unmitigatedBearishOB: number;
  unfilledBullishFVG: number;
  unfilledBearishFVG: number;
  score: number;
  verdict: string;
  topReason: string | null;
}

export interface SMCLeaderboardResult {
  date: string;
  universe: string;
  totalRequested: number;
  totalReturned: number;
  skipped: number;
  generatedAt: string;
  rows: SMCLeaderboardRow[];
  cached: boolean;
}
