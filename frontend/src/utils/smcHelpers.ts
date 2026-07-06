export function verdictClass(verdict: string): string {
  if (verdict === "STRONG BUY" || verdict === "BUY") return "verdict-buy";
  if (verdict === "STRONG AVOID" || verdict === "AVOID") return "verdict-avoid";
  return "verdict-neutral";
}

export function zoneLabel(zone: string | null): string {
  if (!zone) return "—";
  return zone.replace("_", " ");
}

export function actionClass(action: string): string {
  if (action === "BUY NOW") return "positive";
  if (action === "AVOID BUYING") return "negative";
  return "neutral";
}
