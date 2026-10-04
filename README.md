# USFEG Website

Rebuild of [usfeg.org](https://www.usfeg.org) — Vite, React, TypeScript, Tailwind CSS, deployed to GitHub Pages.

## Development

```sh
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run cms      # local CMS backend — then open http://localhost:5173/admin/
npm run build    # typecheck + production build to dist/
npm run lint     # oxlint
npm run preview  # serve the production build
```

## Structure

- `src/content/*.json` — **all editable content** (copy, photos, conference agenda, partners, testimonials, chapters, Team Gleason). Edited through the CMS; can also be edited by hand.
- `src/data/site.ts` — typed access to the JSON plus presentation-only metadata (nav routes, tier colors).
- `src/pages/` — one component per route (`/`, `/about-us`, `/from-the-founder`, `/join-us-feg`, `/conference`, `/team-3`, `/team-4`, `/teamgleason`).
- `public/admin/` — Decap CMS admin (`index.html` + `config.yml`).
- `public/images/` — site photos and logos; CMS uploads go to `public/images/uploads/`.

## Content editing (Decap CMS)

Non-technical editors open **`<site url>/admin/`**, sign in with GitHub, edit content in forms, and click **Publish**. Each publish is a commit to `main`, which triggers the GitHub Pages deploy (live in ~1–2 min).

### GitHub sign-in (already set up)

Login is handled by a GitHub OAuth App ("USFEG CMS", under the repo owner's
<https://github.com/settings/developers>) plus a small OAuth proxy deployed from
[decap-proxy](https://github.com/sterlingwes/decap-proxy) to Cloudflare Workers at
`https://usfeg-decap-proxy.joshua-nunez.workers.dev` (referenced by `backend.base_url` in
`public/admin/config.yml`). The worker holds the OAuth app's Client ID / Secret as
Cloudflare secrets (`GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET`).

Each editor needs push access to this repo (Settings → Collaborators) and signs in at `/admin/`
with their own GitHub account.

If the proxy ever has to be redeployed: clone decap-proxy, `cp wrangler.toml.sample wrangler.toml`,
set `name = "usfeg-decap-proxy"`, then `npx wrangler secret put GITHUB_OAUTH_ID`,
`npx wrangler secret put GITHUB_OAUTH_SECRET`, and `npx wrangler deploy`. The OAuth App's callback URL
must be `<proxy url>/callback`.

### Local editing without GitHub

`npm run dev` in one terminal and `npm run cms` in another, then open <http://localhost:5173/admin/> and click **Login** — changes are written straight to `src/content/` on disk.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

- Enable Pages once: repo **Settings → Pages → Source: GitHub Actions**.
- Repository variables (Settings → Secrets and variables → Actions → Variables):
  - `BASE_PATH` — `/usfeg-website/` for the project URL (default), `/` for the custom domain.
  - `CUSTOM_DOMAIN` — e.g. `www.usfeg.org`; writes `dist/CNAME`.
  - `VITE_FORMSPREE_ID` — optional; contact form falls back to `mailto:` when unset.
