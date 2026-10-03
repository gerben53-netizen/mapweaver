import { texturePaintAssetIds } from '../domain/terrainPaint'
import { mapWorkspace } from '../domain/geography'
import { flatLayerTree } from '../domain/grouping'
import { objectAssetIds } from '../domain/areas'
import { contentHash, readImage } from '../imports/readImage'
import type { ValidatedImage } from '../imports/readImage'
import { parseProject, referencedAssets, extension } from './format'
import { PROJECT_LIMITS as L } from './limits'
import type { PreparedProject, ProjectInfo, ProjectAsset, AssetManifest } from './types'
import type { ProjectSnapshot } from '../store/history'
export type ImageValidator = (file: File) => Promise<ValidatedImage>
export async function gatherProject(state: ProjectSnapshot, info: ProjectInfo, validate: ImageValidator = readImage): Promise<PreparedProject> {
  const { resolveAsset } = await import('./assets')
  const assets = new Map<string, ProjectAsset>(), failures: string[] = []; const hashes = new Set<string>(); let total = 0, pixels = 0
  if (referencedAssets(state).size > L.assets) throw new Error('Project exceeds 512 logical assets.')
  for (const id of referencedAssets(state)) {
    try {
      const expected = state.objects.find((o) => objectAssetIds(o).includes(id))?.kind
      const source = await resolveAsset(id, state.map.background?.id === id, texturePaintAssetIds(state.map.texturePaint).includes(id) || expected === 'patternFill' || expected === 'area' || expected === 'path' ? 'fillPattern' : expected ? 'stamp' : undefined)
      const file = new File([source.blob], source.name, { type: source.blob.type })
      const image = await validate(file)
      const hash = await contentHash(source.blob)
      if (!hashes.has(hash)) { total += source.blob.size; pixels += image.width * image.height; hashes.add(hash) }
      if (total > L.unpacked || pixels > L.pixels) throw new Error('Project exceeds total image budget.')
      const manifest: AssetManifest = { id, kind: source.kind || 'stamp', fileName: state.map.background?.id === id ? state.map.background.name : source.name, mimeType: image.mimeType, width: image.width, height: image.height, hash, path: `assets/${hash}.${extension(image.mimeType)}` }
      assets.set(id, { manifest, blob: source.blob, thumbnail: image.thumbnail })
    } catch (error) { failures.push(`${id}: ${error instanceof Error ? error.message : 'unreadable image'}`) }
  }
  if (failures.length) throw new Error(`Cannot save required assets:\n${failures.join('\n')}`)
  const document = parseProject({ ...info, ...state, map:{...state.map,...mapWorkspace(state.map)}, objectGroups: state.objectGroups || [], layerTree: state.layerTree || flatLayerTree(state.layers), formatVersion: 12, assets: [...assets.values()].map((a) => a.manifest) })
  return { document, assets }
}
export { encodeProject, decodeProject, downloadName } from './codec'

