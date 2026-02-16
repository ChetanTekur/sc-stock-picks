# SC Stock Picks

A 200-week Simple Moving Average (SMA) stock tracking application. Track stocks against their 200W SMA, get buy/sell signals, and receive email notifications when stocks meet your criteria.

## Strategy

### BUY Signal (all 3 must be true)
- Stock price is **above** the 200-week SMA
- The SMA's 4-week rolling slope has **never been negative** in the past 7 years (364 weeks)
- Price is within **5% above** the SMA (`price <= SMA * 1.05`)

### SELL Signal (either triggers)
- Price is **60%+ above** the 200W SMA (`price >= SMA * 1.60`)
- Price has **dipped 5%+ below** the 200W SMA (`price <= SMA * 0.95`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (Postgres + Auth + RLS) |
| Charts | Recharts |
| Email | Resend |
| Stock Data | Yahoo Finance API (primary) + Alpha Vantage (fallback) |
| Hosting | Vercel (Hobby plan) |
| Testing | Vitest |

## Features

- **Dashboard** with summary cards and stock table
- **Buy Watchlist** filtered to stocks meeting all buy criteria
- **Sell Watchlist** filtered to stocks with active sell signals
- **Stock Detail** page with price vs SMA chart
- **Email Notifications** for buy alerts, sell alerts, and daily digests
- **Invite-only Auth** with token-based registration (up to 10 users)
- **Admin Panel** for generating invites and monitoring system status
- **Dark/Light Mode** with system preference detection
- **Daily Cron Job** that scans all tracked stocks and evaluates signals
- **Row Level Security** on all database tables

## Project Structure

```
src/
  app/
    (auth)/          # Login + Signup pages
    (dashboard)/     # Dashboard, watchlists, stock detail, settings, admin
    api/
      tickers/       # CRUD for tracked tickers
      stocks/        # Backfill historical data
      preferences/   # User notification preferences
      admin/         # Invite management + system status
      cron/          # Daily job + keep-alive
  components/
    ui/              # shadcn/ui primitives (button, card, dialog, etc.)
    stocks/          # Stock table, chart, badges, cards
    dashboard/       # Summary cards
    settings/        # Notification + stock management
    admin/           # Invite manager + system status
    layout/          # Sidebar + theme toggle
  lib/
    signals/         # SMA, slope, buy/sell signal calculation
    stock-data/      # Yahoo Finance + Alpha Vantage fetchers
    supabase/        # Client, server, admin, middleware
    notifications/   # Resend email + notification orchestrator
    utils/           # Helpers, constants, rate limiter
    validation/      # Zod schemas
  types/             # TypeScript types
supabase/
  migrations/        # 8 SQL migration files (tables + RLS policies)
tests/
  lib/signals/       # Unit tests for signal logic
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- A [Resend](https://resend.com) account (free tier)
- A [Vercel](https://vercel.com) account (Hobby plan, free)

### Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/ChetanTekur/sc-stock-picks.git
   cd sc-stock-picks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in the values:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from [Supabase API settings](https://supabase.com/dashboard/project/_/settings/api)
   - `SUPABASE_SERVICE_ROLE_KEY` from the same page (keep secret)
   - `RESEND_API_KEY` from [Resend API keys](https://resend.com/api-keys)
   - `CRON_SECRET` generate with `openssl rand -hex 32`
   - `NEXT_PUBLIC_APP_URL` set to `http://localhost:3000` for local dev

4. **Run the database migrations**

   Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new) and run each file in `supabase/migrations/` in order (001 through 008).

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

6. **Run tests**
   ```bash
   npm test
   ```

### Creating the First Admin User

1. Go to [Supabase Auth Users](https://supabase.com/dashboard/project/_/auth/users)
2. Click **Add user** > **Create new user** (auto-confirm enabled)
3. Make yourself admin via SQL:
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
   WHERE email = 'your-email@example.com';
   ```
4. Generate an invite token from the Admin page, or via SQL:
   ```sql
   INSERT INTO invite_tokens (token, created_by, expires_at)
   VALUES (
     gen_random_uuid()::text,
     (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
     NOW() + INTERVAL '7 days'
   );
   SELECT token FROM invite_tokens ORDER BY created_at DESC LIMIT 1;
   ```

## Deployment

### Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Add all environment variables from `.env.local.example`
3. Deploy -- cron jobs are auto-configured from `vercel.json`:
   - `/api/cron/daily-job` runs at 05:00 UTC daily
   - `/api/cron/keep-alive` runs at 12:00 UTC daily (prevents Supabase free tier pausing)

### Supabase Post-Deploy

- Set **Site URL** to your Vercel URL at [Auth URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)
- Add your Vercel URL to **Redirect URLs** as `https://your-app.vercel.app/**`

## Free Tier Limits

| Service | Limit |
|---------|-------|
| Vercel Hobby | 100 GB bandwidth, cron jobs |
| Supabase Free | 500 MB database, 50K auth MAUs |
| Resend Free | 100 emails/day, 3,000/month |
| Yahoo Finance | No official limit (may throttle) |
| Alpha Vantage | 25 requests/day ([get a free key](https://www.alphavantage.co/support/#api-key)) |

## License

Private -- not for redistribution.
