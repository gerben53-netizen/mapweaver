import { seededRandom } from '../../src/domain/seededRandom'
import { riverFixture } from './riverStyling'
import { createLabel } from '../../src/domain/annotations'
import { createMapElement } from '../../src/domain/decorations'
import { defaultStampEffects } from '../../src/domain/mapEffects'
import type { MapDocument, MapObject, StampObject } from '../../src/domain/models'
import { adoptLibraryAsset } from '../../src/projects/assets'
import { uploadAsset } from '../../src/storage/api'
import { toAsset } from '../../src/storage/remoteLibrary'

export async function effectsFixture(map: MapDocument) {
  const assetIds = new Map<string, string>()
  for (const kind of ['tree', 'mountain']) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const c = canvas.getContext('2d')!
    if (kind === 'tree') {
      c.fillStyle = '#695235'; c.fillRect(58, 76, 12, 42)
      for (const [x,y,r] of [[38,62,26],[83,58,27],[64,35,29],[61,76,31]]) { c.fillStyle = '#3c6751'; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill(); c.strokeStyle = '#233e38'; c.lineWidth = 2; c.stroke() }
      c.fillStyle = '#7e9d68'; c.beginPath(); c.ellipse(51,32,18,11,-.5,0,Math.PI*2); c.fill()
    } else {
      c.fillStyle = '#8e927f'; c.strokeStyle = '#4b5b56'; c.lineWidth = 3; c.beginPath(); c.moveTo(8,110); c.lineTo(57,15); c.lineTo(118,110); c.closePath(); c.fill(); c.stroke()
      c.fillStyle = '#d9dbc8'; c.beginPath(); c.moveTo(57,15); c.lineTo(41,47); c.lineTo(58,40); c.lineTo(75,48); c.closePath(); c.fill()
      c.fillStyle = '#5c7067'; c.beginPath(); c.moveTo(57,40); c.lineTo(118,110); c.lineTo(67,106); c.closePath(); c.fill()
    }
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
    const result = await uploadAsset(blob, 'stamp', kind, kind+'.png')
    const asset = await adoptLibraryAsset(toAsset(result.asset)); assetIds.set(kind, asset.id)
  }
  const objects: MapObject[] = riverFixture()
  const shadows = defaultStampEffects(); shadows.shadow.enabled = true
  const stamps: StampObject[] = Array.from({ length: 120 }, (_, i) => {
    const tree = i < 90, index = tree ? i : i - 90
    return { kind: 'stamp', id: 'stamp-'+i, assetId: assetIds.get(tree ? 'tree' : 'mountain')!, name: tree ? 'Forest canopy' : 'Highland peak', x: tree ? 600+(index%15)*25+seededRandom(32,index,0)*16 : 75+(index%10)*31+seededRandom(32,index,0)*10, y: tree ? 165+Math.floor(index/15)*31+seededRandom(32,index,1)*18 : 530+Math.floor(index/10)*37+seededRandom(32,index,1)*10, width: tree ? 30 : 47, height: tree ? 30 : 47, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, ...(i%3===0?{effects:structuredClone(shadows)}:{}) }
  })
  stamps[0].effects = defaultStampEffects(); stamps[0].effects.glow.enabled = true; stamps[0].effects.glow.opacity = .8; stamps[0].effects.glow.radius = 20; stamps[0].name = 'Arcane tree'
  const title = createMapElement('title', { x: 170, y: 55 }, map, [], 'parchment'); title.id = 'title'
  if (title.kind === 'title') { title.title = 'The Mistwood Vale'; title.body = 'An atlas of the eastern reaches'; title.width = 330; title.height = 100; title.x = 60; title.y = 40 }
  const label = createLabel({ x: 820, y: 365 }, 'MISTWOOD', undefined, 'center', 'world-map'); label.id = 'label'
  const compass = createMapElement('compass', { x: 1090, y: 100 }, map, [], 'classic'); compass.id = 'compass'
  objects.push(...stamps, title, label, compass)
  // Existing front-to-back Layers convention; labels deliberately start under art
  // so enabling fog exercises the explicit annotation boundary.
  const layers = [{ id: 'rivers', name: 'Rivers', visible: true, locked: false, objectIds: ['main','left','right'] }, { id: 'stamps', name: 'Terrain stamps', visible: true, locked: false, objectIds: stamps.map(o=>o.id) }, { id: 'annotations', name: 'Map elements', visible: true, locked: false, objectIds: ['title','label','compass'] }, { id: 'terrain', name: 'Terrain', visible: true, locked: false, objectIds: ['terrain','forest'] }]
  return { objects, layers, objectGroups: [], layerTree: { roots: layers.map(l=>l.id), groups: [] } }
}
