import type { AssetKind } from '../domain/models'
import { useAssetContext } from '../projects/assets'
import { useEffect, useState } from 'react'
import { acquireAssetImage, acquireBackgroundImage, acquireThumbnail, acquireLibraryThumbnail } from './imageCache'
export function useImage(id: string, kind: 'asset' | 'background' | 'thumbnail' | 'libraryThumbnail' = 'asset', expected?: AssetKind) {
  const generation = useAssetContext((s) => s.generation)
  const [result, setResult] = useState<{ id: string; image?: HTMLImageElement; error?: string }>({ id })
  useEffect(() => {
    if (!id) return
    let active = true
    const lease = kind === 'asset' ? acquireAssetImage(id, expected) : kind === 'thumbnail' ? acquireThumbnail(id) : kind === 'libraryThumbnail' ? acquireLibraryThumbnail(id) : acquireBackgroundImage(id)
    lease.promise.then((image) => { if (active) setResult({ id, image }) }, () => { if (active) setResult({ id, error: 'Image unavailable' }) })
    return () => { active = false; lease.release() }
  }, [id, kind, generation, expected])
  return result.id === id ? result : { id }
}



