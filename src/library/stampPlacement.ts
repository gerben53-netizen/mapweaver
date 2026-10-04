import { assetAvailableForPlacement } from '../domain/assetQuality'
import type { Point } from '../canvas/viewport'
import { create } from 'zustand'
import type { DragEvent } from 'react'
import type { StampAsset } from '../domain/models'
import { STAMP_DRAG_TYPE } from '../domain/placement'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { effectiveLayers } from '../domain/projectView'
import { libraryRepository } from '../storage/libraryRepository'
import { adoptLibraryAsset, useAssetContext } from '../projects/assets'
import { acquireAssetImage } from '../images/imageCache'
import { finishObjectGesture } from '../canvas/interaction'
import { stampMapCompatible } from '../domain/stampPlacement'

export const useStampGhost = create(() => ({ asset: null as StampAsset | null, point: null as Point | null, bypass: false, error: '' }))
export const useStampDrag = create(() => ({ id: '', source: '' as '' | 'library' | 'palette' }))
let activation = 0
export function openStampLibrary() {
  finishObjectGesture()
  useEditorStore.setState({ workspace: 'editor', stampBrowserOpen: true, libraryKind: 'stamp', inspectorCollapsed: true, picker: null })
}
export function stampPlacementError(asset: StampAsset, point?: Point): string {
  const state = useProjectStore.getState(), editor = useEditorStore.getState()
  if (!stampMapCompatible(asset, state.map.mapType)) return 'This stamp is not compatible with this map type.'
  const layer = effectiveLayers(state, editor.soloLayerId).find(l => l.id === editor.activeLayerId)
  if (!layer || !layer.visible || layer.locked) return 'The active layer is hidden or locked. Choose a visible, unlocked layer.'
  if (point && (!Number.isFinite(point.x + point.y) || point.x < 0 || point.y < 0 || point.x > state.map.width || point.y > state.map.height)) return 'Place the stamp inside the map.'
  return ''
}
export async function prepareStamp(id: string) {
  const generation = useAssetContext.getState().generation
  const meta = await libraryRepository.getAsset(id)
  if (meta && !assetAvailableForPlacement(meta.quality)) throw Error('This asset is retained for existing maps and is unavailable for new placement.')
  if (!meta || meta.kind !== 'stamp') throw Error('This stamp is missing. Remove it from the palette or choose another asset.')
  if (!stampMapCompatible(meta, useProjectStore.getState().map.mapType)) throw Error('This stamp is not compatible with this map type.')
  let asset = await adoptLibraryAsset(meta)
  if (meta.family) {
    const variants = await Promise.all(meta.family.variants.map(async variant => {
      if (variant.assetId === meta.id) return { ...variant, assetId: asset.id }
      const source = await libraryRepository.getAsset(variant.assetId)
      if (!source) throw Error('Family variant is missing.')
      const adopted = await adoptLibraryAsset(source)
      return { ...variant, assetId: adopted.id }
    }))
    asset = { ...asset, family: { ...meta.family, variants } }
  }
  const lease = acquireAssetImage(asset.id, 'stamp')
  try { await lease.promise; if (generation !== useAssetContext.getState().generation) throw Error('The project changed. Choose the stamp again.'); return { ...asset, kind: 'stamp' as const } }
  finally { lease.release() }
}
export async function activateStamp(id: string) {
  const token = ++activation
  finishObjectGesture()
  useEditorStore.setState({ activeTool: 'placeStamp', stampAsset: null, message: 'Loading stamp…', picker: null })
  useStampGhost.setState({ asset: null, point: null })
  try {
    const asset = await prepareStamp(id)
    if (token !== activation || useEditorStore.getState().activeTool !== 'placeStamp') return
    useEditorStore.setState({ stampAsset: asset, message: stampPlacementError(asset) || 'Click to place repeatedly. Esc to finish. Alt bypasses snapping.' })
  } catch (e) { if (token === activation) useEditorStore.setState({ message: (e as Error).message }) }
}
export function beginStampDrag(event: DragEvent, id: string, source: 'library' | 'palette') {
  event.dataTransfer.setData(STAMP_DRAG_TYPE, id)
  event.dataTransfer.effectAllowed = 'copyMove'
  useStampDrag.setState({ id, source })
  useStampGhost.setState({ point: null, asset: null, error: '' })
  void prepareStamp(id).then(asset => { if (useStampDrag.getState().id === id) useStampGhost.setState({ asset }) }).catch(e => {
    if (useStampDrag.getState().id === id) { useStampGhost.setState({ error: e.message }); useEditorStore.setState({ message: e.message }) }
  })
}
export function endStampDrag() { useStampDrag.setState({ id: '', source: '' }); useStampGhost.setState({ point: null, asset: null }) }
