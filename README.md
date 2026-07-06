# RSMA AlgoTrade Portal

Zerodha Kite Connect trading portal built with React + Express.

## Setup

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

Set in Kite Developer Console: `http://localhost:5000/callback`

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
