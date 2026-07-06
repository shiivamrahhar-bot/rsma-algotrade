import { createContext, useContext, ReactNode, useCallback, useState } from "react";
import { useMomentumAlerts } from "../hooks/useMomentumAlerts";
import { api, demoMomentumScan } from "../api/client";
import type { MomentumAlert } from "../types/alerts";
import type { MomentumStock } from "../types/momentum";

type AlertContextValue = ReturnType<typeof useMomentumAlerts> & {
  watchEnabled: boolean;
  setWatchEnabled: (v: boolean) => void;
  alertPanelOpen: boolean;
  setAlertPanelOpen: (v: boolean) => void;
  pendingSymbol: string | null;
  openStock: (symbol: string | null) => void;
  pendingTrade: MomentumAlert | null;
  setPendingTrade: (a: MomentumAlert | null) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({
  children,
  demoMode = false,
  watchEnabled,
  setWatchEnabled,
}: {
  children: ReactNode;
  demoMode?: boolean;
  watchEnabled: boolean;
  setWatchEnabled: (v: boolean) => void;
}) {
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);
  const [pendingTrade, setPendingTrade] = useState<MomentumAlert | null>(null);

  const onScan = useCallback(async (): Promise<MomentumStock[]> => {
    if (demoMode) return demoMomentumScan.stocks;
    const data = await api.momentumScan({ universe: "nifty50", limit: 50 });
    return data.stocks;
  }, [demoMode]);

  const alerts = useMomentumAlerts({
    enabled: watchEnabled,
    intervalMs: 120000,
    demoMode,
    onScan,
  });

  const openStock = useCallback((symbol: string | null) => {
    setPendingSymbol(symbol);
    if (symbol) setAlertPanelOpen(false);
  }, []);

  return (
    <AlertContext.Provider
      value={{
        ...alerts,
        watchEnabled,
        setWatchEnabled,
        alertPanelOpen,
        setAlertPanelOpen,
        pendingSymbol,
        openStock,
        pendingTrade,
        setPendingTrade,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertProvider");
  return ctx;
}
