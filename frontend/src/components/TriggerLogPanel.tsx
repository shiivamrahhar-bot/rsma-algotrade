import { useEffect, useState } from "react";
import { api, demoTriggerLog } from "../api/client";
import { DataTable, LoadingSpinner } from "./ui";
import type { TriggerLogEntry } from "../types/momentum";
import { formatMarketTime, formatNumber, formatPercent, pnlClass } from "../utils/format";
import { Clock, RefreshCw, Target } from "lucide-react";

interface TriggerLogPanelProps {
  demoMode?: boolean;
  universe?: string;
  onSelect?: (symbol: string) => void;
}

export default function TriggerLogPanel({
  demoMode = false,
  universe = "nifty50",
  onSelect,
}: TriggerLogPanelProps) {
  const [triggers, setTriggers] = useState<TriggerLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      if (demoMode) {
        setTriggers(demoTriggerLog.triggers);
        setDate(demoTriggerLog.date);
      } else {
        const data = await api.momentumTriggersToday(universe);
        setTriggers(data.triggers);
        setDate(data.date);
      }
    } catch {
      setTriggers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [demoMode, universe]);

  if (loading) return <LoadingSpinner />;

  const rows = triggers.map((t) => ({
    time: (
      <span className="trigger-time-cell">
        <Clock size={13} />
        <strong>{formatMarketTime(t.triggeredAt)}</strong>
      </span>
    ),
    stock: (
      <span className="symbol-cell">
        <strong>{t.tradingsymbol}</strong>
        <small>{t.name}</small>
      </span>
    ),
    buyPrice: <span className="buy-price">₹{formatNumber(t.triggerPrice)}</span>,
    atTrigger: <span className="positive">{formatPercent(t.triggerDayChange)}</span>,
    now: `₹${formatNumber(t.currentPrice)}`,
    gain: (
      <span className={pnlClass(t.gainSinceTrigger)}>
        {formatPercent(t.gainSinceTrigger)}
      </span>
    ),
    signal: <span className="signal-badge sudden">{t.signal}</span>,
    action: (
      <button className="btn-detail" onClick={() => onSelect?.(t.tradingsymbol)}>
        Study
      </button>
    ),
  }));

  return (
    <div className="trigger-log-panel">
      <div className="trigger-log-header">
        <div>
          <h2><Target size={20} /> Today's Buy Trigger Log</h2>
          <p>
            Exact market time jab momentum trigger hua — backtest ke liye
            {date && ` · ${date}`}
          </p>
        </div>
        <button className="btn-icon" onClick={load} disabled={loading}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="trigger-log-note">
        <strong>Trigger Time</strong> = 5-minute candle analysis se — pehla moment jab
        price +1.5% aur volume 1.8x cross kiya. Yahi time pe buy karna chahiye tha.
      </div>

      <DataTable
        columns={[
          { key: "time", label: "🕐 Trigger Time (IST)" },
          { key: "stock", label: "Stock" },
          { key: "buyPrice", label: "Buy @ Price", align: "right" },
          { key: "atTrigger", label: "At Trigger %", align: "right" },
          { key: "now", label: "Now", align: "right" },
          { key: "gain", label: "Since Trigger", align: "right" },
          { key: "signal", label: "Signal" },
          { key: "action", label: "" },
        ]}
        rows={rows}
        emptyMessage="Aaj koi momentum trigger detect nahi hua — market hours mein scan chalao"
      />
    </div>
  );
}
