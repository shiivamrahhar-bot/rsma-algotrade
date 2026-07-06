import {
  Activity,
  BarChart3,
  Briefcase,
  CandlestickChart,
  FlaskConical,
  Flame,
  Gauge,
  LayoutDashboard,
  Layers,
  LineChart,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { DashboardTab } from "./types/kite";

export const NAV_ITEMS: {
  id: DashboardTab;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "momentum", label: "Momentum Scanner", icon: Flame },
  { id: "indicators", label: "Indicator Explorer", icon: Gauge },
  { id: "smc", label: "Smart Money (SMC)", icon: Layers },
  { id: "mtf", label: "Live Entries (MTF)", icon: Timer },
  { id: "backtest", label: "Backtest Studio", icon: FlaskConical },
  { id: "holdings", label: "Holdings", icon: Briefcase },
  { id: "positions", label: "Positions", icon: TrendingUp },
  { id: "orders", label: "Orders", icon: Activity },
  { id: "trades", label: "Trades", icon: BarChart3 },
  { id: "quotes", label: "Live Quotes", icon: LineChart },
];

export const API_FEATURES = [
  {
    icon: Wallet,
    title: "User Profile & Margins",
    desc: "Account details, available cash, collateral, utilised margin (equity + commodity)",
  },
  {
    icon: Briefcase,
    title: "Holdings",
    desc: "Long-term equity delivery stocks with P&L, day change, average price",
  },
  {
    icon: TrendingUp,
    title: "Positions",
    desc: "Intraday & F&O positions — net and day snapshots with M2M P&L",
  },
  {
    icon: Activity,
    title: "Orders",
    desc: "Today's order book — open, pending, complete, cancelled orders",
  },
  {
    icon: BarChart3,
    title: "Trades",
    desc: "All executed trades for the day with fill price and timestamp",
  },
  {
    icon: LineChart,
    title: "Live Quotes",
    desc: "LTP, OHLC, volume, circuit limits for NSE/BSE instruments",
  },
  {
    icon: CandlestickChart,
    title: "Historical Data",
    desc: "OHLCV candles (minute/day) — backend ready, chart UI coming soon",
  },
];
