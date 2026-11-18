import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendRenewalReminders } from '../src/server/billing'
import { parseHashType } from '../src/server/bluepay'
import { Db } from '../src/server/db'
import { createMailer } from '../src/server/mail'

/** Daily job: email members whose renewal date is inside the reminder window. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const db = new Db(path.join(path.resolve(root, process.env.DATA_DIR || 'data'), 'usfeg.sqlite'))
const send = createMailer(
  db,
  process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || 'US FEG <rod@usfeg.org>',
      }
    : null,
)
const result = sendRenewalReminders({
  db,
  send,
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:5174',
  bluepay: {
    mode: 'mock',
    accountId: '',
    secretKey: process.env.BLUEPAY_SECRET_KEY || 'mock-secret-key',
    hashType: parseHashType(process.env.BLUEPAY_TPS_HASH_TYPE, 'HMAC_SHA512'),
    shpfHashType: parseHashType(process.env.BLUEPAY_SHPF_HASH_TYPE, 'HMAC_SHA512'),
    publicUrl: process.env.PUBLIC_URL || 'http://localhost:5174',
  },
})
console.log(`Renewal reminders sent: ${result.sent}`)
db.close()
