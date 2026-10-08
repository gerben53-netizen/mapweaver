import { currentSnapshot, useProjectSession } from '../projects/session'
import { useAssetContext } from '../projects/assets'
import { highQualityCache, type RenderRequest } from './renderCache'
/** Explicit guard for interactive exports. Pure snapshot exporters remain usable
 * for isolated QA and generated previews that are not the open editor map. */
export function currentRenderRequest(): RenderRequest {
  const session = useProjectSession.getState(), generation = useAssetContext.getState().generation, snapshot = currentSnapshot(), signature = JSON.stringify(snapshot)
  return { mapId: session.info.id, isCurrent: () => {
    const next = useProjectSession.getState()
    if (session.generation !== next.generation || session.info.id !== next.info.id || generation !== useAssetContext.getState().generation) return false
    const current = currentSnapshot()
    // Canonical editor updates are immutable. Avoid repeatedly encoding a large
    // unchanged map during every cooperative raster chunk.
    return current.map === snapshot.map && current.objects === snapshot.objects && current.layers === snapshot.layers && current.objectGroups === snapshot.objectGroups && current.layerTree === snapshot.layerTree || signature === JSON.stringify(current)
  } }
}
useProjectSession.subscribe((next, previous) => {
  if (next.generation !== previous.generation || next.info.id !== previous.info.id) highQualityCache.clear()
})
