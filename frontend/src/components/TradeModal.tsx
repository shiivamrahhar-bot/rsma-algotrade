import { useState } from "react";
import { api } from "../api/client";
import type { MomentumDetail } from "../types/momentum";
import type { PlaceOrderRequest } from "../types/alerts";
import { formatNumber } from "../utils/format";
import { AlertTriangle, ShoppingCart, X } from "lucide-react";

interface TradeModalProps {
  stock: MomentumDetail;
  demoMode?: boolean;
  onClose: () => void;
  onSuccess: (symbol: string) => void;
}

export default function TradeModal({
  stock,
  demoMode = false,
  onClose,
  onSuccess,
}: TradeModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<"MIS" | "CNC">("MIS");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [price, setPrice] = useState(stock.ltp);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const estValue = quantity * (orderType === "MARKET" ? stock.ltp : price);

  const handlePlace = async () => {
    setLoading(true);
    setResult(null);

    const payload: PlaceOrderRequest = {
      tradingsymbol: stock.tradingsymbol,
      exchange: stock.exchange,
      transaction_type: "BUY",
      order_type: orderType,
      quantity,
      product,
      ...(orderType === "LIMIT" ? { price } : {}),
    };

    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 800));
        setResult({ ok: true, msg: `Demo order placed — BUY ${quantity} ${stock.tradingsymbol}` });
        onSuccess(stock.tradingsymbol);
      } else {
        const res = await api.placeOrder(payload);
        setResult({ ok: true, msg: `Order placed! ID: ${res.order_id}` });
        onSuccess(stock.tradingsymbol);
      }
    } catch (err) {
      setResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Order failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trade-overlay" onClick={onClose}>
      <div className="trade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="trade-header">
          <div>
            <h3><ShoppingCart size={18} /> Execute Buy Order</h3>
            <p>{stock.tradingsymbol} · LTP ₹{formatNumber(stock.ltp)}</p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="trade-warning">
          <AlertTriangle size={14} />
          Real money order — verify quantity & product before confirming
        </div>

        <div className="trade-form">
          <label>
            Quantity
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            />
          </label>

          <label>
            Product
            <select value={product} onChange={(e) => setProduct(e.target.value as "MIS" | "CNC")}>
              <option value="MIS">MIS (Intraday)</option>
              <option value="CNC">CNC (Delivery)</option>
            </select>
          </label>

          <label>
            Order Type
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as "MARKET" | "LIMIT")}
            >
              <option value="MARKET">MARKET</option>
              <option value="LIMIT">LIMIT</option>
            </select>
          </label>

          {orderType === "LIMIT" && (
            <label>
              Limit Price
              <input
                type="number"
                step="0.05"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </label>
          )}
        </div>

        <div className="trade-summary">
          <span>Est. Value</span>
          <strong>₹{formatNumber(estValue)}</strong>
        </div>

        {result && (
          <div className={`trade-result ${result.ok ? "ok" : "err"}`}>{result.msg}</div>
        )}

        <div className="trade-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handlePlace} disabled={loading}>
            {loading ? "Placing..." : `BUY ${quantity} ${stock.tradingsymbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}
