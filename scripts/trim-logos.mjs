// Post-build: crop empty margins off every partner logo in dist/ so logos
// uploaded through the CMS fill their card evenly without manual cropping.
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const partners = JSON.parse(await readFile(path.join(root, 'src/content/partners.json'), 'utf8'))
const logos = [...new Set(partners.tiers.flatMap((t) => t.partners.map((p) => p.logo)))]

for (const logo of logos) {
  if (!logo || /^https?:\/\//.test(logo)) continue
  const file = path.join(root, 'dist', logo.replace(/^\//, ''))
  if (!existsSync(file)) continue
  try {
    const input = await readFile(file)
    const out = await sharp(input).trim({ threshold: 40 }).toBuffer()
    await writeFile(file, out)
    console.log(`trimmed ${logo}`)
  } catch (e) {
    console.warn(`skip ${logo}: ${e.message}`)
  }
}
