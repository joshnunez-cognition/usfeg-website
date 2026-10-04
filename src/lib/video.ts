function parse(url: string): URL | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
}

type Video = { provider: 'youtube' | 'vimeo'; id: string }

export function parseVideo(url: string): Video | null {
  const u = parse(url)
  if (!u) return null
  const host = u.hostname.replace(/^(www|m)\./, '')
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    return id ? { provider: 'youtube', id } : null
  }
  if (host === 'youtube.com') {
    const id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
    return id ? { provider: 'youtube', id } : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = u.pathname.match(/(\d+)/)?.[1]
    return id ? { provider: 'vimeo', id } : null
  }
  return null
}

export function toEmbedUrl(url: string): string | null {
  const v = parseVideo(url)
  if (!v) return null
  return v.provider === 'youtube'
    ? `https://www.youtube.com/embed/${v.id}?autoplay=1`
    : `https://player.vimeo.com/video/${v.id}?autoplay=1`
}

/** YouTube's hosted thumbnail; null for Vimeo or non-video URLs. */
export function toThumbnailUrl(url: string): string | null {
  const v = parseVideo(url)
  return v?.provider === 'youtube' ? `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` : null
}

/** True when an image field was filled with a video link instead of a picture. */
export function isVideoLink(value: string): boolean {
  return parseVideo(value) !== null
}
