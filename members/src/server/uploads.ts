import { createWriteStream, mkdirSync } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'
import Busboy from 'busboy'
import type { Request } from 'express'
import { HttpError } from './http'

const BLOCKED = new Set(['.exe', '.sh', '.bat', '.cmd', '.js', '.mjs', '.html', '.htm', '.svg', '.php'])

export type UploadedFile = {
  storedName: string
  filename: string
  mime: string
  size: number
  path: string
  text?: string
}

export function readMultipart(req: Request, uploadDir: string | null) {
  if (uploadDir) mkdirSync(uploadDir, { recursive: true })
  return new Promise<{ fields: Record<string, string>; file?: UploadedFile }>((resolve, reject) => {
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      reject(new HttpError(400, 'Expected a file upload.'))
      return
    }
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 15 * 1024 * 1024, fields: 20 } })
    const fields: Record<string, string> = {}
    const pending: Promise<UploadedFile | undefined>[] = []
    let rejected = false

    busboy.on('field', (name: string, value: string) => {
      fields[name] = value
    })

    busboy.on('file', (_name: string, stream: Readable, info: { filename: string; mimeType: string }) => {
      const ext = safeExt(info.filename)
      if (BLOCKED.has(ext)) {
        rejected = true
        stream.resume()
        reject(new HttpError(400, 'That file type is not allowed.'))
        return
      }
      if (!uploadDir) {
        pending.push(readText(stream, info))
        return
      }
      const storedName = randomBytes(16).toString('hex') + ext
      const dest = path.join(uploadDir, storedName)
      let size = 0
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
      })
      pending.push(
        pipeline(stream, createWriteStream(dest)).then(() => ({
          storedName,
          filename: path.basename(info.filename || 'file'),
          mime: info.mimeType || 'application/octet-stream',
          size,
          path: dest,
        })),
      )
    })

    busboy.on('error', (err) => {
      if (!rejected) reject(err)
    })
    busboy.on('finish', () => {
      if (rejected) return
      Promise.all(pending)
        .then((files) => resolve({ fields, file: files.find(Boolean) }))
        .catch(reject)
    })
    req.pipe(busboy)
  })
}

function readText(stream: Readable, info: { filename: string; mimeType: string }) {
  return new Promise<UploadedFile>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => {
      const buf = Buffer.concat(chunks)
      resolve({
        storedName: '',
        filename: path.basename(info.filename || 'import.csv'),
        mime: info.mimeType || 'text/csv',
        size: buf.length,
        path: '',
        text: buf.toString('utf8'),
      })
    })
    stream.on('error', reject)
  })
}

function safeExt(filename: string) {
  const ext = path.extname(filename || '').toLowerCase()
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : ''
}

export function assertStoredName(storedName: string) {
  if (!/^[a-f0-9]{32}(\.[a-z0-9]{1,8})?$/.test(storedName)) {
    throw new HttpError(400, 'Stored file name is not valid.')
  }
}
