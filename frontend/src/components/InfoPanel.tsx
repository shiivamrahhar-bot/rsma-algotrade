import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

interface InfoPanelProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function InfoPanel({ title, defaultOpen = true, children }: InfoPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="info-panel">
      <button className="info-panel-toggle" onClick={() => setOpen(!open)}>
        <span className="info-panel-toggle-left">
          <Info size={15} />
          {title}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="info-panel-body">{children}</div>}
    </div>
  );
}

export function MomentumInfoPanel() {
  return (
    <InfoPanel title="Yeh kaise kaam karta hai — Timeframe & Concepts">
      <h4>Timeframe</h4>
      <ul>
        <li><span className="timeframe-tag">1D (Daily)</span> candles — pichle 35 din ka data momentum score (5D/10D/20D) ke liye</li>
        <li><span className="timeframe-tag">5-MIN</span> intraday candles — aaj ke exact <strong>trigger time</strong> (kitne baje momentum bana) nikalne ke liye. Kite Connect ki limitation: 5-min data sirf pichle ~60 din tak available hai</li>
        <li><span className="timeframe-tag">LIVE</span> quote — abhi ka LTP, volume, circuit limits</li>
      </ul>
      <h4>Concepts</h4>
      <ul>
        <li><strong>Momentum Score</strong> = Day% + 5D/10D/20D returns + Volume surge + Acceleration ko weighted combine karke</li>
        <li><strong>Sudden Momentum</strong> = Volume 1.8x+ average se zyada + Price 1.5%+ spike aaj</li>
        <li><strong>Trigger Time</strong> = wo exact 5-min candle jab pehli baar volume+price criteria cross hui — yahi "kab buy karna tha" ka jawab hai</li>
        <li><strong>Buy Checklist</strong> = 6 quick checks (price vs open, volume, 5D/10D momentum, circuit distance, acceleration)</li>
      </ul>
    </InfoPanel>
  );
}

export function IndicatorInfoPanel() {
  return (
    <InfoPanel title="Yeh kaise kaam karta hai — Timeframe & Indicators">
      <h4>Timeframe</h4>
      <ul>
        <li><span className="timeframe-tag">1D (Daily)</span> candles — ~320 din ka history, sabhi indicators (RSI, MACD, SMA200 etc.) isi se calculate hote hain "as of" selected date</li>
        <li><span className="timeframe-tag">5-MIN</span> — VWAP ke liye, sirf last ~60 din tak available (Kite retention limit)</li>
        <li><span className="timeframe-tag">LIVE</span> — Order book Bid/Ask/Imbalance, sirf jab date = aaj ho</li>
      </ul>
      <h4>Indicators (plain language)</h4>
      <ul>
        <li><strong>RSI(14)</strong> — 0-100 scale; 70+ overbought (mehenga/stretched), 30- oversold (sasta/bounce zone)</li>
        <li><strong>MACD</strong> — do EMA ka difference; histogram positive = bullish momentum, negative = bearish</li>
        <li><strong>Bollinger Bands (%B)</strong> — price band ke kis position pe hai; 1+ = upper band se upar, 0- = lower band se neeche</li>
        <li><strong>ATR(14)</strong> — average daily range, volatility batata hai</li>
        <li><strong>SMA/EMA (20/50/200)</strong> — moving averages; price inke upar = uptrend, neeche = downtrend</li>
        <li><strong>Stochastic %K/%D</strong> — RSI jaisa, overbought/oversold dikhata hai lekin faster</li>
        <li><strong>ADX(14)</strong> — trend ki strength (direction nahi); 25+ = strong trend chal raha hai</li>
        <li><strong>Supertrend</strong> — trailing stop-loss line; price ke upar/neeche se buy/sell bias milta hai</li>
        <li><strong>VWAP</strong> — Volume Weighted Average Price, intraday fair value benchmark</li>
      </ul>
    </InfoPanel>
  );
}

export function SMCInfoPanel() {
  return (
    <InfoPanel title="Yeh kaise kaam karta hai — Timeframe & SMC Concepts">
      <h4>Timeframe</h4>
      <ul>
        <li><span className="timeframe-tag">1D (Daily)</span> candles — ~400 din ka history use hota hai Order Blocks, FVG, Market Structure, Liquidity, Premium/Discount sab calculate karne ke liye</li>
        <li>Chart bhi <span className="timeframe-tag">1D</span> hai (last 120 candles dikhte hain) — abhi ke liye lower timeframe (15-min/1-hour) charts available nahi hain</li>
        <li><strong>Historical stats</strong> pichle 400 trading days ka backtest hai (target vs stop-loss hit, agla 10 candles mein)</li>
      </ul>
      <h4>Concepts (plain language)</h4>
      <ul>
        <li><strong>Order Block (OB)</strong> — wo last opposite-colour candle jisne ek strong move shuru kiya. Bullish OB = support zone, Bearish OB = resistance zone. "Fresh" = untested, "Mitigated" = price wapas aa chuka hai</li>
        <li><strong>Fair Value Gap (FVG)</strong> — 3-candle gap/imbalance jaha price jaldi move hui. Price aksar wapas aake ise "fill" karti hai before continuing</li>
        <li><strong>Market Structure — BOS</strong> (Break of Structure) = trend continuation signal; <strong>CHoCH</strong> (Change of Character) = trend reversal signal</li>
        <li><strong>Liquidity Sweep</strong> — jab price equal highs/lows ko todke turant reverse ho jaye (stop-hunt) — ye reversal ka sign hota hai</li>
        <li><strong>Premium/Discount Zone</strong> — recent swing range ka 0-50% = Discount (buy zone), 50-100% = Premium (sell zone)</li>
        <li><strong>Entry Plan</strong> — verdict + nearest fresh OB/FVG se exact entry price, stop-loss aur target nikalta hai</li>
      </ul>
      <h4>Limitation</h4>
      <ul>
        <li>Ye ek rule-based approximation hai — professional discretionary trader ke analysis se 100% match nahi hoga</li>
        <li>Options Greeks (Delta/Theta/Gamma) is feature mein <strong>nahi</strong> hain — wo sirf options contracts ke liye meaningful hote hain</li>
      </ul>
    </InfoPanel>
  );
}
