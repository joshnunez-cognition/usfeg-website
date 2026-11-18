import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Db } from '../src/server/db'
import { id, isEmail, nowIso } from '../src/server/ids'
import { hashPassword } from '../src/server/passwords'

/**
 * Create the first admin without a demo password.
 *   ADMIN_EMAIL=rod@usfeg.org ADMIN_PASSWORD='a long passphrase' npm run create-admin
 */
const email = (process.env.ADMIN_EMAIL || '').toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''
if (!isEmail(email) || password.length < 10) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters).')
  process.exit(1)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const db = new Db(path.join(path.resolve(root, process.env.DATA_DIR || 'data'), 'usfeg.sqlite'))
if (!db.getSetting('dues_feg_cents', '')) db.setSetting('dues_feg_cents', '49500')
if (!db.getSetting('dues_leg_cents', '')) db.setSetting('dues_leg_cents', '49500')
if (!db.getSetting('renewal_lead_days', '')) db.setSetting('renewal_lead_days', '30')
if (!db.getSetting('rebilling_enabled', '')) db.setSetting('rebilling_enabled', '1')

const existing = db.getUserByEmail(email)
const now = nowIso()
if (existing) {
  db.updateUser(existing.id, { password_hash: hashPassword(password), role: 'admin', status: 'active' })
  console.log(`Updated ${email} as admin.`)
} else {
  db.insertUser({
    id: id(),
    email,
    password_hash: hashPassword(password),
    role: 'admin',
    status: 'active',
    created_at: now,
    updated_at: now,
    last_login_at: null,
  })
  console.log(`Created admin ${email}.`)
}
db.close()
