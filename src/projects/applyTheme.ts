import { applyWorldTheme } from '../domain/applyWorldTheme'
import type { ThemeOptions } from '../domain/applyWorldTheme'
import { objectAssetIds } from '../domain/areas'
import { styleFingerprint, worldTheme } from '../domain/worldThemes'
import { finishObjectGesture, objectGestureActive } from '../canvas/interaction'
import { useProjectStore } from '../store/projectStore'
import { history, useHistoryStore } from '../store/history'
import { currentSnapshot } from './session'
import { adoptLibraryAsset, resourcesFit, useAssetContext } from './assets'
import { libraryRepository } from '../storage/libraryRepository'
import { loadWorldScatterAssets } from '../world/scatterResources'

/** Resolve only replacement resources; commit the complete document in one history step. */
export async function applyTheme(id: string, options: ThemeOptions) {
  finishObjectGesture()
  const before = currentSnapshot(), signature = JSON.stringify(before), generation = useAssetContext.getState().generation
  const assertCurrent = () => {
    if (objectGestureActive() || useHistoryStore.getState().busy || generation !== useAssetContext.getState().generation || JSON.stringify(currentSnapshot()) !== signature) throw Error('The map changed while preparing this theme. Apply again.')
  }
  const candidates = options.assets && before.objects.some(o => o.kind === 'stamp') ? await loadWorldScatterAssets(before.map.mapType) : []
  assertCurrent()
  const result = applyWorldTheme(before, id, options, candidates)
  const old = new Map(before.objects.map(o => [o.id, o]))
  const replacements = new Set(result.snapshot.objects.flatMap(o => o.kind === 'stamp' && old.get(o.id)?.assetId !== o.assetId ? [o.assetId] : []))
  const remap = new Map<string, string>()
  for (const assetId of replacements) {
    assertCurrent()
    const asset = await libraryRepository.getAsset(assetId)
    if (!asset || asset.kind !== 'stamp') throw Error('A replacement stamp is unavailable. Apply again.')
    const adopted = await adoptLibraryAsset(asset); remap.set(assetId, adopted.id)
  }
  assertCurrent()
  result.snapshot.objects = result.snapshot.objects.map(o => {
    if (o.kind !== 'stamp' || !remap.has(o.assetId)) return o
    const assetId = remap.get(o.assetId)!
    result.snapshot.map.theme!.managed[o.id].assetId = styleFingerprint(assetId)
    return { ...o, assetId }
  })
  const ids = new Set(result.snapshot.objects.flatMap(objectAssetIds))
  if (before.map.background) ids.add(before.map.background.id)
  if (!resourcesFit(ids)) throw Error('Theme replacements exceed the project image budget. Apply without asset replacement.')
  history.run('Apply ' + worldTheme(id)!.name, () => useProjectStore.setState(result.snapshot))
  if (useProjectStore.getState().map !== result.snapshot.map) throw Error('Theme could not be applied within the project metadata budget.')
  return result
}
