# US FEG member site

Member site for [United States Financial Executive Group](https://www.usfeg.org) and US LEG. It is a separate app in this folder. The public site at the repo root (Vite, GitHub Pages, `CNAME`) is not part of this app and should stay as it is.

Planned home: `https://members.usfeg.org`. Nothing here changes DNS or deploys that host.

## What it replaces

[YourMembership](https://usfeg.site-ym.com) — logins, the FEG and LEG directories, events (including a lunch order on chapter meetings), paid conferences and workshops, dues and annual renewal, the career center, the file library, and the admin backend Rod uses to run all of that.

The look matches the public site: Inter, navy `#021464`, dark navy `#010B3A`, blue `#034C8C`, gold `#A38A00`, light gold `#C9AD1A`, ink `#2F2F2F`, `/logo.svg`, and the tagline “Your Network is Your Net Worth”. Design tokens live in `src/client/index.css` and are copied from the public site’s `src/index.css`. They are duplicated on purpose so this app can ship and deploy on its own.

## Why this shape

The public site is a static site. Members need accounts, a database, private files, and a server that can seal BluePay requests and verify the redirect. Wix cannot do that with BluePay: BluePay is not a Wix payment provider, and Wix recurring billing does not include it. A membership plugin on WordPress would depend on a third-party BluePay extension.

This app is one Node process:

- React (Vite) for the pages, served by the same process in production.
- Express for the API, BluePay return URL, and file downloads.
- SQLite (`node:sqlite`) in `data/usfeg.sqlite`. A few hundred members and a few dozen events a year fit. Backup is copying that file plus `data/uploads/`.
- Passwords hashed with scrypt. Sessions are random ids in the database, stored in an HttpOnly cookie.
- Mail goes to the `email_outbox` table and the server log. Set `SMTP_HOST` when a mailbox is ready.

That is enough for a small association and stays in one repo Rod’s son already owns. No second vendor for auth or the database. If it ever outgrows SQLite, the SQL is ordinary and can move to Postgres.

Suggested host: a small Fly.io machine (shared CPU, a persistent volume for `data/`) or a $5–6/month VPS, with TLS, and a CNAME from `members.usfeg.org` to that host. Do not put this on GitHub Pages. GitHub Pages cannot run the API, store the database, or receive BluePay’s redirect.

## Local setup

```sh
cd members
npm install
cp .env.example .env
npm run dev
```

- API: http://127.0.0.1:3001
- Site (Vite, proxies `/api`): http://localhost:5174

The first launch of a development database seeds fictional members, one chapter lunch with lunch orders, a paid conference, a workshop, jobs, and a sample file. It also creates an admin. These passwords exist only in that local database. Production does not seed them.

| Role | Email | Password |
| --- | --- | --- |
| Admin | rod@usfeg.org | usfeg-demo-admin |
| Member | jordan.hale@example.com | usfeg-demo-member |

Other demo members use the same member password: Camille Brooks, Andre Washington, Priya Shah, Elena Vasquez (US LEG). Chris Landry is paid and waiting for approval. Sam Nguyen is invited and has no password yet.

```sh
npm test          # payment seals, dues, lunch registration, imports
npm run typecheck
npm run build
npm start         # serves the built site and the API
```

## Environment

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `PUBLIC_URL` | Origin members use, and the origin BluePay redirects back to. Dev: `http://localhost:5174`. Production: `https://members.usfeg.org`. |
| `PORT` | API port. Default `3001`. |
| `SESSION_SECRET` | HMAC key for the session cookie. Required in production. |
| `DATA_DIR` | SQLite file and uploads. Default `./data`. |
| `BLUEPAY_MODE` | `mock` (default), `TEST`, or `LIVE`. |
| `BLUEPAY_ACCOUNT_ID` | 12-digit gateway account. Required for TEST and LIVE. |
| `BLUEPAY_SECRET_KEY` | Gateway secret key. Required for TEST and LIVE. |
| `BLUEPAY_TPS_HASH_TYPE` | Must match the account’s “Hash Type in APIs”. Default `HMAC_SHA512` (current official PHP library). Older accounts use `MD5`. |
| `BLUEPAY_SHPF_HASH_TYPE` | Seal on the hosted-form wrapper. Default `HMAC_SHA512`, same as the official sample. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional. Without them, mail is stored and printed. |
| `CRON_SECRET` | Bearer token for `POST /api/cron/renewals`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Production only, and only when the database has no users. |

`NODE_ENV=production` refuses to boot without `PUBLIC_URL` and `SESSION_SECRET`, and it does not load demo people. Create the real admin with:

```sh
ADMIN_EMAIL=rod@usfeg.org ADMIN_PASSWORD='a long passphrase' npm run create-admin
```

## Payments (BluePay)

Card numbers are entered on BluePay’s hosted form (`https://secure.bluepay.com/interfaces/shpf`), the same URL the official PHP sample builds. This server never receives a card number. It seals the amount, the return URL, and (for dues) a yearly rebill, then redirects the browser. BluePay charges the card and redirects back to `/api/payments/bluepay/return` with a `BP_STAMP`. We recompute that stamp and ignore the response if it does not match. A flipped amount or a missing stamp does not activate a membership or a registration.

Dues at signup and annual renewals can include `REBILLING=1`, `REB_FIRST_DATE=1 YEAR`, `REB_EXPR=1 YEAR`, so BluePay charges the card again each year. Turn that off under Admin → Settings if you would rather send a reminder and a one-time pay link. Reminders also go out either way: Admin → Settings → “Send reminders now”, or a daily cron:

```sh
npm run renewals
# or
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://members.usfeg.org/api/cron/renewals
```

Set the account’s postback URL in the BluePay admin to `https://members.usfeg.org/api/payments/bluepay/postback` so an automatic rebill (no browser) is recorded. The handler is idempotent on BluePay’s transaction id.

`BLUEPAY_MODE=mock` does not call BluePay. Checkout opens an in-app sandbox page that approves or declines with BluePay’s published test rule: the whole-dollar part of the amount is odd → approved, even → declined. `$495.00` approves. `$100.00` declines. No card field is shown. `TEST` uses the real sandbox at `secure.bluepay.com` once Account ID and Secret Key are set. `LIVE` charges real cards. Do not point `LIVE` at this app until a TEST dues payment, a TEST event registration, and a TEST renewal have been checked.

Refunds from Admin ask BluePay (TEST/LIVE) to refund by transaction id, which does not require the card number. In mock mode the refund is recorded locally only.

Sample dues are **$495** for FEG and LEG so the sandbox approves them. That number is a placeholder. Change it in Admin → Settings before anyone is invited.

## What members and admins can do

Members: apply and pay dues, set a password from an invite, reset a password, edit profile and privacy, register for events (lunch order when the event has options; BluePay when the event has a price), search the FEG directory and the LEG directory separately, submit a job, download files.

Event times are America/Chicago. The database stores the UTC instant; pages label the clock time `CT`. The admin start and end fields are Central time, including a zone-less CSV date (`2027-01-14` is 11:30 AM CT; `2027-01-14T13:00` is 1:00 PM CT). Sample chapter lunches are 11:30 AM–1:00 PM CT and skip June and December, when conferences replace the monthly meetings.

Staff and admin: the same, plus members, chapters, events, registrant lists, CSV export, job moderation, file uploads, payments, manual check/wire recording, and renewal reminders. Only an admin can change dues or grant admin.

A new applicant pays first and stays “pending approval” until Rod approves them. Directory, files, and job browsing stay closed until then. People imported from YourMembership as already active get a set-password link and skip the dues step.

## Moving off YourMembership

Passwords cannot be exported. Plan on an invite email. BluePay tokens stored inside YourMembership are not assumed to work here — confirm with Fiserv before cutover. If they cannot move, members re-enter a card at the next renewal. Do not cancel YourMembership until a test dues payment, a test event, and a test renewal have succeeded on this site.

1. Export members, event registrations, and career openings from the YM admin (`Sa.Export.Members`, `Sa.Export.Event.Registrations`, `Sa.Export.Career.Openings`). Download the file library from the resource manager.
2. Import:

```sh
npm run import -- members path/to/members.csv
npm run import -- events path/to/events.csv
npm run import -- jobs path/to/jobs.csv
npm run import -- members path/to/members.csv --no-email   # create profiles, send invites later
```

The same upload exists under Admin → Settings. Header names are flexible (`Email`, `First Name`, `Last Name`, `Company`, `Title`, `Network`, `Chapter`, `Phone`, `Status`, `Renewal Date`, and close variants). `Network` containing “LEG” lands in the LEG directory; everything else is FEG. Unknown chapter names are created. Sample files are in `samples/`.

3. Upload the document library under Admin → Files.
4. Run both sites. Point the public site’s “Member Site” button at `https://members.usfeg.org` only when you are ready — that is a content change on the public site and is intentionally not done here.
5. Ask Fiserv whether vault tokens and existing rebills can move to the new integration on the same merchant account.

FEG chapters seeded in development are the cities on the public site (19). The live chapter count is larger (27 FEG and 5 LEG). Import the YM member export and add any missing chapters under Settings. The one LEG chapter in the demo (“New Orleans”) is a placeholder, not a claim about the real five.

## Deploying later

Not done in this change.

1. Provision the host and a volume mounted at `data/`.
2. Set production env vars. `BLUEPAY_MODE=TEST` until the sandbox charges look right, then `LIVE`.
3. `npm ci && npm run build && NODE_ENV=production npm start` (or a process manager).
4. Put TLS in front. Set `PUBLIC_URL` to the https origin so the session cookie is `Secure` and BluePay can reach the return URL.
5. Daily: `npm run renewals`, and a copy of `data/usfeg.sqlite` plus `data/uploads/`.
6. Create Rod’s admin with `npm run create-admin`. Do not reuse the demo password.

## Layout

```
src/server/bluepay.ts    hosted-form URL, seals, sandbox rule
src/server/billing.ts    dues, registration, renewals, refunds
src/server/app.ts        HTTP API
src/server/importing.ts  YM CSV mapping
src/client               React pages
scripts/import-ym.ts     CLI import
scripts/send-renewals.ts daily reminder job
scripts/create-admin.ts  first real admin
tests                    seal vector and the member flows
```
