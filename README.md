# RSMA AlgoTrade Portal

Zerodha Kite Connect trading portal built with React + Express.

**GitHub:** https://github.com/shivamrahar/rsma-algotrade  
**Live (Render):** https://rsma-algotrade.onrender.com

## Setup (Local)

### 1. Backend (port 5000)

```bash
cd backend
cp .env.example .env
# Edit .env with your KITE_API_KEY and KITE_API_SECRET
npm install
npm run dev
```

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — click **Login with Kite** or **Preview Demo Dashboard**.

## Redirect URI

| Environment | Kite Developer Console redirect URL |
|-------------|-------------------------------------|
| Local | `http://localhost:5000/callback` |
| Render | `https://rsma-algotrade.onrender.com/callback` |

## Deploy on Render

| Setting | Value |
|---------|--------|
| **Service type** | Web Service |
| **Build Command** | `cd frontend && npm install && npm run build && cd ../backend && npm install` |
| **Start Command** | `cd backend && npm start` |
| **Instance** | Free |

### Render environment variables

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `KITE_API_KEY` | Your Zerodha API key |
| `KITE_API_SECRET` | Your Zerodha API secret |
| `SESSION_SECRET` | Long random string |
| `FRONTEND_URL` | `https://rsma-algotrade.onrender.com` |

See `backend/.env.render.example` for a copy-paste template.

## API Data Pulled

| Feature | Kite Endpoint |
|---------|---------------|
| Login / Logout | `/session/token` |
| User Profile | `/user/profile` |
| Margins & Funds | `/user/margins` |
| Holdings | `/portfolio/holdings` |
| Positions | `/portfolio/positions` |
| Orders | `/orders` |
| Trades | `/trades` |
| Live Quotes | `/quote` |
| Historical Data | `/instruments/historical/{token}/{interval}` |
