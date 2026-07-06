import { useCallback, useEffect, useState } from "react";
import { api, demoData } from "../api/client";
import { DataTable, LoadingSpinner, StatCard } from "../components/ui";
import AlertSidePanel from "../components/AlertSidePanel";
import MomentumScanner from "../components/MomentumScanner";
import IndicatorTable from "../components/IndicatorTable";
import SMCAnalysis from "../components/SMCAnalysis";
import MultiTimeframeScanner from "../components/MultiTimeframeScanner";
import BacktestStudio from "../components/BacktestStudio";
import { AlertProvider, useAlerts } from "../context/AlertContext";
import type {
  Holding,
  Margins,
  Order,
  Positions,
  Quote,
  Trade,
  UserProfile,
  DashboardTab,
} from "../types/kite";
import type { MomentumAlert } from "../types/alerts";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatTime,
  pnlClass,
  statusClass,
} from "../utils/format";
import { NAV_ITEMS } from "../constants";
import {
  LogOut,
  RefreshCw,
  User,
  Zap,
} from "lucide-react";

interface DashboardProps {
  demoMode?: boolean;
}

export default function Dashboard({ demoMode = false }: DashboardProps) {
  const [watchEnabled, setWatchEnabled] = useState(demoMode);

  return (
    <AlertProvider
      demoMode={demoMode}
      watchEnabled={watchEnabled}
      setWatchEnabled={setWatchEnabled}
    >
      <DashboardContent demoMode={demoMode} />
    </AlertProvider>
  );
}

