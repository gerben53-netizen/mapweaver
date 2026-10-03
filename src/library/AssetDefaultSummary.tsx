import { useEffect, useState } from 'react'
import type { StampAsset } from '../domain/models'
import { libraryRepository } from '../storage/libraryRepository'
import { useLibraryHistory } from './libraryHistory'
import { formatSize } from '../domain/mapScale'

export function AssetDefaultSummary({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<StampAsset | null>(null)
  const changed = useLibraryHistory(s => s.changed)
  useEffect(() => {
    let active = true
    void libraryRepository.getAsset(assetId).then(a => { if (active) setAsset(a ?? null) }).catch(() => { if (active) setAsset(null) })
    return () => { active = false }
  }, [assetId, changed])
  const sizing = asset?.id === assetId ? asset.sizing : undefined
  if (!sizing) return null
  const dimensions = sizing.sizingMode === 'native' ? `${asset!.naturalWidth} × ${asset!.naturalHeight} image px (native placement may be limited by map size)` : [
    sizing.defaultWidth ? `${formatSize(sizing.defaultWidth)} ${sizing.sizingUnit} wide` : '',
    sizing.defaultHeight ? `${formatSize(sizing.defaultHeight)} ${sizing.sizingUnit} high` : '',
  ].filter(Boolean).join(' · ')
  return <p><strong>Asset default</strong><br/>{dimensions}<br/><small>For new placements; existing objects keep their current size.</small></p>
}
