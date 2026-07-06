export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Exact market trigger time in IST — e.g. "01:35:00 pm" */
export function formatMarketTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function pnlClass(value: number): string {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function statusClass(status: string): string {
  const s = status.toUpperCase();
  if (["COMPLETE", "FILLED"].includes(s)) return "status-complete";
  if (["OPEN", "TRIGGER PENDING"].includes(s)) return "status-open";
  if (["CANCELLED", "REJECTED"].includes(s)) return "status-cancelled";
  return "status-default";
}
