export interface UserProfile {
  user_id: string;
  user_name: string;
  email: string;
  user_type: string;
  broker: string;
  exchanges: string[];
  products: string[];
  order_types: string[];
}

export interface Margins {
  equity: MarginSegment;
  commodity: MarginSegment;
}

export interface MarginSegment {
  enabled: boolean;
  net: number;
  available: {
    adhoc_margin: number;
    cash: number;
    opening_balance: number;
    live_balance: number;
    collateral: number;
    intraday_payin: number;
  };
  utilised: {
    debits: number;
    exposure: number;
    m2m_realised: number;
    m2m_unrealised: number;
    option_premium: number;
    payout: number;
    span: number;
    holding_sales: number;
    turnover: number;
  };
}

export interface Holding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
  product: string;
  collateral_quantity: number;
  collateral_type: string;
  t1_quantity: number;
}

export interface Position {
  tradingsymbol: string;
  exchange: string;
  instrument_token: number;
  product: string;
  quantity: number;
  overnight_quantity: number;
  multiplier: number;
  average_price: number;
  close_price: number;
  last_price: number;
  value: number;
  pnl: number;
  m2m: number;
  unrealised: number;
  realised: number;
  buy_quantity: number;
  sell_quantity: number;
  buy_price: number;
  sell_price: number;
  buy_value: number;
  sell_value: number;
}

export interface Positions {
  net: Position[];
  day: Position[];
}

export interface Order {
  order_id: string;
  parent_order_id: string | null;
  exchange_order_id: string | null;
  placed_by: string;
  variety: string;
  status: string;
  status_message: string | null;
  order_timestamp: string;
  exchange: string;
  tradingsymbol: string;
  instrument_token: number;
  transaction_type: string;
  order_type: string;
  product: string;
  quantity: number;
  filled_quantity: number;
  pending_quantity: number;
  cancelled_quantity: number;
  price: number;
  trigger_price: number;
  average_price: number;
}

export interface Trade {
  trade_id: string;
  order_id: string;
  exchange: string;
  tradingsymbol: string;
  instrument_token: number;
  product: string;
  average_price: number;
  quantity: number;
  fill_timestamp: string;
  exchange_timestamp: string;
  transaction_type: string;
}

export interface Quote {
  instrument_token: number;
  timestamp: string;
  last_price: number;
  last_quantity: number;
  buy_quantity: number;
  sell_quantity: number;
  volume: number;
  average_price: number;
  oi: number;
  oi_day_high: number;
  oi_day_low: number;
  net_change: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  depth: {
    buy: { price: number; quantity: number; orders: number }[];
    sell: { price: number; quantity: number; orders: number }[];
  };
}

export type DashboardTab =
  | "overview"
  | "momentum"
  | "indicators"
  | "smc"
  | "mtf"
  | "backtest"
  | "holdings"
  | "positions"
  | "orders"
  | "trades"
  | "quotes";
