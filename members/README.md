# US FEG and US LEG member sites

Two member sites from one codebase in this folder. The public site at the repo root (Vite, GitHub Pages, `CNAME`) is not part of this app and should stay as it is.

| Site | Planned host | Config |
| --- | --- | --- |
| US FEG | `https://members.usfeg.org` | `SITE=feg` in `src/shared/sites.ts` |
| US LEG | `https://members.usleg.org` | `SITE=leg` in `src/shared/sites.ts` |

Nothing here changes DNS or deploys either host.

## What it replaces

[YourMembership](https://usfeg.site-ym.com) — logins, directories, events (including a lunch order on chapter meetings), paid conferences and workshops, dues and annual renewal, the career center, the file library, and the admin backend. US FEG and US LEG each get their own copy of those tools. A site has one directory, not an in-site FEG/LEG split.

US FEG matches www.usfeg.org: Inter, navy `#021464`, dark navy `#010B3A`, blue `#034C8C`, gold `#A38A00`, light gold `#C9AD1A`, ink `#2F2F2F`, `/logo.svg`, and the tagline “Your Network is Your Net Worth”. US LEG uses that same palette for now, with a text wordmark instead of the FEG logo. Name, logo, tagline, colors, domain, mail sender, and chapter list are all in `src/shared/sites.ts`, and the running site is chosen with `SITE=feg` or `SITE=leg`. The browser reads `/api/brand`, so one build serves either brand.

## Why this shape

The public site is a static site. Members need accounts, a database, private files, and a server that can seal BluePay requests and verify the redirect. Wix cannot do that with BluePay: BluePay is not a Wix payment provider, and Wix recurring billing does not include it. A membership plugin on WordPress would depend on a third-party BluePay extension.

Deploy the same build twice. Each process has its own `SITE`, its own SQLite file (`data/feg/` or `data/leg/`), and its own public URL. Members, passwords, events, lunch orders, the directory, jobs, files, dues, and the admin database do not cross the boundary. Rod manages both by signing in as admin on each site. The admin nav links to the other site so he does not have to remember two bookmarks.

One process is still small: React served by Express, SQLite via `node:sqlite`, scrypt passwords, HttpOnly sessions, and mail in `email_outbox` until `SMTP_HOST` is set. Each site’s From address comes from `sites.ts` (`mailFrom`) unless `MAIL_FROM` overrides it.

Two instances instead of one multi-tenant database keeps a bug or a bad import on one site from touching the other, and it matches two hostnames. A shared BluePay merchant account is the exception Rod asked for: both processes use the same `BLUEPAY_ACCOUNT_ID` and `BLUEPAY_SECRET_KEY`. Every charge is tagged so reports can be split:

- `ORDER_ID` and `INVOICE_ID` are `FEG-` or `LEG-` plus the payment id.
- `CUSTOM_ID2` is `FEG:dues_signup` (or `LEG:…`, and the same for renewals and events). That field is part of the tamper-proof seal.
- The hosted form’s DBA is `US FEG` or `US LEG`.
- Each site’s admin payment list shows the order id.

Hosting is Fly.io: two apps (`usfeg-members`, `usleg-members`), each one machine with its own volume, TLS, and a CNAME (`members.usfeg.org`, `members.usleg.org`). See [Deploying to Fly.io](#deploying-to-flyio). Do not put either site on GitHub Pages or Vercel: the database is a file that needs a disk that persists.

## Local setup

```sh
cd members
npm install
cp .env.example .env
npm run dev          # both sites
npm run dev:feg      # http://localhost:5174 only
npm run dev:leg      # http://localhost:5175 only
```

The first launch of each development database seeds fictional members, a chapter lunch (12:00–1:00 PM CT), and an admin. Passwords exist only in that local database. Production does not seed them. The same admin email works on both sites.

| Site | Role | Email | Password |
| --- | --- | --- | --- |
| Both | Admin | rod@usfeg.org | usfeg-demo-admin |
| US FEG | Member | jordan.hale@example.com | usfeg-demo-member |
| US LEG | Member | elena.vasquez@example.com | usfeg-demo-member |

FEG chapters in the demo are the cities on www.usfeg.org (19 of the 27). LEG has five placeholder chapters (`Chapter 1` … `Chapter 5`) until the real names are imported or edited in `src/shared/sites.ts`.

```sh
npm test
npm run typecheck
npm run build
SITE=feg npm start
SITE=leg PORT=3002 PUBLIC_URL=https://members.usleg.org npm run start:leg
```

## Environment

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `SITE` | `feg` (default) or `leg`. |
| `PUBLIC_URL` | Origin for this process. Dev: `http://localhost:5174` or `:5175`. |
| `PORT` | API port. Default `3001` (FEG) or `3002` (LEG). |
| `SIBLING_URL` | The other member site. |
| `SESSION_SECRET` | HMAC key for the session cookie. Use a different secret per site. |
| `DATA_DIR` | SQLite and uploads. Default `./data/feg` or `./data/leg`. |
| `BLUEPAY_MODE` | `mock` (default), `TEST`, or `LIVE`. Same mode on both sites. |
| `BLUEPAY_ACCOUNT_ID` | Shared 12-digit gateway account. |
| `BLUEPAY_SECRET_KEY` | Shared gateway secret. |
| `BLUEPAY_TPS_HASH_TYPE` | Must match the account’s “Hash Type in APIs”. Default `HMAC_SHA512` (current official PHP library). Older accounts use `MD5`. |
| `BLUEPAY_SHPF_HASH_TYPE` | Seal on the hosted-form wrapper. Default `HMAC_SHA512`, same as the official sample. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional. Without them, mail is stored and printed. |
| `CRON_SECRET` | Bearer token for `POST /api/cron/renewals`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Production only, and only when the database has no users. |

`NODE_ENV=production` refuses to boot without `PUBLIC_URL` and `SESSION_SECRET`, and it does not load demo people. Create the real admin with:

```sh
SITE=feg ADMIN_EMAIL=rod@usfeg.org ADMIN_PASSWORD='a long passphrase' npm run create-admin
SITE=leg ADMIN_EMAIL=rod@usfeg.org ADMIN_PASSWORD='a long passphrase' npm run create-admin
```

## Payments (BluePay)

Card numbers are entered on BluePay’s hosted form (`https://secure.bluepay.com/interfaces/shpf`), the same URL the official PHP sample builds. This server never receives a card number. It seals the amount, the return URL, and (for dues) a yearly rebill, then redirects the browser. BluePay charges the card and redirects back to `/api/payments/bluepay/return` with a `BP_STAMP`. We recompute that stamp and ignore the response if it does not match. A flipped amount or a missing stamp does not activate a membership or a registration.

Dues at signup and annual renewals can include `REBILLING=1`, `REB_FIRST_DATE=1 YEAR`, `REB_EXPR=1 YEAR`, so BluePay charges the card again each year. Turn that off under Admin → Settings if you would rather send a reminder and a one-time pay link. Reminders also go out either way: Admin → Settings → “Send reminders now”, or a daily cron:

```sh
npm run renewals
# or
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://members.usfeg.org/api/cron/renewals
```

BluePay has one postback URL. Point it at one site, or give each site its own postback if the gateway allows more than one. Each return URL is that site’s `/api/payments/bluepay/return`. A result whose order id or `CUSTOM_ID2` names the other site is rejected. The handler is idempotent on BluePay’s transaction id.

`BLUEPAY_MODE=mock` does not call BluePay. Checkout opens an in-app sandbox page that approves or declines with BluePay’s published test rule: the whole-dollar part of the amount is odd → approved, even → declined. `$495.00` approves. `$100.00` declines. No card field is shown. `TEST` uses the real sandbox at `secure.bluepay.com` once Account ID and Secret Key are set. `LIVE` charges real cards. Do not point `LIVE` at this app until a TEST dues payment, a TEST event registration, and a TEST renewal have been checked.

Refunds from Admin ask BluePay (TEST/LIVE) to refund by transaction id, which does not require the card number. In mock mode the refund is recorded locally only.

Sample dues are **$495** on each site so the sandbox approves them. That number is a placeholder. Change it in Admin → Settings before anyone is invited. The two sites do not have to charge the same amount.

## What members and admins can do

Members: apply and pay dues, set a password from an invite, reset a password, edit profile and privacy, register for events (lunch order when the event has options; BluePay when the event has a price), search that site’s directory, submit a job, download files.

Event times are America/Chicago. The database stores the UTC instant; pages label the clock time `CT`. The admin start and end fields are Central time. A new chapter lunch defaults to 12:00–1:00 PM CT (still editable). A zone-less CSV date (`2027-01-14`) is also 12:00 PM CT; `2027-01-14T13:00` is 1:00 PM CT. Sample chapter lunches are 12:00–1:00 PM CT and skip June and December, when conferences replace the monthly meetings.

Staff and admin: the same, plus members, chapters, events, registrant lists, CSV export, job moderation, file uploads, payments, manual check/wire recording, and renewal reminders. Only an admin can change dues or grant admin.

A new applicant pays first and stays “pending approval” until Rod approves them. Directory, files, and job browsing stay closed until then. People imported from YourMembership as already active get a set-password link and skip the dues step.

## Moving off YourMembership

Passwords cannot be exported. Plan on an invite email. BluePay tokens stored inside YourMembership are not assumed to work here — confirm with Fiserv before cutover. If they cannot move, members re-enter a card at the next renewal. Do not cancel YourMembership until a test dues payment, a test event, and a test renewal have succeeded on this site.

1. Export members, event registrations, and career openings from the YM admin (`Sa.Export.Members`, `Sa.Export.Event.Registrations`, `Sa.Export.Career.Openings`). Download the file library from the resource manager.
2. Import:

```sh
SITE=feg npm run import -- members path/to/members.csv
SITE=leg npm run import -- members path/to/members.csv
SITE=feg npm run import -- events path/to/events.csv
SITE=leg npm run import -- jobs path/to/jobs.csv
SITE=feg npm run import -- members path/to/members.csv --no-email
```

Run the same file twice, once per site. A `Network` (or `Group`) value of FEG or LEG is imported only on that site; a blank network is imported into whichever site you are running. Unknown chapter names are created on that site. The same upload exists under each site’s Admin → Settings. Sample files are in `samples/`.

3. Upload the document library under Admin → Files.
4. Run both sites. Point the public site’s “Member Site” button at `https://members.usfeg.org` only when you are ready — that is a content change on the public site and is intentionally not done here.
5. Ask Fiserv whether vault tokens and existing rebills can move to the new integration on the same merchant account.

FEG chapters seeded in development are the cities on www.usfeg.org (19). The live count is 27; import the rest. LEG is seeded with five placeholder chapters. Replace those names from the YourMembership export.

## Deploying to Fly.io

Each site is its own Fly app built from `Dockerfile`, configured by `fly.feg.toml` or `fly.leg.toml`. One machine per site (SQLite needs a single writer) in Dallas (`dfw`), with a 1 GB volume at `/data` for the database, uploads, and backups. Fly provides TLS and takes a volume snapshot every day (kept 14 days). The machine also runs `deploy/crontab`: the backup at 3 AM CT and renewal reminders at 8 AM CT. Each machine is shared-cpu-1x with 256 MB (the app uses about 60 MB), roughly $2–3 a month per site.

### One-time setup

Install [flyctl](https://fly.io/docs/flyctl/install/) and sign in (`fly auth login`). From `members/`, for each site (`feg` shown; repeat with `leg` and `usleg-members`):

```sh
fly apps create usfeg-members            # if the name is taken, pick another and update app = in fly.feg.toml
fly volumes create data --app usfeg-members --region dfw --size 1 --yes
fly secrets set --app usfeg-members --stage \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  CRON_SECRET="$(openssl rand -hex 32)"
fly deploy --config fly.feg.toml
```

`create-admin` reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment. Run it inside `fly ssh console --app usfeg-members` so the password stays out of shell history:

```sh
ADMIN_EMAIL=rod@usfeg.org ADMIN_PASSWORD='a long passphrase' node_modules/.bin/tsx scripts/create-admin.ts
```

Until DNS points at Fly, the site is reachable at `https://usfeg-members.fly.dev`, but sign-in cookies and BluePay returns use `PUBLIC_URL` (`https://members.usfeg.org`). For a preview before DNS, deploy with `fly deploy --config fly.feg.toml --env PUBLIC_URL=https://usfeg-members.fly.dev`.

### Custom domains (Wix DNS)

usfeg.org and usleg.org DNS is managed at Wix. For each site:

1. `fly certs add members.usfeg.org --app usfeg-members` and note the target it prints (`usfeg-members.fly.dev`).
2. In Wix: Domains → usfeg.org → DNS records → CNAME → Add record. Host `members`, value `usfeg-members.fly.dev`.
3. `fly certs check members.usfeg.org --app usfeg-members` until the certificate is issued.

Same for `members.usleg.org` → `usleg-members.fly.dev`.

### Secrets for go-live

Set these with `fly secrets set --app <app> NAME=value` (never in the toml or the repo). Both apps get the same BluePay values.

| Secret | When |
| --- | --- |
| `SESSION_SECRET`, `CRON_SECRET` | At setup, different per site |
| `BLUEPAY_ACCOUNT_ID`, `BLUEPAY_SECRET_KEY`, `BLUEPAY_TPS_HASH_TYPE` | When Rod's credentials arrive. Then set `BLUEPAY_MODE` to `TEST` in the toml, and `LIVE` after test charges pass. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Before inviting members. Without them, invites, resets, and reminders are only stored in `email_outbox`. |

### Deploys from GitHub

`.github/workflows/members.yml` runs typecheck, tests, and build on every change to `members/`. To deploy both sites on each merge to main, add a repo secret `FLY_API_TOKEN` (`fly tokens create org`) and a repo variable `MEMBERS_DEPLOY` = `true` (Settings → Secrets and variables → Actions).

### Nightly backup to OneDrive

`npm run backup` (`scripts/backup.ts`) copies the database with `VACUUM INTO`, packs it with `uploads/` into `/data/backups/<site>-<time>.tar.gz`, keeps 14 days on the volume, and copies the new file to `BACKUP_REMOTE` (`onedrive:Member Site Backups/feg` or `/leg`) with rclone. Until OneDrive is connected it keeps the local copy only.

Connect OneDrive once per site. On a computer with a browser, install [rclone](https://rclone.org/install/) and run `rclone authorize "onedrive"`, sign in with the Microsoft 365 account that should own the backups, and copy the token it prints. Then:

```sh
fly ssh console --app usfeg-members
mkdir -p /data/rclone && rclone config
# n (new remote) → name: onedrive → storage: onedrive → leave client id/secret blank
# → region: global → edit advanced: n → use web browser: n → paste the token
# → choose "OneDrive Personal or Business" and the drive → y to save
node_modules/.bin/tsx scripts/backup.ts   # check that it says "Copied to onedrive:…"
```

The config lives on the volume (`RCLONE_CONFIG=/data/rclone/rclone.conf`), so rclone can save refreshed tokens. It is not included in the backup archives.

To restore: stop the app (`fly scale count 0 --app usfeg-members`), or work from a fresh volume, extract an archive into `/data` (`tar -xzf <file> -C /data`), and scale back to 1.

### Before retiring YourMembership

1. `BLUEPAY_MODE=TEST` on both sites, then a test dues payment, a test event registration, and a test renewal on each.
2. Import the YM export (see above), then send invites.
3. `BLUEPAY_MODE=LIVE`, point the public site's "Member Site" button at `https://members.usfeg.org`, and cancel YM.

## Layout

```
src/shared/sites.ts      per-site name, colors, chapters, payment prefix
src/server/bluepay.ts    hosted-form URL, seals, sandbox rule
src/server/billing.ts    dues, registration, renewals, refunds
src/server/app.ts        HTTP API
src/server/importing.ts  YM CSV mapping
src/client               React pages
scripts/import-ym.ts     CLI import
scripts/send-renewals.ts daily reminder job
scripts/backup.ts        nightly backup to the volume and OneDrive
deploy/                  Fly start script and crontab
scripts/create-admin.ts  first real admin
tests                    seal vector and the member flows
```
