// Post-build: crop empty margins off every partner logo in dist/ so logos
// uploaded through the CMS fill their card evenly without manual cropping.
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

function cornerColor(data, { width, height, channels }) {
  const corners = [0, (width - 1) * channels, (height - 1) * width * channels, (height * width - 1) * channels]
  const sum = { r: 0, g: 0, b: 0, alpha: 0 }
  for (const i of corners) {
    sum.r += data[i]; sum.g += data[i + 1]; sum.b += data[i + 2]; sum.alpha += data[i + 3]
  }
  return { r: sum.r / 4, g: sum.g / 4, b: sum.b / 4, alpha: sum.alpha / 4 }
}

function isNearWhite({ r, g, b }) {
  return r > 215 && g > 215 && b > 215
}

const root = path.resolve(import.meta.dirname, '..')
const partners = JSON.parse(await readFile(path.join(root, 'src/content/partners.json'), 'utf8'))
const logos = [...new Set(partners.tiers.flatMap((t) => t.partners.map((p) => p.logo)))]

for (const logo of logos) {
  if (!logo || /^https?:\/\//.test(logo)) continue
  const file = path.join(root, 'dist', logo.replace(/^\//, ''))
  if (!existsSync(file)) continue
  try {
    const input = await readFile(file)
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const corner = cornerColor(data, info)
    const background = corner.alpha < 16 ? { r: 0, g: 0, b: 0, alpha: 0 } : isNearWhite(corner) ? '#ffffff' : null
    if (!background) {
      console.log(`kept ${logo} (solid background)`)
      continue
    }
    const out = await sharp(input).trim({ background, threshold: 40 }).toBuffer()
    await writeFile(file, out)
    console.log(`trimmed ${logo}`)
  } catch (e) {
    console.warn(`skip ${logo}: ${e.message}`)
  }
}
