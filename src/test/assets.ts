import type { AssetKind } from '../domain/models'
import { installProjectAssets } from '../projects/assets'
export function registerTestAssets(kinds: Record<string, AssetKind>) {
  installProjectAssets(new Map(Object.entries(kinds).map(([id, kind]) => [id, { blob: new Blob(['test']), manifest: { id, kind, fileName: id, mimeType: 'image/png', width: 40, height: 60, hash: 'a'.repeat(64), path: `assets/${id}.png` } }])))
}
