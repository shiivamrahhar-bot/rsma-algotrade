import type {
  EntryPlan,
  FairValueGap,
  LiquidityPool,
  MarketStructure,
  OrderBlock,
  PremiumDiscountZone,
  SMCCandle,
  Verdict,
} from "./smc";

export type MTFInterval = "5minute" | "15minute" | "60minute";

export interface MTFLeaderboardRow {
  tradingsymbol: string;
  name: string;
  close: number;
  lastCandleTime: string;
  trend: "up" | "down" | null;
  zone: string | null;
  action: "BUY NOW" | "WAIT FOR RETEST" | "AVOID BUYING" | "WAIT";
  bias: "bullish" | "bearish" | "neutral";
  entryLow: number | null;
  entryHigh: number | null;
  proximityPct: number | null;
  score: number;
  verdict: string;
  topReason: string | null;
}

export interface MTFLeaderboardResult {
  interval: MTFInterval;
  universe: string;
  lookbackDays: number;
  totalRequested: number;
  totalReturned: number;
  skipped: number;
  generatedAt: string;
  rows: MTFLeaderboardRow[];
  cached: boolean;
}

export interface MTFAnalysisResult {
  tradingsymbol: string;
  name: string;
  interval: MTFInterval;
  date: string;
  close: number;
  structure: MarketStructure;
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  liquidity: LiquidityPool[];
  zone: PremiumDiscountZone | null;
  verdict: Verdict;
  entryPlan: EntryPlan;
  proximityPct: number | null;
  candles: SMCCandle[];
}
