import { beforeEach, expect, it } from 'vitest'
import { WORLD_MAP_THEMES, worldTheme, validateWorldThemeState } from './worldThemes'
import { applyWorldTheme, compatibleThemeAsset } from './applyWorldTheme'
import { TERRAIN_STYLES, WATER_STYLES, COAST_STYLES } from './terrainStyles'
import { RIVER_PRESETS } from './riverPresets'
import { FRAME_PRESETS, FOG_PRESETS, VIGNETTE_PRESETS } from './mapEffects'
import { CARTOGRAPHIC_ELEMENT_PRESETS } from './cartographicPresets'
import { fontEntry } from '../fonts/registry'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { createLabel, restyleLabel } from './annotations'
import { createMapElement } from './decorations'
import { flatLayerTree } from './grouping'
import { riverFixture } from '../../tests/fixtures/riverStyling'
import { parseProject } from '../projects/format'
import { encodeProject, decodeProject } from '../projects/archive'
import { history, useHistoryStore } from '../store/history'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { applyTheme } from '../projects/applyTheme'
import { currentSnapshot } from '../projects/session'
import type { MapDocument, MapObject, StampObject } from './models'
import type { WorldScatterAsset } from '../world/scatterModel'
import manifest from '../../public/world-assets/mapweaver-assets.json'
import { themeWorld, themeWorldAssets } from '../world/themeWorld'
import { generateWorld } from '../world/generate'
import { WORLD_DEFAULTS } from '../world/model'
import { scatterWorld } from '../world/scatterWorld'