function DashboardContent({ demoMode = false }: DashboardProps) {
  const {
    alerts,
    unreadCount,
    watching,
    lastCheck,
    notificationsEnabled,
    requestNotifications,
    markRead,
    markAllRead,
    alertPanelOpen,
    setAlertPanelOpen,
    openStock,
    setPendingTrade,
  } = useAlerts();

  const [tab, setTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(!demoMode);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(
    demoMode ? demoData.profile : null
  );
  const [margins, setMargins] = useState<Margins | null>(
    demoMode ? demoData.margins : null
  );
  const [holdings, setHoldings] = useState<Holding[]>(
    demoMode ? demoData.holdings : []
  );
  const [positions, setPositions] = useState<Positions | null>(
    demoMode ? demoData.positions : null
  );
  const [orders, setOrders] = useState<Order[]>(demoMode ? demoData.orders : []);
  const [trades, setTrades] = useState<Trade[]>(demoMode ? demoData.trades : []);
  const [quotes, setQuotes] = useState<Record<string, Quote>>(
    demoMode ? demoData.quotes : {}
  );

  const loadData = useCallback(async (silent = false) => {
    if (demoMode) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [p, m, h, pos, o, t] = await Promise.all([
        api.profile(),
        api.margins(),
        api.holdings(),
        api.positions(),
        api.orders(),
        api.trades(),
      ]);

      setProfile(p);
      setMargins(m);
      setHoldings(h);
      setPositions(pos);
      setOrders(o);
      setTrades(t);

      const symbols = [
        "NSE:NIFTY 50",
        "NSE:BANKNIFTY",
        ...h.slice(0, 5).map((x) => `${x.exchange}:${x.tradingsymbol}`),
      ];
      if (symbols.length > 0) {
        const q = await api.quote([...new Set(symbols)]);
        setQuotes(q);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    if (!demoMode) await api.logout();
    window.location.href = "/login";
  };

  const totalHoldingsPnl = holdings.reduce((s, h) => s + h.pnl, 0);
  const totalHoldingsValue = holdings.reduce(
    (s, h) => s + h.last_price * h.quantity,
    0
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Zap size={22} />
          </div>
          <div>
            <div className="brand-name">RSMA AlgoTrade</div>
            <div className="brand-sub">Kite Connect Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {demoMode && <span className="demo-badge">Demo Mode</span>}
          <button className="nav-item logout" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{NAV_ITEMS.find((n) => n.id === tab)?.label}</h1>
            <p className="topbar-sub">
              {profile?.user_name} · {profile?.user_id} · {profile?.broker}
            </p>
          </div>
          <div className="topbar-actions">
            <button
              className="btn-icon"
              onClick={() => loadData(true)}
              disabled={refreshing || demoMode}
              title="Refresh"
            >
              <RefreshCw size={18} className={refreshing ? "spin" : ""} />
            </button>
            <div className="user-chip">
              <User size={16} />
              {profile?.user_id}
            </div>
          </div>
        </header>

        {error && tab !== "momentum" && <div className="error-banner">{error}</div>}

        {tab === "momentum" && <MomentumScanner demoMode={demoMode} />}

        {tab === "indicators" && <IndicatorTable demoMode={demoMode} />}

        {tab === "smc" && <SMCAnalysis demoMode={demoMode} />}

        {tab === "mtf" && <MultiTimeframeScanner demoMode={demoMode} />}

        {tab === "backtest" && <BacktestStudio demoMode={demoMode} />}

        {tab === "overview" && margins && (
          <OverviewPanel
            margins={margins}
            holdingsCount={holdings.length}
            ordersCount={orders.length}
            totalPnl={totalHoldingsPnl}
            totalValue={totalHoldingsValue}
            profile={profile}
          />
        )}

        {tab === "holdings" && (
          <HoldingsPanel holdings={holdings} totalPnl={totalHoldingsPnl} />
        )}

        {tab === "positions" && positions && (
          <PositionsPanel positions={positions} />
        )}

        {tab === "orders" && <OrdersPanel orders={orders} />}

        {tab === "trades" && <TradesPanel trades={trades} />}

        {tab === "quotes" && <QuotesPanel quotes={quotes} />}
      </main>

      <AlertSidePanel
        open={alertPanelOpen}
        onToggle={() => setAlertPanelOpen(!alertPanelOpen)}
        alerts={alerts}
        unreadCount={unreadCount}
        watching={watching}
        lastCheck={lastCheck}
        notificationsEnabled={notificationsEnabled}
        onEnableNotifications={requestNotifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onAlertClick={(a: MomentumAlert) => {
          setTab("momentum");
          openStock(a.tradingsymbol);
        }}
        onTrade={(a: MomentumAlert) => {
          setTab("momentum");
          setPendingTrade(a);
        }}
      />
    </div>
  );
}

function OverviewPanel({
  margins,
  holdingsCount,
  ordersCount,
  totalPnl,
  totalValue,
  profile,
}: {
  margins: Margins;
  holdingsCount: number;
  ordersCount: number;
  totalPnl: number;
  totalValue: number;
  profile: UserProfile | null;
}) {
  const eq = margins.equity;
  return (
    <div className="panel-grid">
      <div className="stats-row">
        <StatCard
          label="Available Cash (Equity)"
          value={formatCurrency(eq.available.live_balance)}
          sub={`Opening: ${formatCurrency(eq.available.opening_balance)}`}
          trend="neutral"
        />
        <StatCard
          label="Net Margin"
          value={formatCurrency(eq.net)}
          sub={`Collateral: ${formatCurrency(eq.available.collateral)}`}
        />
        <StatCard
          label="Holdings Value"
          value={formatCurrency(totalValue)}
          sub={`${holdingsCount} stocks`}
        />
        <StatCard
          label="Holdings P&L"
          value={formatCurrency(totalPnl)}
          trend={totalPnl >= 0 ? "up" : "down"}
        />
      </div>

      <div className="two-col">
        <div className="card">
          <h3>Margin Utilisation — Equity</h3>
          <div className="margin-bars">
            <MarginBar
              label="M2M Unrealised"
              value={eq.utilised.m2m_unrealised}
              total={eq.net}
            />
            <MarginBar
              label="Exposure"
              value={eq.utilised.exposure}
              total={eq.net}
            />
            <MarginBar label="SPAN" value={eq.utilised.span} total={eq.net} />
            <MarginBar
              label="Debits"
              value={eq.utilised.debits}
              total={eq.net}
            />
          </div>
        </div>

        <div className="card">
          <h3>Account Info</h3>
          <dl className="info-list">
            <div>
              <dt>User ID</dt>
              <dd>{profile?.user_id}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile?.email}</dd>
            </div>
            <div>
              <dt>Exchanges</dt>
              <dd>{profile?.exchanges?.join(", ")}</dd>
            </div>
            <div>
              <dt>Products</dt>
              <dd>{profile?.products?.join(", ")}</dd>
            </div>
            <div>
              <dt>Today's Orders</dt>
              <dd>{ordersCount}</dd>
            </div>
            <div>
              <dt>Commodity Net</dt>
              <dd>{formatCurrency(margins.commodity.net)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function MarginBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min((Math.abs(value) / total) * 100, 100) : 0;
  return (
    <div className="margin-bar">
      <div className="margin-bar-label">
        <span>{label}</span>
        <span>{formatCurrency(value)}</span>
      </div>
      <div className="margin-bar-track">
        <div className="margin-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HoldingsPanel({
  holdings,
  totalPnl,
}: {
  holdings: Holding[];
  totalPnl: number;
}) {
  const rows = holdings.map((h) => ({
    symbol: (
      <span className="symbol-cell">
        <strong>{h.tradingsymbol}</strong>
        <small>{h.exchange}</small>
      </span>
    ),
    qty: h.quantity,
    avg: formatCurrency(h.average_price),
    ltp: formatCurrency(h.last_price),
    pnl: <span className={pnlClass(h.pnl)}>{formatCurrency(h.pnl)}</span>,
    day: (
      <span className={pnlClass(h.day_change)}>
        {formatPercent(h.day_change_percentage)}
      </span>
    ),
  }));

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Equity Holdings</h2>
        <span className={`total-pnl ${pnlClass(totalPnl)}`}>
          Total P&L: {formatCurrency(totalPnl)}
        </span>
      </div>
      <DataTable
        columns={[
          { key: "symbol", label: "Symbol" },
          { key: "qty", label: "Qty", align: "right" },
          { key: "avg", label: "Avg Price", align: "right" },
          { key: "ltp", label: "LTP", align: "right" },
          { key: "pnl", label: "P&L", align: "right" },
          { key: "day", label: "Day %", align: "right" },
        ]}
        rows={rows}
        emptyMessage="No holdings in your demat account"
      />
    </div>
  );
}

function PositionsPanel({ positions }: { positions: Positions }) {
  const renderTable = (title: string, list: typeof positions.net) => {
    const rows = list.map((p) => ({
      symbol: (
        <span className="symbol-cell">
          <strong>{p.tradingsymbol}</strong>
          <small>{p.exchange} · {p.product}</small>
        </span>
      ),
      qty: (
        <span className={p.quantity > 0 ? "positive" : "negative"}>
          {p.quantity > 0 ? "+" : ""}
          {p.quantity}
        </span>
      ),
      avg: formatCurrency(p.average_price),
      ltp: formatCurrency(p.last_price),
      pnl: <span className={pnlClass(p.pnl)}>{formatCurrency(p.pnl)}</span>,
      m2m: <span className={pnlClass(p.m2m)}>{formatCurrency(p.m2m)}</span>,
    }));

    return (
      <div className="card">
        <h3>{title}</h3>
        <DataTable
          columns={[
            { key: "symbol", label: "Symbol" },
            { key: "qty", label: "Qty", align: "right" },
            { key: "avg", label: "Avg", align: "right" },
            { key: "ltp", label: "LTP", align: "right" },
            { key: "pnl", label: "P&L", align: "right" },
            { key: "m2m", label: "M2M", align: "right" },
          ]}
          rows={rows}
          emptyMessage="No positions"
        />
      </div>
    );
  };

  return (
    <div className="panel-stack">
      {renderTable("Net Positions", positions.net)}
      {renderTable("Day Positions", positions.day)}
    </div>
  );
}

function OrdersPanel({ orders }: { orders: Order[] }) {
  const rows = orders.map((o) => ({
    time: formatTime(o.order_timestamp),
    symbol: (
      <span className="symbol-cell">
        <strong>{o.tradingsymbol}</strong>
        <small>{o.exchange}</small>
      </span>
    ),
    type: (
      <span className={`txn-${o.transaction_type.toLowerCase()}`}>
        {o.transaction_type}
      </span>
    ),
    product: o.product,
    qty: `${o.filled_quantity}/${o.quantity}`,
    price: o.price ? formatCurrency(o.price) : "MKT",
    status: (
      <span className={`status-pill ${statusClass(o.status)}`}>{o.status}</span>
    ),
  }));

  return (
    <div className="panel">
      <h2>Today's Orders</h2>
      <DataTable
        columns={[
          { key: "time", label: "Time" },
          { key: "symbol", label: "Symbol" },
          { key: "type", label: "Type" },
          { key: "product", label: "Product" },
          { key: "qty", label: "Filled/Qty", align: "right" },
          { key: "price", label: "Price", align: "right" },
          { key: "status", label: "Status" },
        ]}
        rows={rows}
        emptyMessage="No orders placed today"
      />
    </div>
  );
}

function TradesPanel({ trades }: { trades: Trade[] }) {
  const rows = trades.map((t) => ({
    time: formatTime(t.fill_timestamp),
    symbol: (
      <span className="symbol-cell">
        <strong>{t.tradingsymbol}</strong>
        <small>{t.exchange}</small>
      </span>
    ),
    type: (
      <span className={`txn-${t.transaction_type.toLowerCase()}`}>
        {t.transaction_type}
      </span>
    ),
    qty: t.quantity,
    price: formatCurrency(t.average_price),
    product: t.product,
  }));

  return (
    <div className="panel">
      <h2>Today's Trades</h2>
      <DataTable
        columns={[
          { key: "time", label: "Time" },
          { key: "symbol", label: "Symbol" },
          { key: "type", label: "Type" },
          { key: "product", label: "Product" },
          { key: "qty", label: "Qty", align: "right" },
          { key: "price", label: "Avg Price", align: "right" },
        ]}
        rows={rows}
        emptyMessage="No trades executed today"
      />
    </div>
  );
}

function QuotesPanel({ quotes }: { quotes: Record<string, Quote> }) {
  const entries = Object.entries(quotes);

  return (
    <div className="panel">
      <h2>Live Market Quotes</h2>
      <div className="quotes-grid">
        {entries.map(([symbol, q]) => {
          const change = q.last_price - q.ohlc.close;
          const changePct = (change / q.ohlc.close) * 100;
          return (
            <div key={symbol} className="quote-card">
              <div className="quote-symbol">{symbol.replace("NSE:", "")}</div>
              <div className="quote-price">{formatNumber(q.last_price)}</div>
              <div className={`quote-change ${pnlClass(change)}`}>
                {change >= 0 ? "+" : ""}
                {formatNumber(change)} ({formatPercent(changePct)})
              </div>
              <div className="quote-ohlc">
                <span>O {formatNumber(q.ohlc.open)}</span>
                <span>H {formatNumber(q.ohlc.high)}</span>
                <span>L {formatNumber(q.ohlc.low)}</span>
                <span>C {formatNumber(q.ohlc.close)}</span>
              </div>
              <div className="quote-vol">
                Vol: {(q.volume / 100000).toFixed(2)}L
              </div>
            </div>
          );
        })}
      </div>
      {entries.length === 0 && (
        <div className="empty-state">No quotes loaded. Add holdings or refresh.</div>
      )}
    </div>
  );
}
