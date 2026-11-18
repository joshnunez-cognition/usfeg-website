import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { siteById } from '../src/shared/sites'
import { Db } from '../src/server/db'
import { importEvents, importJobs, importMembers } from '../src/server/importing'
import { createMailer } from '../src/server/mail'

/**
 * Import a YourMembership CSV export.
 *
 *   SITE=feg npm run import -- members samples/members.csv
 *   SITE=leg npm run import -- members export.csv --no-email
 *   SITE=feg npm run import -- events samples/events.csv
 *   SITE=leg npm run import -- jobs samples/jobs.csv
 *
 * Rows with a Network/Group column of FEG or LEG are imported only on that
 * site. Rows with a blank network land on whichever site you run.
 *
 * Header names are flexible (see src/server/importing.ts). New members are
 * created as invited and, unless --no-email is set, get a set-password link.
 * Passwords cannot be copied out of YourMembership.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const site = siteById(process.env.SITE)
const [kind, file, ...rest] = process.argv.slice(2)
if (!kind || !file || !['members', 'events', 'jobs'].includes(kind)) {
  console.error('Usage: SITE=feg|leg npm run import -- <members|events|jobs> <file.csv> [--no-email]')
  process.exit(1)
}

const db = new Db(path.join(path.resolve(root, process.env.DATA_DIR || path.join('data', site.id)), 'usfeg.sqlite'))
const send = createMailer(db, null)
const csv = readFileSync(path.resolve(file), 'utf8')
const publicUrl = process.env.PUBLIC_URL || (site.id === 'leg' ? 'http://localhost:5175' : 'http://localhost:5174')
const result =
  kind === 'members'
    ? importMembers(db, csv, { sendInvites: !rest.includes('--no-email'), publicUrl, send, site })
    : kind === 'events'
      ? importEvents(db, csv, site.code)
      : importJobs(db, csv, site.code)

console.log(JSON.stringify(result, null, 2))
db.close()
