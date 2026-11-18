import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Db } from '../src/server/db'
import { importEvents, importJobs, importMembers } from '../src/server/importing'
import { createMailer } from '../src/server/mail'

/**
 * Import a YourMembership CSV export.
 *
 *   npm run import -- members samples/members.csv
 *   npm run import -- members export.csv --no-email
 *   npm run import -- events samples/events.csv
 *   npm run import -- jobs samples/jobs.csv
 *
 * Header names are flexible (see src/server/importing.ts). New members are
 * created as invited and, unless --no-email is set, get a set-password link.
 * Passwords cannot be copied out of YourMembership.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [kind, file, ...rest] = process.argv.slice(2)
if (!kind || !file || !['members', 'events', 'jobs'].includes(kind)) {
  console.error('Usage: npm run import -- <members|events|jobs> <file.csv> [--no-email]')
  process.exit(1)
}

const db = new Db(path.join(path.resolve(root, process.env.DATA_DIR || 'data'), 'usfeg.sqlite'))
const send = createMailer(db, null)
const csv = readFileSync(path.resolve(file), 'utf8')
const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5174'
const result =
  kind === 'members'
    ? importMembers(db, csv, { sendInvites: !rest.includes('--no-email'), publicUrl, send })
    : kind === 'events'
      ? importEvents(db, csv)
      : importJobs(db, csv)

console.log(JSON.stringify(result, null, 2))
db.close()
