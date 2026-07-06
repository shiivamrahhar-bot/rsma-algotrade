export interface MomentumAlert {
  id: string;
  tradingsymbol: string;
  name: string;
  /** Market time when momentum first triggered (from 5min candle analysis) */
  triggeredAt: string;
  /** When our scanner first detected it */
  scannerDetectedAt: string;
  triggerPrice: number;
  signal: string;
  momentumScore: number;
  dayChange: number;
  intradayChange: number;
  ltp: number;
  volumeSurge: number;
  gainSinceTrigger?: number;
  read: boolean;
  orderPlaced?: boolean;
}

export interface PlaceOrderRequest {
  tradingsymbol: string;
  exchange: string;
  transaction_type: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
  quantity: number;
  product: "CNC" | "MIS" | "NRML";
  price?: number;
  trigger_price?: number;
}

export interface PlaceOrderResponse {
  order_id: string;
  message?: string;
}
