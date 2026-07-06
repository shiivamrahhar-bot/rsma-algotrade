export interface MomentumStock {
  tradingsymbol: string;
  name: string;
  instrument_token: number;
  exchange: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  dayChange: number;
  intradayChange: number;
  gapPercent: number;
  momentum5d: number;
  momentum10d: number;
  momentum20d: number;
  volumeSurge: number;
  acceleration: number;
  high20d: number;
  low20d: number;
  distFromHigh20d: number;
  distFromLow20d: number;
  avgVolume20d: number;
  momentumScore: number;
  suddenMomentum: boolean;
  strongMomentum: boolean;
  signal: string;
  upperCircuit: number;
  lowerCircuit: number;
  buyQty: number;
  sellQty: number;
  recentCandles: Candle[];
  triggeredAt?: string | null;
  triggerPrice?: number | null;
  triggerDayChange?: number | null;
  triggerVolumeSurge?: number | null;
  triggerIntradayChange?: number | null;
  gainSinceTrigger?: number | null;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MomentumScanResult {
  scannedAt: string;
  universe: string;
  totalScanned: number;
  suddenCount: number;
  stocks: MomentumStock[];
  cached: boolean;
}

export interface MomentumDetail extends MomentumStock {
  candles: Candle[];
  intradayCandles?: Candle[];
  buyChecklist: {
    priceAboveOpen: boolean;
    volumeSurge: boolean;
    positive5d: boolean;
    positive10d: boolean;
    notAtCircuit: boolean;
    momentumAccelerating: boolean;
  };
}

export type MomentumUniverse = "nifty50" | "fno" | "nse_all";

export interface TriggerLogEntry {
  tradingsymbol: string;
  name: string;
  triggeredAt: string;
  triggerPrice: number;
  triggerDayChange: number;
  triggerVolumeSurge: number;
  currentPrice: number;
  gainSinceTrigger: number;
  signal: string;
  momentumScore: number;
}

export interface TriggerLogResult {
  date: string;
  market: string;
  triggers: TriggerLogEntry[];
  scannedAt: string;
}
