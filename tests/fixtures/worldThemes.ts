import { effectsFixture } from './mapEffects'
import { createArea } from '../../src/domain/areas'
import { defaultLandArea } from '../../src/domain/landAreas'
import { terrainAppearance } from '../../src/domain/terrainStyles'
import { createMapElement } from '../../src/domain/decorations'
import { api, uploadAsset } from '../../src/storage/api'
import { resolveAsset } from '../../src/projects/assets'
import type { MapDocument } from '../../src/domain/models'
import type { GeneratorMetadata } from '../../src/domain/generatorAssets'

/** Isolated QA art, never installed into the user's library. */
export async function themeFixture(map: MapDocument) {
  const manifest=await fetch('/world-assets/mapweaver-assets.json').then(r=>r.json()) as {assets:{generator:GeneratorMetadata;defaultSize:unknown}[]}
  const fixture = await effectsFixture(map)
  const sources = [...new Set(fixture.objects.filter(o => o.kind === 'stamp').map(o => o.assetId))]
  for (const [i, id] of sources.entries()) {
    const semanticType = i === 0 ? 'forestCluster' : 'mountain'
    const entry = manifest.assets.find(a => a.generator.semanticType === semanticType)!,template=entry.generator
    const original = await createImageBitmap((await resolveAsset(id)).blob)
    for (const [family, color] of [['genericFantasy', null], ['painterlyFantasy', '#568465'], ['parchment', '#947a50'], ['darkFantasy', '#6b7683']] as const) {
      let assetId = id
      if (color) {
        const c = document.createElement('canvas'); c.width = original.width; c.height = original.height; const ctx = c.getContext('2d')!
        ctx.drawImage(original, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = .5; ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height)
        const blob = await new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/png'))
        assetId = (await uploadAsset(blob, 'stamp', family + ' ' + semanticType, family + '-' + semanticType + '.png')).asset.id
      }
      const { revision } = await api<{revision:number}>('/library')
      await api('/library/command', 'POST', { op: 'metadata', revision, ids: [assetId], patch: { defaultSize:entry.defaultSize,generator: { ...template, themes: [family] }, applicableMapTypes: ['world-map', 'regional-map'] } })
    }
    original.close()
  }
  const land = createArea({ polygons: [{ outer: [{x:30,y:180},{x:170,y:150},{x:320,y:80},{x:480,y:90},{x:550,y:145},{x:880,y:125},{x:1020,y:175},{x:1130,y:330},{x:1080,y:500},{x:1180,y:675},{x:1090,y:765},{x:820,y:735},{x:640,y:700},{x:520,y:735},{x:300,y:710},{x:65,y:675},{x:40,y:500},{x:80,y:350}], holes: [] }] })
  land.id = 'terrain'; land.name = 'Main continent'; land.land = { ...defaultLandArea('landmass'), appearance: terrainAppearance('land', map.width) }
  fixture.objects[0] = land
  const desert = createArea({ polygons: [{outer:[{x:220,y:240},{x:410,y:240},{x:445,y:395},{x:325,y:500},{x:165,y:440}],holes:[]}] }); desert.id='desert'; desert.land={...defaultLandArea('terrain-region'),terrain:'desert',appearance:terrainAppearance('desert',map.width)}
  fixture.objects.push(desert); fixture.layers.find(l=>l.id==='terrain')!.objectIds.push(desert.id)
  for (const kind of ['legend','scaleBar'] as const) { const o=createMapElement(kind,{x:990,y:650},map,kind==='legend'?[{id:'entry',text:'Highlands',placeType:'landmark',color:'#6f7865'}]:[]);o.id=kind;if(kind==='legend'){o.width=175;o.height=90;o.y=540}else{o.width=170;o.y=700}fixture.objects.push(o);fixture.layers.find(l=>l.id==='annotations')!.objectIds.push(o.id) }
  // Keep annotation art above terrain even when a theme intentionally disables fog.
  fixture.layers.sort((a,b)=>a.id==='annotations'?-1:b.id==='annotations'?1:0)
  fixture.layerTree.roots=fixture.layers.map(l=>l.id)
  return fixture
}
