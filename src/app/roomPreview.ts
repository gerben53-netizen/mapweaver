import { generateRoom, type RoomRecipe } from '../domain/roomGenerator'
import type { MapDocument } from '../domain/models'
import { objectAssetIds } from '../domain/areas'
import { defaultLayer } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
import { acquireAssetImage, acquireImage } from '../images/imageCache'
import { libraryRepository } from '../storage/libraryRepository'
import { exportScene } from '../export/scene'

/** A bounded thumbnail from the normal export renderer, never the live project/store. */
export interface RoomPreviewSources { floor?: string; wall?: string }
export async function roomPreview(map: MapDocument, input: RoomRecipe, sources: RoomPreviewSources) {
  // Project/library IDs can collide. Temporary IDs preserve each selected source's identity.
  const recipe = structuredClone(input), librarySources = new Map<string, string>()
  if (sources.floor && recipe.floor.kind === 'pattern') { recipe.floor.assetId = 'room-preview-floor'; librarySources.set(recipe.floor.assetId, sources.floor) }
  if (sources.wall && recipe.walls.stroke.kind === 'texture') { recipe.walls.stroke.assetId = 'room-preview-wall'; librarySources.set(recipe.walls.stroke.assetId, sources.wall) }
  const initial = generateRoom(map, recipe, { x: 0, y: 0 })
  const padding = Math.max(32, recipe.walls.strokeWidth * 2)
  const width = Math.ceil(initial.width + padding * 2), height = Math.ceil(initial.height + padding * 2)
  const room = generateRoom(map, recipe, { x: width / 2, y: height / 2 })
  const leases = [...new Set(room.objects.flatMap(objectAssetIds))].map(id => ({ id, lease: librarySources.has(id)
    ? acquireImage(`room-library:${librarySources.get(id)!}`, () => libraryRepository.getBlob(librarySources.get(id)!)) : acquireAssetImage(id, 'fillPattern') }))
  try {
    const images = new Map(await Promise.all(leases.map(async ({ id, lease }) => [id, await lease.promise] as const)))
    const { buildScene } = await import('../export/render')
    const scene = exportScene({ map: { ...defaultMapStyle(), width, height, background: null }, objects: room.objects,
      layers: [{ ...defaultLayer(), objectIds: room.objects.map(o => o.id) }], objectGroups: [], layerTree: null }, { scale: 1, transparent: false, includeGrid: false })
    const root = buildScene(scene, images)
    try {
      const canvas = root.toCanvas({ x: 0, y: 0, width, height, pixelRatio: Math.min(600 / width, 420 / height, 1) })
      try { return canvas.toDataURL('image/png') } finally { canvas.width = canvas.height = 0 }
    } finally { root.destroy() }
  } finally { leases.forEach(({ lease }) => lease.release()) }
}
