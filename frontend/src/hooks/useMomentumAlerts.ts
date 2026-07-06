import { useCallback, useEffect, useRef, useState } from "react";
import type { MomentumAlert } from "../types/alerts";
import type { MomentumStock } from "../types/momentum";
import { formatMarketTime } from "../utils/format";

const STORAGE_KEY = "rsma_momentum_alerts";

function loadAlerts(): MomentumAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MomentumAlert[];
    const today = new Date().toDateString();
    return parsed.filter(
      (a) => new Date(a.triggeredAt).toDateString() === today
    );
  } catch {
    return [];
  }
}

function saveAlerts(alerts: MomentumAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

function notifyBrowser(alert: MomentumAlert) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  new Notification(`🔥 Buy Signal: ${alert.tradingsymbol}`, {
    body: `Trigger at ${formatMarketTime(alert.triggeredAt)} @ ₹${alert.triggerPrice} | +${alert.dayChange.toFixed(2)}%`,
    icon: "/favicon.svg",
    tag: alert.id,
  });
}

function processNewAlerts(
  stocks: MomentumStock[],
  existing: MomentumAlert[]
): MomentumAlert[] {
  const known = new Set(existing.map((a) => a.tradingsymbol));
  const fresh: MomentumAlert[] = [];
  const now = new Date().toISOString();

  for (const s of stocks) {
    if (!s.triggeredAt) continue;
    if (!s.suddenMomentum && s.momentumScore < 8) continue;
    if (known.has(s.tradingsymbol)) continue;

    const alert: MomentumAlert = {
      id: `${s.tradingsymbol}-${s.triggeredAt}`,
      tradingsymbol: s.tradingsymbol,
      name: s.name,
      triggeredAt: s.triggeredAt,
      scannerDetectedAt: now,
      triggerPrice: s.triggerPrice ?? s.ltp,
      signal: s.signal,
      momentumScore: s.momentumScore,
      dayChange: s.triggerDayChange ?? s.dayChange,
      intradayChange: s.intradayChange,
      ltp: s.ltp,
      volumeSurge: s.triggerVolumeSurge ?? s.volumeSurge,
      gainSinceTrigger: s.gainSinceTrigger ?? undefined,
      read: false,
    };
    fresh.push(alert);
    notifyBrowser(alert);
  }

  if (fresh.length === 0) return existing;
  const merged = [...fresh, ...existing].slice(0, 100);
  saveAlerts(merged);
  return merged;
}

interface UseMomentumAlertsOptions {
  enabled: boolean;
  intervalMs: number;
  demoMode?: boolean;
  onScan?: () => Promise<MomentumStock[]>;
}

export function useMomentumAlerts({
  enabled,
  intervalMs,
  demoMode = false,
  onScan,
}: UseMomentumAlertsOptions) {
  const [alerts, setAlerts] = useState<MomentumAlert[]>(loadAlerts);
  const [watching, setWatching] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => "Notification" in window && Notification.permission === "granted"
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const requestNotifications = async () => {
    if (!("Notification" in window)) return false;
    const perm = await Notification.requestPermission();
    const ok = perm === "granted";
    setNotificationsEnabled(ok);
    return ok;
  };

  const markRead = (id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, read: true } : a));
      saveAlerts(next);
      return next;
    });
  };

  const markAllRead = () => {
    setAlerts((prev) => {
      const next = prev.map((a) => ({ ...a, read: true }));
      saveAlerts(next);
      return next;
    });
  };

  const markOrderPlaced = (symbol: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.tradingsymbol === symbol ? { ...a, orderPlaced: true, read: true } : a
      );
      saveAlerts(next);
      return next;
    });
  };

  const ingestStocks = useCallback((stocks: MomentumStock[]) => {
    setAlerts((prev) => processNewAlerts(stocks, prev));
    setLastCheck(new Date().toISOString());
  }, []);

  const getTriggerTime = (symbol: string): string | null => {
    const fromAlert = alerts.find((a) => a.tradingsymbol === symbol);
    return fromAlert?.triggeredAt ?? null;
  };

  const runWatch = useCallback(async () => {
    if (!onScan) return;
    setWatching(true);
    try {
      const stocks = await onScan();
      ingestStocks(stocks);
    } finally {
      setWatching(false);
    }
  }, [onScan, ingestStocks]);

  useEffect(() => {
    if (!enabled || !onScan) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    runWatch();
    timerRef.current = setInterval(runWatch, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, intervalMs, onScan, runWatch]);

  useEffect(() => {
    if (demoMode && alerts.length === 0) {
      const d = new Date();
      d.setHours(13, 35, 0, 0);
      const demo: MomentumAlert = {
        id: "demo-bel",
        tradingsymbol: "BEL",
        name: "Bharat Electronics",
        triggeredAt: d.toISOString(),
        scannerDetectedAt: new Date().toISOString(),
        triggerPrice: 398.5,
        signal: "SUDDEN MOMENTUM",
        momentumScore: 18.5,
        dayChange: 1.52,
        intradayChange: 3.64,
        ltp: 412.5,
        volumeSurge: 3.1,
        gainSinceTrigger: 3.51,
        read: false,
      };
      setAlerts([demo]);
    }
  }, [demoMode, alerts.length]);

  return {
    alerts,
    unreadCount,
    watching,
    lastCheck,
    notificationsEnabled,
    requestNotifications,
    markRead,
    markAllRead,
    markOrderPlaced,
    ingestStocks,
    getTriggerTime,
    formatAlertTime: formatMarketTime,
  };
}

export { formatMarketTime as formatAlertTime };
