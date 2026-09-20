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

### One-time setup: GitHub sign-in

Decap needs a tiny OAuth proxy to complete GitHub login (GitHub does not allow it purely from the browser). Any free option works:

1. Create a GitHub OAuth App at <https://github.com/settings/developers> → *New OAuth App*:
   - Homepage URL: `https://www.usfeg.org` (or the Pages URL)
   - Authorization callback URL: `https://<your-proxy>/callback`
2. Deploy an OAuth proxy with the app's Client ID / Secret, e.g.
   [decap-proxy](https://github.com/sterlingwes/decap-proxy) (Cloudflare Workers, free) or
   [netlify-cms-oauth-provider-node](https://github.com/vencax/netlify-cms-github-oauth-provider) (Vercel/Render).
3. Put the proxy URL in `public/admin/config.yml` → `backend.base_url` (currently a placeholder).
4. Give each editor push access to this repo (Settings → Collaborators). They sign in at `/admin/` with their own GitHub account.

Alternative with no proxy to run: [Decap Turbo](https://decapcms.org/turbo/) (hosted auth).

### Local editing without GitHub

`npm run dev` in one terminal and `npm run cms` in another, then open <http://localhost:5173/admin/> and click **Login** — changes are written straight to `src/content/` on disk.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

- Enable Pages once: repo **Settings → Pages → Source: GitHub Actions**.
- Repository variables (Settings → Secrets and variables → Actions → Variables):
  - `BASE_PATH` — `/usfeg-website/` for the project URL (default), `/` for the custom domain.
  - `CUSTOM_DOMAIN` — e.g. `www.usfeg.org`; writes `dist/CNAME`.
  - `VITE_FORMSPREE_ID` — optional; contact form falls back to `mailto:` when unset.
