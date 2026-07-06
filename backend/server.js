import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { scanMomentum, getMomentumDetail, getTodayTriggers } from "./momentum.js";
import { getIndicatorTable } from "./indicators.js";
import { getStockSMC, getSMCLeaderboard, getMultiTimeframeLeaderboard, getStockMultiTimeframe, runBacktest } from "./smc.js";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const distPath = path.join(__dirname, "../frontend/dist");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const KITE_API_KEY = process.env.KITE_API_KEY;
const KITE_API_SECRET = process.env.KITE_API_SECRET;
const KITE_BASE = "https://api.kite.trade";
const KITE_LOGIN = "https://kite.zerodha.com/connect/login";

if (isProd) {
  app.set("trust proxy", 1);
}

if (!KITE_API_KEY || !KITE_API_SECRET) {
  console.warn(
    "⚠️  KITE_API_KEY and KITE_API_SECRET not set. Copy backend/.env.example to backend/.env"
  );
}

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "rsma-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProd,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

async function kiteRequest(req, path, options = {}) {
  const url = `${KITE_BASE}${path}`;
  const headers = {
    "X-Kite-Version": "3",
    Authorization: `token ${KITE_API_KEY}:${req.session.accessToken}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (data.status === "error") {
    const err = new Error(data.message || "Kite API error");
    err.status = response.status;
    throw err;
  }

  return data.data;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(KITE_API_KEY && KITE_API_SECRET),
  });
});

app.get("/api/auth/login", (_req, res) => {
  if (!KITE_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }
  const loginUrl = `${KITE_LOGIN}?v=3&api_key=${KITE_API_KEY}`;
  res.json({ loginUrl });
});

app.get("/callback", async (req, res) => {
  const { request_token, status } = req.query;

  if (status === "error" || !request_token) {
    return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
  }

  try {
    const checksum = crypto
      .createHash("sha256")
      .update(KITE_API_KEY + request_token + KITE_API_SECRET)
      .digest("hex");

    const response = await fetch(`${KITE_BASE}/session/token`, {
      method: "POST",
      headers: {
        "X-Kite-Version": "3",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        api_key: KITE_API_KEY,
        request_token: String(request_token),
        checksum,
      }),
    });

    const data = await response.json();

    if (data.status === "error") {
      return res.redirect(
        `${FRONTEND_URL}/login?error=${encodeURIComponent(data.message)}`
      );
    }

    req.session.accessToken = data.data.access_token;
    req.session.userId = data.data.user_id;
    req.session.userName = data.data.user_name;
    req.session.userProfile = {
      user_id: data.data.user_id,
      user_name: data.data.user_name,
      email: data.data.email,
      user_type: data.data.user_type,
      broker: data.data.broker,
    };

    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error("Token exchange failed:", err);
    res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
  }
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.session.userProfile,
  });
});

app.post("/api/auth/logout", async (req, res) => {
  if (req.session.accessToken) {
    try {
      await fetch(`${KITE_BASE}/session/token`, {
        method: "DELETE",
        headers: {
          "X-Kite-Version": "3",
          Authorization: `token ${KITE_API_KEY}:${req.session.accessToken}`,
        },
      });
    } catch {
      /* ignore logout errors */
    }
  }
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/api/user/profile", requireAuth, async (req, res) => {
  try {
    const data = await kiteRequest(req, "/user/profile");
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/user/margins", requireAuth, async (req, res) => {
  try {
    const data = await kiteRequest(req, "/user/margins");
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/portfolio/holdings", requireAuth, async (req, res) => {
  try {
    const data = await kiteRequest(req, "/portfolio/holdings");
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/portfolio/positions", requireAuth, async (req, res) => {
  try {
    const data = await kiteRequest(req, "/portfolio/positions");
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const data = await kiteRequest(req, "/orders");
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/trades", requireAuth, async (req, res) => {
  try {
    const data = await kiteRequest(req, "/trades");
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/quote", requireAuth, async (req, res) => {
  try {
    const instruments = req.query.i;
    if (!instruments) {
      return res.status(400).json({ error: "Query param 'i' required" });
    }
    const list = Array.isArray(instruments) ? instruments : [instruments];
    const params = new URLSearchParams();
    list.forEach((inst) => params.append("i", inst));
    const data = await kiteRequest(req, `/quote?${params.toString()}`);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/instruments/:exchange", requireAuth, async (req, res) => {
  try {
    const url = `${KITE_BASE}/instruments/${req.params.exchange}`;
    const response = await fetch(url, {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${KITE_API_KEY}:${req.session.accessToken}`,
      },
    });
    const csv = await response.text();
    res.type("text/csv").send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(
  "/api/historical/:token/:interval",
  requireAuth,
  async (req, res) => {
    try {
      const { token, interval } = req.params;
      const { from, to, continuous, oi } = req.query;
      const params = new URLSearchParams();
      if (from) params.set("from", String(from));
      if (to) params.set("to", String(to));
      if (continuous) params.set("continuous", String(continuous));
      if (oi) params.set("oi", String(oi));
      const qs = params.toString() ? `?${params.toString()}` : "";
      const data = await kiteRequest(
        req,
        `/instruments/historical/${token}/${interval}${qs}`
      );
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }
);

app.get("/api/momentum/scan", requireAuth, async (req, res) => {
  try {
    const data = await scanMomentum(kiteRequest, req, req.query);
    res.json(data);
  } catch (err) {
    console.error("Momentum scan error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/momentum/detail/:symbol", requireAuth, async (req, res) => {
  try {
    const data = await getMomentumDetail(
      kiteRequest,
      req,
      req.params.symbol
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/momentum/triggers/today", requireAuth, async (req, res) => {
  try {
    const data = await getTodayTriggers(kiteRequest, req, req.query);
    res.json(data);
  } catch (err) {
    console.error("Trigger log error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/indicators/table", requireAuth, async (req, res) => {
  try {
    const data = await getIndicatorTable(kiteRequest, req, req.query);
    res.json(data);
  } catch (err) {
    console.error("Indicator table error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/smc/leaderboard", requireAuth, async (req, res) => {
  try {
    const data = await getSMCLeaderboard(kiteRequest, req, req.query);
    res.json(data);
  } catch (err) {
    console.error("SMC leaderboard error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/smc/analysis/:symbol", requireAuth, async (req, res) => {
  try {
    const data = await getStockSMC(kiteRequest, req, req.params.symbol, req.query);
    res.json(data);
  } catch (err) {
    console.error("SMC analysis error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/mtf/leaderboard", requireAuth, async (req, res) => {
  try {
    const data = await getMultiTimeframeLeaderboard(kiteRequest, req, req.query);
    res.json(data);
  } catch (err) {
    console.error("MTF leaderboard error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/mtf/analysis/:symbol", requireAuth, async (req, res) => {
  try {
    const data = await getStockMultiTimeframe(kiteRequest, req, req.params.symbol, req.query);
    res.json(data);
  } catch (err) {
    console.error("MTF analysis error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/backtest/:symbol", requireAuth, async (req, res) => {
  try {
    const data = await runBacktest(kiteRequest, req, req.params.symbol, req.query);
    res.json(data);
  } catch (err) {
    console.error("Backtest error:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/orders/place", requireAuth, async (req, res) => {
  try {
    const {
      tradingsymbol,
      exchange,
      transaction_type,
      order_type,
      quantity,
      product,
      price,
      trigger_price,
    } = req.body;

    if (!tradingsymbol || !exchange || !transaction_type || !order_type || !quantity || !product) {
      return res.status(400).json({ error: "Missing required order fields" });
    }

    const body = new URLSearchParams({
      tradingsymbol,
      exchange,
      transaction_type,
      order_type,
      quantity: String(quantity),
      product,
      validity: "DAY",
    });

    if (price && order_type !== "MARKET") body.set("price", String(price));
    if (trigger_price) body.set("trigger_price", String(trigger_price));

    const data = await kiteRequest(req, "/orders/regular", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.use(express.static(distPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/callback") {
    return next();
  }
  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, () => {
  const base = isProd ? FRONTEND_URL : `http://localhost:${PORT}`;
  console.log(`RSMA AlgoTrade running on ${base}`);
  console.log(`Callback URL: ${base}/callback`);
});
