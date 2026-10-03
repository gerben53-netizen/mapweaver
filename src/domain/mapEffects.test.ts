import { softShadowStyle } from './mapEffects'
import { beforeEach, expect, it } from 'vitest'
import { defaultMapEffects, defaultStampEffects, FOG_PRESETS, VIGNETTE_PRESETS, FRAME_PRESETS, framePreset, validateMapEffects, validateStampEffects, effectOrder, frameBounds } from './mapEffects'
import { defaultMapStyle, normalizeMapSettings } from './mapSettings'
import { defaultGeography } from './geography'
import { createArea, rectangleGeometry } from './areas'
import { createMapElement } from './decorations'
import { flatLayerTree } from './grouping'
import { parseProject } from '../projects/format'
import { encodeProject, decodeProject } from '../projects/archive'
import { exportScene } from '../export/scene'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { setStampEffects } from '../store/effectActions'
import type { MapDocument, StampObject } from './models'
import { stampEffectPadding } from '../canvas/drawStampEffects'
import { captureSource } from './prefabs'

const map = (): MapDocument => ({ campfireRevision: 1, width: 1000, height: 700, ...defaultMapStyle(), background: null, mapType: 'world-map', geography: defaultGeography('world-map') })
const stamp: StampObject = { kind: 'stamp', id: 'stamp', assetId: 'image', x: 30, y: 40, width: 100, height: 80, rotation: 30, scaleX: -1, scaleY: 1, opacity: .7 }
function project() { const o = createArea(rectangleGeometry({ x: 20, y: 20, width: 500, height: 500 })), layers = [{ id: 'layer', name: 'Map', visible: true, locked: false, objectIds: [o.id] }]; return { formatVersion: 12 as const, id: 'effects', name: 'Effects', createdAt: '2026-09-25T00:00:00.000Z', modifiedAt: '2026-09-25T00:00:00.000Z', assets: [], map: map(), objects: [o], layers, objectGroups: [], layerTree: flatLayerTree(layers) } }
beforeEach(() => { store.setState(project()); editor.setState({ activeLayerId: 'layer', soloLayerId: null, selectedObjectIds: [] }); history.reset() })
it('validates every preset and rejects unknown versions, fields, IDs and unbounded values', () => {
  for (const f of Object.values(FOG_PRESETS)) for (const v of Object.values(VIGNETTE_PRESETS)) for (const id of Object.keys(FRAME_PRESETS) as (keyof typeof FRAME_PRESETS)[]) expect(validateMapEffects({ ...defaultMapEffects(), fog: { ...f.style, areaId: null }, vignette: v.style, frame: framePreset(id) }).version).toBe(1)
  for (const patch of [{ version: 2 }, { extra: true }, { fog: { ...defaultMapEffects().fog, scale: 0 } }, { frame: { ...defaultMapEffects().frame, preset: 'toString' } }, { vignette: { ...defaultMapEffects().vignette, amount: NaN } }, { fog: { ...defaultMapEffects().fog, areaId: '../file' } }]) expect(() => validateMapEffects({ ...defaultMapEffects(), ...patch })).toThrow()
  expect(validateStampEffects(defaultStampEffects())).toEqual(defaultStampEffects())
  for (const patch of [{ blur: Infinity }, { opacity: -1 }, { x: 129 }, { color: 'red' }, { extra: true }]) expect(() => validateStampEffects({ ...defaultStampEffects(), shadow: { ...defaultStampEffects().shadow, ...patch } })).toThrow()
})
it('round-trips map effects through archives and leaves old maps exactly unstyled', async () => {
  const p = project(), old = structuredClone(p)
  expect(parseProject(p)).toEqual(old); expect(parseProject(p).map.effects).toBeUndefined()
  p.map.effects = defaultMapEffects(); p.map.effects.fog.enabled = true; p.map.effects.fog.areaId = p.objects[0].id; p.map.effects.frame = framePreset('border.elven')
  const result = await decodeProject(await encodeProject({ document: p, assets: new Map() }))
  expect(result.document).toEqual(p)
  expect(normalizeMapSettings({ ...p.map, width: 2000 }).effects).toEqual(p.map.effects)
})
it('preserves old stamp data and admits only validated stamp effects', () => {
  const p = project(), doc = { ...p, objects: [stamp], layers: [{ ...p.layers[0], objectIds: [stamp.id] }], assets: [{ id: 'image', kind: 'stamp', fileName: 'image.png', mimeType: 'image/png', width: 100, height: 80, hash: 'a'.repeat(64), path: 'assets/image.png' }] }
  expect(parseProject(doc).objects[0]).toEqual(stamp)
  const styled = { ...stamp, effects: defaultStampEffects() }; styled.effects.glow.enabled = true
  expect(parseProject({ ...doc, objects: [styled] }).objects[0]).toEqual(styled)
  expect(() => parseProject({ ...doc, objects: [{ ...styled, effects: { ...styled.effects, version: 2 } }] })).toThrow()
})
it('inserts fog before annotation objects only when enabled, then vignette/frame, at both export resolutions', () => {
  const p = project(), label = createMapElement('title', { x: 200, y: 100 }, p.map), objects = [label, ...p.objects]
  const ordered = { ...p, objects, layers: [{ ...p.layers[0], objectIds: objects.map(o => o.id) }] }
  expect(effectOrder(objects)).toBe(objects)
  ordered.map.effects = defaultMapEffects(); ordered.map.effects.fog.enabled = true; ordered.map.effects.frame.enabled = true
  expect(effectOrder(objects, ordered.map.effects).map(o => o.id)).toEqual([p.objects[0].id, label.id])
  for (const scale of [1, 2] as const) {
    const scene = exportScene(ordered, { scale, transparent: true, includeGrid: false })
    expect(scene.items.map(i => i.kind === 'object' ? i.object.id : i.kind)).toEqual([p.objects[0].id, 'fog', label.id, 'finish'])
    expect(scene.map.effects).toEqual(ordered.map.effects); expect(scene.width).toBe(p.map.width * scale)
  }
  ordered.map.effects.fog.enabled = false
  expect(effectOrder(objects, ordered.map.effects)).toBe(objects)
})
it('keeps every frame inside resized wide, tall, tiny and square map bounds', () => {
  for (const id of Object.keys(FRAME_PRESETS) as (keyof typeof FRAME_PRESETS)[]) for (const [w, h] of [[1, 1], [40, 80], [4000, 300], [300, 4000], [800, 800]]) {
    const b = frameBounds(w, h, { ...framePreset(id), inset: 256, thickness: 12 })
    expect(b.x - b.stroke / 2).toBeGreaterThanOrEqual(0); expect(b.y - b.stroke / 2).toBeGreaterThanOrEqual(0)
    expect(b.width).toBeGreaterThan(0); expect(b.height).toBeGreaterThan(0); expect(b.x + b.width + b.stroke / 2).toBeLessThanOrEqual(w + 1e-6)
  }
})
it('groups map/frame edits into one history entry, supports hide/removal and preserves dimensions', () => {
  const before = store.getState().map, effects = defaultMapEffects(); effects.frame = framePreset('border.fantasyOrnate'); effects.vignette.enabled = true
  store.getState().applyMapSettings({ ...before, effects }, () => true)
  expect(useHistoryStore.getState().undoCount).toBe(1); history.undo(); expect(store.getState().map).toEqual({ ...before, campfireRevision: 3 }); history.redo(); expect(store.getState().map.effects).toEqual(effects)
  store.getState().applyMapSettings({ ...store.getState().map, effects: undefined }, () => true); expect(store.getState().map.effects).toBeUndefined(); history.undo(); expect(store.getState().map.effects).toEqual(effects)
})
it('changes only editable stamp style in one undo step and bounds local effect padding', () => {
  store.setState({ objects: [stamp], layers: [{ id: 'layer', name: 'Layer', objectIds: [stamp.id], visible: true, locked: false }], layerTree: null }); history.reset()
  const effects = defaultStampEffects(); effects.shadow.enabled = effects.glow.enabled = true; effects.shadow.x = -100; effects.shadow.blur = 30
  setStampEffects(stamp.id, effects); expect(useHistoryStore.getState().undoCount).toBe(1); expect(store.getState().objects[0]).toEqual({ ...stamp, effects }); expect(stampEffectPadding({ ...stamp, effects })).toBe(192)
  history.undo(); expect(store.getState().objects[0]).toEqual(stamp); history.redo()
  store.setState({ objects: [{ ...stamp, locked: true }] }); expect(() => setStampEffects(stamp.id, effects)).toThrow()
})
it('does not capture map-bound atmosphere or frame inside an object prefab', () => {
  const p = project(); p.map.effects = defaultMapEffects(); p.map.effects.frame.enabled = true
  expect(captureSource(p, { kind: 'selection', ids: [p.objects[0].id] }).content.map.effects).toBeUndefined()
})

