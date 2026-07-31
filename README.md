# Oasis — Ladies Swimming Club Booking System

A simple website and reservation system for a ladies-only swimming oasis club.

## What it does

**Public site**

- Landing page with prices and how booking works
- Booking form at `/book`: guests pick a day, party size, name and phone
- Live availability per day — a day can never be overbooked
- Pricing is automatic: **25 JOD** per guest on weekdays (Sun–Thu), **30 JOD**
  per guest on the weekend (Fri–Sat)
- New bookings start as **pending** — nothing is confirmed until staff approve

**Admin dashboard** (`/admin`, password-protected)

- Every booking has a **status**: `pending`, `approved` or `rejected`
- Approve / reject / reset any booking with one click
- 14-day occupancy overview (booked vs. capacity per day)
- **Daily capacity** setting — defaults to 300 guests per day and can be
  reduced (or raised back) at any time
- Filter bookings by status and by day

Capacity counts **pending + approved** bookings, so a day can't be promised to
more guests than it holds. Rejected bookings free their spots immediately, and
restoring a rejected booking re-checks capacity first — a day can't be
overbooked even from the dashboard.

## Running it

```bash
npm install
npm run dev        # development on http://localhost:3000
```

For production:

```bash
npm run build
npm start
```

The database is a single SQLite file created automatically at `data/oasis.db`
(no database server needed). Back it up by copying that file.

## Configuration

Copy `.env.example` to `.env` and set:

| Variable         | Purpose                                        | Default          |
| ---------------- | ---------------------------------------------- | ---------------- |
| `ADMIN_PASSWORD` | Password for `/admin` — **change before live** | `change-me`      |
| `SESSION_SECRET` | Signs admin login cookies (optional)           | derived          |
| `DATABASE_PATH`  | Where the SQLite file lives (optional)         | `./data/oasis.db` |

Prices, the weekend days, the default capacity and the booking window
(90 days ahead) live in [`lib/config.ts`](lib/config.ts).

## Notes

- The app needs a persistent server (a small VPS or any Node host) because it
  stores its data in a local SQLite file. It is not suited to serverless hosts.
- Times and "today" are calculated in the club's time zone (`Asia/Amman`).
- Deploy behind HTTPS in production; the admin cookie is marked `Secure`
  automatically when served over HTTPS.
