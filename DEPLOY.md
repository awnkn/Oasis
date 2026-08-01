# Deploying Oasis to a shareable URL

The app is a single Docker container plus one small persistent disk (for the
SQLite database at `/data/oasis.db`). Any host that offers both will work.
Three good options, easiest first:

## Option 1 — Render (recommended, no command line)

1. Create an account at [render.com](https://render.com) and connect your
   GitHub account.
2. In the dashboard click **New → Blueprint** and select this repository
   (`awnkn/Oasis`). Render reads [`render.yaml`](render.yaml) automatically.
3. When prompted, set **`ADMIN_PASSWORD`** — this is the password for the
   `/admin` dashboard, so pick a strong one.
4. Click **Apply**. First build takes a few minutes, then your site is live at
   `https://oasis-XXXX.onrender.com` — share that link.

Notes:
- The blueprint uses the Starter instance (~$7/month) because persistent
  disks aren't available on Render's free tier, and the bookings database
  must survive restarts.
- Later you can add the club's own domain under
  **Settings → Custom Domains** (HTTPS is automatic).

## Option 2 — Railway

1. Create an account at [railway.com](https://railway.com), click
   **New Project → Deploy from GitHub repo**, and pick this repository —
   the [`Dockerfile`](Dockerfile) is detected automatically.
2. In the service settings:
   - **Variables**: add `ADMIN_PASSWORD` (strong value) and
     `SESSION_SECRET` (any long random string).
   - **Volumes**: attach a volume mounted at `/data`.
   - **Networking**: click *Generate Domain* to get the public URL.

## Option 3 — Fly.io (command line)

```bash
fly launch --no-deploy   # accepts the fly.toml in this repo; rename app if taken
fly volumes create oasis_data --size 1
fly secrets set ADMIN_PASSWORD=<strong-password> SESSION_SECRET=<long-random-string>
fly deploy
```

## After deploying (any host)

- Open `https://<your-url>/admin`, sign in with your `ADMIN_PASSWORD`, and
  check the security warning banner is **gone** (it shows only while the
  default password is in use).
- Make a test booking at `/book` and approve it from the dashboard.
- **Backups**: the whole database is the single file `/data/oasis.db` — copy
  it out on a schedule (Render: *Shell* tab → download; Fly:
  `fly ssh sftp get /data/oasis.db`).