const all = { reset: false, elements: true, assets: false }
const themeIds = Object.keys(WORLD_MAP_THEMES)
const map = (): MapDocument => ({ width: 1200, height: 800, ...defaultMapStyle(), background: null, mapType: 'world-map', geography: defaultGeography('world-map') })
function project() {
  const m = map(), objects: MapObject[] = [...riverFixture(), createLabel({ x: 700, y: 380 }, 'Ancient lands'), createMapElement('title', { x: 200, y: 70 }, m), createMapElement('compass', { x: 1100, y: 80 }, m)]
  const layers = [{ id: 'layer', name: 'Map', visible: true, locked: false, objectIds: objects.map(o => o.id) }]
  return { formatVersion: 12 as const, id: 'themes', name: 'Themes', createdAt: '2026-09-25T00:00:00.000Z', modifiedAt: '2026-09-25T00:00:00.000Z', assets: [], map: m, objects, layers, objectGroups: [], layerTree: flatLayerTree(layers) }
}
const geometry = (objects: MapObject[]) => objects.map(o => ({ id: o.id, kind: o.kind, ...(o.kind === 'area' ? { geometry: o.geometry, role: o.land?.role, terrain: o.land?.terrain } : o.kind === 'path' ? { nodes: o.nodes, closed: o.closed, widths: o.route?.kind === 'river' ? [o.route.startWidth, o.route.endWidth, o.route.startFactor, o.route.endFactor, o.route.unit, o.route.pixelsPerUnit, o.route.appearance?.smoothing, o.route.appearance?.widthMode] : [] } : o.kind === 'label' ? { text: o.text, anchorX: o.x + o.width * o.anchor.x, anchorY: o.y + o.height * o.anchor.y } : { x: o.x, y: o.y, width: o.width, height: o.height }) }))
const assets = manifest.assets.map((a, i) => ({ id: 'asset-' + i, type: 'stamp', name: a.title, width: 640, height: 480, generator: a.generator, defaultSize: a.defaultSize, applicableMapTypes: a.applicableMapTypes })) as WorldScatterAsset[]
beforeEach(() => { store.setState(project()); useEditorStore.setState({ activeLayerId: 'layer', selectedObjectIds: [], soloLayerId: null }); history.reset() })
it('provides five stable complete themes with real existing presets and bundled fonts', () => {
  expect(themeIds).toEqual(['world.painterlyFantasy','world.classicParchment','world.darkFantasy','world.minimalPolitical','world.elvenElegant'])
  for (const [id, t] of Object.entries(WORLD_MAP_THEMES)) {
    expect(t.id).toBe(id); expect(t.mapTypes).toEqual(['world-map', 'regional-map']); expect(Object.keys(t.terrain)).toHaveLength(11)
    for (const role of Object.values(t.terrain)) { expect(TERRAIN_STYLES[role.style]).toBeTruthy(); expect(role.color).toMatch(/^#[a-f0-9]{6}$/) }
    expect(WATER_STYLES[t.water]).toBeTruthy(); expect(COAST_STYLES[t.coast]).toBeTruthy(); expect(RIVER_PRESETS[t.river]).toBeTruthy(); expect(FRAME_PRESETS[t.frame]).toBeTruthy()
    if (t.fog) expect(FOG_PRESETS[t.fog]).toBeTruthy(); if (t.vignette) expect(VIGNETTE_PRESETS[t.vignette]).toBeTruthy()
    expect(fontEntry(t.font)).toBeTruthy(); expect(fontEntry(t.titleFont)).toBeTruthy()
    for (const [kind, id] of Object.entries(t.elements)) expect(CARTOGRAPHIC_ELEMENT_PRESETS[kind as keyof typeof t.elements].some(p => p.id === id)).toBe(true)
  }
  expect(worldTheme('constructor')).toBeUndefined()
})
it.each(themeIds)('applies %s without changing semantic geometry, text, layers or input', id => {
  const p = project(), before = structuredClone(p), { snapshot: s } = applyWorldTheme(p, id, all), t = WORLD_MAP_THEMES[id]
  expect(p).toEqual(before); expect(geometry(s.objects)).toEqual(geometry(p.objects)); expect(s.layers).toBe(p.layers); expect(s.layerTree).toBe(p.layerTree)
  expect(s.map.water?.style).toBe(t.water); expect(s.map.effects?.frame.preset).toBe(t.frame)
  const forest = s.objects.find(o => o.id === 'forest'); expect(forest?.kind === 'area' && forest.land?.appearance?.color).toBe(t.terrain.forest.color)
  expect(s.objects.find(o => o.id === 'main')).toMatchObject({ route: { preset: t.river } })
  expect(validateWorldThemeState(s.map.theme)).toEqual(s.map.theme)
  expect(parseProject({ ...p, ...s }).map.theme).toEqual(s.map.theme)
})
it('preserves field overrides across switches; reset restores visuals, never geography', () => {
  const p = applyWorldTheme(project(), themeIds[0], all).snapshot
  p.map.effects!.frame.color = '#ff0000'; p.map.water!.textureOpacity = .07
  const forest = p.objects.find(o => o.id === 'forest')!; if (forest.kind === 'area') forest.land!.appearance!.color = '#112233'
  const label = p.objects.find(o => o.kind === 'label')!; if (label.kind === 'label') p.objects[p.objects.indexOf(label)] = restyleLabel(label, { ...label.style, font: 'sourcesans3', italic: true }, 'My own words')
  const normal = applyWorldTheme(p, themeIds[1], all)
  expect(normal.overridden).toBeGreaterThan(0); expect(normal.snapshot.map.effects!.frame.color).toBe('#ff0000'); expect(normal.snapshot.map.water!.textureOpacity).toBe(.07)
  expect(normal.snapshot.objects.find(o => o.id === 'forest')).toMatchObject({ land: { appearance: { color: '#112233' } } })
  expect(normal.snapshot.objects.find(o => o.kind === 'label')).toMatchObject({ text: 'My own words', style: { font: 'sourcesans3', italic: true } })
  const reset = applyWorldTheme(normal.snapshot, themeIds[1], { ...all, reset: true }).snapshot
  expect(reset.map.effects!.frame.color).toBe(FRAME_PRESETS['border.parchment'].color); expect(geometry(reset.objects)).toEqual(geometry(p.objects))
  expect(reset.objects.find(o => o.kind === 'label')).toMatchObject({ text: 'My own words', style: { font: 'imfellenglish', italic: false } })
})
it('leaves old documents and annotations unchanged until explicitly adopted, then follows defaults', () => {
  const p = project(); expect(parseProject(p).map.theme).toBeUndefined()
  const first = applyWorldTheme(p, themeIds[0], { ...all, elements: false }).snapshot
  expect(first.objects.find(o => o.kind === 'title')).toEqual(p.objects.find(o => o.kind === 'title'))
  const adopted = applyWorldTheme(first, themeIds[1], all).snapshot
  const next = applyWorldTheme(adopted, themeIds[2], { ...all, elements: false }).snapshot
  expect(next.objects.find(o => o.kind === 'title')).toMatchObject({ style: { font: 'cinzel' }, elementPreset: 'plaque' })
  expect(() => applyWorldTheme({ ...p, map: { ...p.map, mapType: 'battlemap' } }, themeIds[0])).toThrow()
})
it('preserves hidden/locked content, imported fills, removed optional appearance and unrelated objects', () => {
  const p = project(); p.objects[0].locked = true
  const area = p.objects[1]; if (area.kind === 'area') area.fill = { kind: 'pattern', assetId: 'custom', mode: 'repeat', scale: 1, rotation: 0, offsetX: 0, offsetY: 0 }
  const s = applyWorldTheme(p, themeIds[0], all).snapshot; expect(s.objects[0]).toBe(p.objects[0]); expect(s.objects[1]).toBe(p.objects[1])
  const a = applyWorldTheme(project(), themeIds[0], all).snapshot
  if (a.objects[1].kind === 'area') a.objects[1].land!.appearance = undefined
  expect(applyWorldTheme(a, themeIds[1], all).snapshot.objects[1]).toMatchObject({ land: { appearance: undefined } })
})
it('remaps semantic families deterministically without moving, resizing, rotating or replacing IDs', () => {
  const source = assets[0], target = { ...source, id: 'parchment', generator: { ...source.generator, themes: ['parchment' as const] } }, candidates = [source, target]
  const t = WORLD_MAP_THEMES[themeIds[1]]
  expect(compatibleThemeAsset(source, candidates, t, 'world-map', 'stamp')).toEqual(target)
  expect(compatibleThemeAsset(source, [...candidates].reverse(), t, 'world-map', 'stamp')).toEqual(target)
  const stamp: StampObject = { kind: 'stamp', id: 'stamp', assetId: source.id, x: 91, y: 83, width: 36, height: 25, rotation: 23, scaleX: -1, scaleY: 1, opacity: 1 }
  const p = project(); p.objects.push(stamp); p.layers[0].objectIds.push(stamp.id)
  const s = applyWorldTheme(p, t.id, { ...all, assets: true }, candidates)
  expect(s.remapped).toBe(1); expect(s.snapshot.objects.at(-1)).toMatchObject({ ...stamp, assetId: target.id })
  expect(applyWorldTheme(p, t.id, { ...all, assets: true }, [source]).snapshot.objects.at(-1)).toMatchObject(stamp)
})
it('applies and undoes/redoes one complete transaction; new elements get managed theme defaults', async () => {
  const before = currentSnapshot(); await applyTheme(themeIds[2], all)
  expect(useHistoryStore.getState().undoCount).toBe(1); const after = currentSnapshot(); history.undo(); expect(currentSnapshot()).toEqual(before); history.redo(); expect(currentSnapshot()).toEqual(after)
  const title = createMapElement('title', { x: 400, y: 60 }, after.map), label = createLabel({ x: 400, y: 300 }, 'New city', undefined, 'center', 'world-map', after.map.theme!.id)
  expect(title).toMatchObject({ elementPreset: 'plaque', style: { font: 'cinzel', color: '#eee6d2' } }); expect(label.style.font).toBe('spectral')
  store.getState().addAnnotations([title, label]); await applyTheme(themeIds[1], { ...all, elements: false })
  expect(store.getState().objects.find(o => o.id === label.id)).toMatchObject({ style: { font: 'imfellenglish' } })
})
it('round trips optional theme and unknown IDs without losing direct render values', async () => {
  const p = project(), themed = { ...p, ...applyWorldTheme(p, themeIds[2], all).snapshot }
  themed.map.theme!.id = 'future.unavailable'
  const parsed = parseProject(themed); expect(worldTheme(parsed.map.theme!.id)).toBeUndefined(); expect(parsed.map).toEqual(themed.map)
  const encoded = await encodeProject({document:themed, assets:new Map()}), decoded = await decodeProject(encoded)
  expect(decoded.document.map).toEqual(themed.map); expect(decoded.document.objects).toEqual(themed.objects)
  expect(() => validateWorldThemeState({ ...themed.map.theme, managed: { a: { 'constructor.x': '0000000000000000' } } })).toThrow()
})
it('themes generator output while retaining provenance and selecting only the requested family', () => {
  const base = generateWorld({ ...WORLD_DEFAULTS, width: 1200, height: 800 }), id = themeIds[1]
  const matching = assets.map(a => ({ ...a, id: a.id + '-parchment', generator: { ...a.generator, themes: ['parchment' as const] } }))
  const eligible = themeWorldAssets([...assets, ...matching], id)
  expect(eligible).toEqual(matching)
  const scatter = scatterWorld(base, { mountains: 'low', forests: 'low', details: 'low', theme: 'parchment' }, eligible), themed = themeWorld(scatter, id)
  expect(themed.map.generation).toEqual(scatter.map.generation); expect(themed.map.theme!.id).toBe(id); expect(themed.map.effects?.frame.preset).toBe('border.parchment')
  expect(themed.objects.filter(o => o.kind === 'stamp').every(o => o.assetId.endsWith('-parchment'))).toBe(true)
})
it('keeps managing stamp appearance when image replacement is disabled or metadata is unavailable', () => {
  const p=project(),stamp:StampObject={kind:'stamp',id:'semantic-stamp',assetId:assets[0].id,x:10,y:20,width:30,height:25,rotation:0,scaleX:1,scaleY:1,opacity:1}
  p.objects.push(stamp);p.layers[0].objectIds.push(stamp.id)
  const minimal=applyWorldTheme(p,themeIds[3],{...all,assets:true},assets).snapshot
  expect(minimal.objects.at(-1)?.opacity).toBe(.18)
  const fantasy=applyWorldTheme(minimal,themeIds[0],all).snapshot
  expect(fantasy.objects.at(-1)).toMatchObject({...stamp,effects:{shadow:{enabled:true}}})
})
it('does not infer world defaults after changing a themed map to a battlemap', () => {
  const themed=applyWorldTheme(project(),themeIds[2],all).snapshot.map,battle={...themed,mapType:'battlemap' as const},plain={...battle,theme:undefined}
  const title=createMapElement('title',{x:100,y:100},battle),expected=createMapElement('title',{x:100,y:100},plain)
  expect(title.kind==='title'&&title.style).toEqual(expected.kind==='title'&&expected.style)
  const owner=createMapElement('place',{x:100,y:100},battle)
  expect(createLabel({x:0,y:0},'Note',owner,'below','battlemap',themed.theme!.id).style).toEqual(createLabel({x:0,y:0},'Note',owner,'below','battlemap').style)
})
