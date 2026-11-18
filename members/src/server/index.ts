import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp, type AppConfig } from './app'
import { parseHashType, type BluePayMode } from './bluepay'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

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
const publicUrl = process.env.PUBLIC_URL || (demo ? 'http://localhost:5174' : '')
requiredInProduction('PUBLIC_URL', process.env.PUBLIC_URL)
requiredInProduction('SESSION_SECRET', process.env.SESSION_SECRET)

const seedAdmin =
  process.env.NODE_ENV === 'production' && process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD
    ? { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD }
    : null

const dist = path.join(root, 'dist')
const config: AppConfig = {
  dataDir: path.resolve(root, process.env.DATA_DIR || 'data'),
  publicUrl: publicUrl || 'http://localhost:3001',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-session-secret',
  bluepay: {
    mode,
    accountId: accountId || 'mock-account',
    secretKey: secretKey || 'mock-secret-key',
    hashType: parseHashType(process.env.BLUEPAY_TPS_HASH_TYPE, 'HMAC_SHA512'),
    shpfHashType: parseHashType(process.env.BLUEPAY_SHPF_HASH_TYPE, 'HMAC_SHA512'),
    publicUrl: publicUrl || 'http://localhost:3001',
  },
  smtp: process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || 'US FEG <rod@usfeg.org>',
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
const port = Number(process.env.PORT || 3001)
app.listen(port, () => {
  console.log(`US FEG member site API on :${port} (BluePay ${mode}${config.staticDir ? ', serving the built client' : ''})`)
  if (demo) {
    console.log('Demo sign-in (local database only):')
    console.log('  Admin   rod@usfeg.org / usfeg-demo-admin')
    console.log('  Member  jordan.hale@example.com / usfeg-demo-member')
  }
})
