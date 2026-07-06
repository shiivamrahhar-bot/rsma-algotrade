import { Bell, BellOff, CheckCheck, Clock, Flame, ShoppingCart, X } from "lucide-react";
import type { MomentumAlert } from "../types/alerts";
import { formatAlertTime } from "../hooks/useMomentumAlerts";
import { formatNumber, formatPercent, pnlClass } from "../utils/format";

interface AlertSidePanelProps {
  open: boolean;
  onToggle: () => void;
  alerts: MomentumAlert[];
  unreadCount: number;
  watching: boolean;
  lastCheck: string | null;
  notificationsEnabled: boolean;
  onEnableNotifications: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onAlertClick: (alert: MomentumAlert) => void;
  onTrade: (alert: MomentumAlert) => void;
}

export default function AlertSidePanel({
  open,
  onToggle,
  alerts,
  unreadCount,
  watching,
  lastCheck,
  notificationsEnabled,
  onEnableNotifications,
  onMarkRead,
  onMarkAllRead,
  onAlertClick,
  onTrade,
}: AlertSidePanelProps) {
  return (
    <>
      <button className={`alert-fab ${unreadCount > 0 ? "has-unread" : ""}`} onClick={onToggle}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="alert-badge">{unreadCount}</span>}
      </button>

      <div className={`alert-side-panel ${open ? "open" : ""}`}>
        <div className="alert-panel-header">
          <div>
            <h3><Flame size={18} /> Momentum Alerts</h3>
            <p className="alert-panel-sub">
              {watching ? "Scanning..." : lastCheck ? `Last check ${formatAlertTime(lastCheck)}` : "Waiting..."}
            </p>
          </div>
          <div className="alert-panel-actions">
            {alerts.length > 0 && (
              <button className="btn-icon-sm" onClick={onMarkAllRead} title="Mark all read">
                <CheckCheck size={16} />
              </button>
            )}
            <button className="btn-icon-sm" onClick={onToggle}><X size={18} /></button>
          </div>
        </div>

        {!notificationsEnabled && (
          <button className="notif-enable-btn" onClick={onEnableNotifications}>
            <BellOff size={14} />
            Enable desktop notifications
          </button>
        )}

        <div className="alert-list">
          {alerts.length === 0 ? (
            <div className="alert-empty">
              <Bell size={32} />
              <p>No momentum alerts yet today</p>
              <small>Enable auto-watch to get notified when sudden momentum hits</small>
            </div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={`alert-item ${!a.read ? "unread" : ""} ${a.orderPlaced ? "traded" : ""}`}
                onClick={() => {
                  onMarkRead(a.id);
                  onAlertClick(a);
                }}
              >
                <div className="alert-item-top">
                  <div className="alert-time">
                    <Clock size={12} />
                    {formatAlertTime(a.triggeredAt)}
                  </div>
                  <span className="alert-signal">{a.signal}</span>
                </div>
                <div className="alert-item-body">
                  <strong>{a.tradingsymbol}</strong>
                  <span className={pnlClass(a.dayChange)}>{formatPercent(a.dayChange)}</span>
                </div>
                <div className="alert-buy-info">
                  Buy @ <strong>₹{formatNumber(a.triggerPrice)}</strong> at {formatAlertTime(a.triggeredAt)}
                </div>
                <div className="alert-item-meta">
                  <span>Score {a.momentumScore}</span>
                  <span>Vol {a.volumeSurge.toFixed(1)}x</span>
                  <span>₹{formatNumber(a.ltp)}</span>
                </div>
                {!a.orderPlaced && (
                  <button
                    className="alert-trade-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrade(a);
                    }}
                  >
                    <ShoppingCart size={12} /> Quick Buy
                  </button>
                )}
                {a.orderPlaced && <span className="alert-traded-tag">Order Placed ✓</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
