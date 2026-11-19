import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { siteById } from '../src/shared/sites'

/**
 * Nightly job: snapshot the database and uploads into one .tar.gz under
 * DATA_DIR/backups, keep BACKUP_KEEP_DAYS of them, and copy the new one to
 * BACKUP_REMOTE with rclone (for example `onedrive:Member Site Backups/feg`).
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const site = siteById(process.env.SITE)
const dataDir = path.resolve(root, process.env.DATA_DIR || path.join('data', site.id))
const backupsDir = path.join(dataDir, 'backups')
const keepDays = Number(process.env.BACKUP_KEEP_DAYS || 14)
const remote = process.env.BACKUP_REMOTE || ''

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const name = `${site.id}-${stamp}`
const workDir = path.join(backupsDir, name)
const archive = path.join(backupsDir, `${name}.tar.gz`)

mkdirSync(workDir, { recursive: true })
const db = new DatabaseSync(path.join(dataDir, 'usfeg.sqlite'))
db.exec(`VACUUM INTO '${path.join(workDir, 'usfeg.sqlite').replaceAll("'", "''")}'`)
db.close()

const tarArgs = ['-czf', archive, '-C', workDir, 'usfeg.sqlite']
if (existsSync(path.join(dataDir, 'uploads'))) tarArgs.push('-C', dataDir, 'uploads')
execFileSync('tar', tarArgs)
rmSync(workDir, { recursive: true, force: true })
console.log(`Backup written: ${archive}`)

const cutoff = Date.now() - keepDays * 24 * 3600 * 1000
for (const file of readdirSync(backupsDir)) {
  const full = path.join(backupsDir, file)
  if (file.endsWith('.tar.gz') && statSync(full).mtimeMs < cutoff) rmSync(full)
}

if (!remote) {
  console.log('BACKUP_REMOTE is not set. Kept the local copy only.')
} else if (process.env.RCLONE_CONFIG && !existsSync(process.env.RCLONE_CONFIG)) {
  console.log(`No rclone config at ${process.env.RCLONE_CONFIG}. Kept the local copy only.`)
} else {
  execFileSync('rclone', ['copy', archive, remote], { stdio: 'inherit' })
  console.log(`Copied to ${remote}`)
}