it('validates optional soft shadow settings without changing legacy defaults',()=>{
 expect(softShadowStyle(stamp).enabled).toBe(false)
 const effects={...defaultMapEffects(),stampSoftShadow:{enabled:true,intensity:.25}}
 expect(validateMapEffects(effects)).toEqual(effects)
 expect(softShadowStyle(stamp,effects)).toMatchObject({enabled:true,opacity:.25})
 for(const override of ['default','on','off'] as const){const o={...stamp,effects:{...defaultStampEffects(),softShadow:override}};expect(validateStampEffects(o.effects)).toEqual(o.effects);expect(softShadowStyle(o,effects).enabled).toBe(override!=='off');expect(softShadowStyle(o).enabled).toBe(override==='on')}
 for(const intensity of [-1,1.1,NaN,Infinity])expect(()=>validateMapEffects({...effects,stampSoftShadow:{enabled:true,intensity}})).toThrow()
 expect(()=>validateStampEffects({...defaultStampEffects(),softShadow:'auto'})).toThrow()
 expect(softShadowStyle(stamp,{...effects,stampSoftShadow:{enabled:true,intensity:0}}).enabled).toBe(false)
})
it('scales contact softness with map size, not translation, rotation or reflection',()=>{
 const effects={...defaultMapEffects(),stampSoftShadow:{enabled:true,intensity:.25}},base=softShadowStyle(stamp,effects)
 expect(softShadowStyle({...stamp,x:100,rotation:173,scaleX:1,scaleY:-1},effects)).toEqual(base)
 expect(softShadowStyle({...stamp,width:5,height:5},effects).blur).toBeLessThan(base.blur)
 expect(softShadowStyle({...stamp,width:400,height:400},effects).blur).toBeGreaterThan(base.blur)
})
it('serializes scene and stamp soft shadow with duplication and exact history',()=>{
 const p=project(),effects={...defaultStampEffects(),softShadow:'off' as const},o={...stamp,effects}
 const doc={...p,map:{...p.map,effects:{...defaultMapEffects(),stampSoftShadow:{enabled:true,intensity:.25}}},objects:[o],layers:[{...p.layers[0],objectIds:[o.id]}],assets:[{id:'image',kind:'stamp',fileName:'image.png',mimeType:'image/png',width:100,height:80,hash:'a'.repeat(64),path:'assets/image.png'}]}
 expect(parseProject(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
 store.setState({...doc,layerTree:null});editor.setState({selectedObjectIds:[o.id]});history.reset()
 setStampEffects(o.id,{...effects,softShadow:'on'});history.undo();expect(store.getState().objects[0]).toEqual(o);history.redo();expect(store.getState().objects[0]).toMatchObject({effects:{softShadow:'on'}})
 store.getState().duplicate();expect(store.getState().objects[1]).toMatchObject({effects:{softShadow:'on'},rotation:30,scaleX:-1});history.undo();expect(store.getState().objects).toHaveLength(1)
})
