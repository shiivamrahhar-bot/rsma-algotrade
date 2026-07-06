export type BacktestInterval = "day" | "60minute" | "15minute" | "5minute";

export type ExitReason = "TARGET_HIT" | "STOP_LOSS" | "TIME_EXIT" | "END_OF_DATA";

export interface BacktestTrade {
  signalType: "Order Block" | "Fair Value Gap";
  direction: "bullish" | "bearish";
  entryDate: string;
  entryPrice: number;
  stopLoss: number;
  target: number;
  exitDate: string;
  exitPrice: number;
  exitReason: ExitReason;
  pnlPct: number;
  barsHeld: number;
}

export interface EquityPoint {
  date: string;
  cumulativePnlPct: number;
}

export interface BacktestSummary {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgWinPct: number | null;
  avgLossPct: number | null;
  profitFactor: number | null;
  totalPnlPct: number;
  maxDrawdownPct: number;
  bestTrade: BacktestTrade | null;
  worstTrade: BacktestTrade | null;
  equityCurve: EquityPoint[];
}

export interface BacktestResult {
  tradingsymbol: string;
  name: string;
  interval: BacktestInterval;
  monthsRequested: number;
  truncatedToRetentionLimit: boolean;
  candleCount: number;
  periodFrom: string;
  periodTo: string;
  trades: BacktestTrade[];
  summary: BacktestSummary;
  orderBlockSummary: BacktestSummary;
  fvgSummary: BacktestSummary;
}
