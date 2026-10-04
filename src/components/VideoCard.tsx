import { useState } from 'react'
import { toEmbedUrl } from '../lib/video'

type Props = { photo: string; alt: string; videoUrl?: string; className?: string }

export default function VideoCard({ photo, alt, videoUrl, className = 'aspect-video' }: Props) {
  const [playing, setPlaying] = useState(false)
  const embed = toEmbedUrl(videoUrl ?? '')

  if (embed && playing) {
    return (
      <div className={`${className} w-full bg-black`}>
        <iframe
          src={embed}
          title={alt}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    )
  }

  const image = (
    <>
      <img src={photo} alt={alt} loading="lazy" className={`${className} w-full object-cover`} />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/70 to-transparent" />
    </>
  )

  if (!embed) return <div className="relative">{image}</div>

  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video: ${alt}`} className="group relative block w-full text-left">
      {image}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow-lg transition group-hover:scale-110 group-hover:bg-white">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  )
}
