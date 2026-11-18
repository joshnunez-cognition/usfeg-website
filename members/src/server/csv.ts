/** Small CSV reader and writer. Handles quotes and commas; good enough for YM exports. */

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const char = src[i]
    if (quoted) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') cell += char
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  const headerIndex = rows.findIndex((r) => r.some((c) => c.trim()))
  if (headerIndex === -1) return []
  const headers = rows[headerIndex].map((h) => h.trim().toLowerCase())
  return rows
    .slice(headerIndex + 1)
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => {
      const obj: Record<string, string> = {}
      headers.forEach((header, index) => {
        if (header) obj[header] = (r[index] ?? '').trim()
      })
      return obj
    })
}

export function pick(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias.toLowerCase()]
    if (value) return value
  }
  return ''
}

export function toCsv(headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

function csvCell(value: string) {
  let safe = value ?? ''
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`
  if (/[",\r\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`
  return safe
}
