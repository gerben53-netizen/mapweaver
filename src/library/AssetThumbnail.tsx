import { useEffect, useRef, useState } from 'react'
import { useImage } from '../images/useImage'
export function AssetThumbnail({ id, source = 'library' }: { id: string; source?: 'library' | 'project' }) {
  const ref = useRef<HTMLSpanElement>(null), [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '160px' })
    observer.observe(ref.current!); return () => observer.disconnect()
  }, [])
  return <span ref={ref} className="asset-thumbnail">{visible && <Image id={id} source={source} />}</span>
}
function Image({ id, source }: { id: string; source: 'library' | 'project' }) {
  const { image, error } = useImage(id, source === 'library' ? 'libraryThumbnail' : 'thumbnail')
  return image ? <img src={image.src} alt="" draggable={false} /> : <small>{error || 'Loading…'}</small>
}
