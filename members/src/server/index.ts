import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp, type AppConfig } from './app'
import { parseHashType, type BluePayMode } from './bluepay'
import { siteById } from '../shared/sites'
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_MEMBER_EMAIL, DEMO_MEMBER_PASSWORD } from './seed'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const site = siteById(process.env.SITE)

function requiredInProduction(name: string, value: string | undefined) {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} is required when NODE_ENV=production.`)
  }
  return value || ''
}

const mode = (process.env.BLUEPAY_MODE || 'mock') as BluePayMode
if (mode !== 'mock' && mode !== 'TEST' && mode !== 'LIVE') {
  throw new Error('BLUEPAY_MODE must be mock, TEST, or LIVE.')
}
const accountId = process.env.BLUEPAY_ACCOUNT_ID || ''
const secretKey = process.env.BLUEPAY_SECRET_KEY || ''
if (mode !== 'mock' && (!accountId || !secretKey)) {
  throw new Error('BLUEPAY_ACCOUNT_ID and BLUEPAY_SECRET_KEY are required when BLUEPAY_MODE is TEST or LIVE.')
}

const demo = process.env.NODE_ENV !== 'production' && process.env.DEMO !== '0'
const defaultPublic = site.id === 'leg' ? 'http://localhost:5175' : 'http://localhost:5174'
const publicUrl = process.env.PUBLIC_URL || (demo ? defaultPublic : '')
requiredInProduction('PUBLIC_URL', process.env.PUBLIC_URL)
requiredInProduction('SESSION_SECRET', process.env.SESSION_SECRET)

const seedAdmin =
  process.env.NODE_ENV === 'production' && process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD
    ? { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }
    : null

const siblingUrl =
  process.env.SIBLING_URL ||
  (demo ? (site.id === 'leg' ? 'http://localhost:5174' : 'http://localhost:5175') : site.sibling.url)

const dist = path.join(root, 'dist')
const config: AppConfig = {
  dataDir: path.resolve(root, process.env.DATA_DIR || path.join('data', site.id)),
  publicUrl: publicUrl || `http://localhost:${site.id === 'leg' ? 3002 : 3001}`,
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-session-secret',
  site,
  siblingUrl,
  bluepay: {
    mode,
    accountId: accountId || 'mock-account',
    secretKey: secretKey || 'mock-secret-key',
    hashType: parseHashType(process.env.BLUEPAY_TPS_HASH_TYPE, 'HMAC_SHA512'),
    shpfHashType: parseHashType(process.env.BLUEPAY_SHPF_HASH_TYPE, 'HMAC_SHA512'),
    publicUrl: publicUrl || `http://localhost:${site.id === 'leg' ? 3002 : 3001}`,
  },
  smtp: process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || site.mailFrom,
      }
    : null,
  cronSecret: process.env.CRON_SECRET || 'dev-cron-secret',
  secureCookies: (publicUrl || '').startsWith('https://'),
  demo,
  seed: true,
  staticDir: existsSync(path.join(dist, 'index.html')) ? dist : undefined,
  seedAdmin,
}

const app = createApp(config)
const port = Number(process.env.PORT || (site.id === 'leg' ? 3002 : 3001))
app.listen(port, () => {
  console.log(`${site.shortName} member site API on :${port} (BluePay ${mode}${config.staticDir ? ', serving the built client' : ''})`)
  if (demo) {
    console.log('Demo sign-in (this site’s database only):')
    console.log(`  Admin   ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`)
    console.log(`  Member  ${DEMO_MEMBER_EMAIL[site.id]} / ${DEMO_MEMBER_PASSWORD}`)
  }
})
