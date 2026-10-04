import { categoryResolution } from './stampGovernance'
import type { AssetManifest } from '../src/domain/assetManifest'
import { validateFamily, type StampFamily } from '../src/domain/stampFamilies'
import type { Storage } from './storage'

interface Image { entry: AssetManifest['assets'][number]; width: number; height: number; mimeType: string; digest: string }
interface Revision { packId: string; revision: number; definition: string }
function signature(f: NonNullable<AssetManifest['families']>[number], images: Image[]) {
  return { family: {id:f.id,revision:f.revision,displayName:f.displayName,coverVariantId:f.coverVariantId,anchor:f.anchor,variants:f.variants}, images: f.variants.map(v => { const image = images.find(i => i.entry.file === f.files[v.id]); if (!image) throw Error('Missing family image.'); return { id: v.id, hash: image.digest, width: image.width, height: image.height, metadata: {categoryId:categoryResolution(image.entry).categoryId,quality:image.entry.quality,defaultSize:image.entry.defaultSize,tags:image.entry.tags || [],applicableMapTypes:image.entry.applicableMapTypes || []} } }) }
}
export function validateImportedFamilies(s: Storage, manifest: AssetManifest, images: Image[]) {
  for (const f of manifest.families || []) {
    const incoming = signature(f, images)
    if (incoming.images.some(i => i.width !== incoming.images[0].width || i.height !== incoming.images[0].height || images.find(p => p.digest === i.hash)?.mimeType !== 'image/png')) throw Error('Family variants require identical PNG canvas dimensions and shared footprint.')
    if (new Set(incoming.images.map(i => i.hash)).size !== incoming.images.length) throw Error('Family variants must have distinct image content.')
    const rows = s.db.prepare('SELECT * FROM stamp_family_revisions WHERE id=? ORDER BY revision DESC').all(f.id) as Revision[]
    if (rows.some(r => r.packId !== manifest.pack!.id)) throw Error('Family ID belongs to another pack.')
    const exact = rows.find(r => r.revision === f.revision)
    if (exact && JSON.stringify(incoming) !== JSON.stringify(JSON.parse(exact.definition).signature)) throw Error('Conflicting immutable family revision.')
    if (rows[0] && f.revision < rows[0].revision && !exact) throw Error('Stale family revision.')
    for (const image of incoming.images) for (const row of rows) {
      const historical=(JSON.parse(row.definition).family as StampFamily).variants.find(v=>v.id===image.id)
      if(historical){const stored=s.asset(historical.assetId);if(stored.sha256!==image.hash||stored.width!==image.width||stored.height!==image.height)throw Error('Stable variant IDs cannot replace retired images. Use a new variant ID.')}
    }
    if (rows[0]) {
      const previous = JSON.parse(rows[0].definition).signature as ReturnType<typeof signature>
      if (incoming.family.coverVariantId !== previous.family.coverVariantId) throw Error('Keep the registered family cover stable across revisions.')
      const a = incoming.images[0], b = previous.images[0]
      for (const key of ['defaultSize','categoryId','quality','applicableMapTypes'] as const) if (JSON.stringify(a.metadata[key]) !== JSON.stringify(b.metadata[key])) throw Error('Family semantic metadata/footprint cannot change across revisions.')
      for (const image of incoming.images) {
        const old = previous.images.find(i => i.id === image.id)
        if (old && (old.hash !== image.hash || old.width !== image.width || old.height !== image.height)) throw Error('Stable variant IDs cannot replace their image. Use a new variant ID.')
      }
    }
  }
}
export function registerImportedFamilies(s: Storage, manifest: AssetManifest, images: Image[], ids: Map<string,string>) {
  for (const f of manifest.families || []) {
    const previous = s.db.prepare('SELECT * FROM stamp_family_revisions WHERE id=? ORDER BY revision DESC LIMIT 1').get(f.id) as Revision | undefined
    const variants = f.variants.map(v => ({ ...v, assetId: ids.get(f.files[v.id] + '/stamp')! }))
    const old = previous ? JSON.parse(previous.definition).family as StampFamily : undefined
    const metadata=images.find(i=>i.entry.file===f.files[f.coverVariantId])!.entry
    const family: StampFamily = { metadata:{defaultSize:metadata.defaultSize!,semanticClass:metadata.quality!.semanticClass!,softShadowDefault:metadata.quality!.softShadowDefault!,tags:metadata.tags || [],applicableMapTypes:metadata.applicableMapTypes || []}, id:f.id,revision:f.revision,displayName:f.displayName,coverVariantId:f.coverVariantId,anchor:f.anchor,variants: [...variants, ...(old?.variants || []).filter(v => !variants.some(n => n.id === v.id)).map(v => ({ ...v, deprecated: true }))] }
    validateFamily(family)
    if (previous && previous.revision > f.revision) continue
    for (const v of family.variants) {
      const row = s.asset(v.assetId)
      if (row.familyMember && row.familyMember !== f.id || row.family && JSON.parse(row.family).id !== f.id) throw Error('An image cannot belong to multiple families.')
      s.db.prepare('UPDATE assets SET family=NULL,familyMember=? WHERE id=?').run(f.id,v.assetId)
    }
    const cover = family.variants.find(v => v.id === family.coverVariantId)!
    s.db.prepare('UPDATE assets SET family=?,familyMember=NULL,name=?,tags=?,modifiedAt=? WHERE id=?').run(JSON.stringify(family),f.displayName,JSON.stringify(metadata.tags || []),new Date().toISOString(),cover.assetId)
    s.db.prepare('INSERT OR IGNORE INTO stamp_family_revisions VALUES(?,?,?,?)').run(f.id,manifest.pack!.id,f.revision,JSON.stringify({signature:signature(f,images),family}))
  }
}
