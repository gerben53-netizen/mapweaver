import { expect, it } from 'vitest'
import { effectiveRendering, effectiveStampShadow, validateRendering } from './rendering'
import { defaultMapEffects, defaultStampEffects, validateStampEffects } from './mapEffects'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { parseProject } from '../projects/format'
import { encodeProject, decodeProject } from '../projects/archive'
import { exportScene } from '../export/scene'
import { serializeCampfire } from '../campfire/serialize'
import type { MapDocument, StampObject } from './models'
const map: MapDocument = { ...defaultMapStyle(), width: 600, height: 400, background: null, mapType: 'battlemap', geography: defaultGeography('battlemap'), grid: { ...defaultMapStyle().grid, physicalScale: { distancePerCell: 5, unit: 'ft' } } }
const stamp: StampObject = { kind: 'stamp', id: 'stamp', assetId: 'image', x: 20, y: 30, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
it('old and new battlemaps inherit C and Soft Shadow without changing their documents', () => {
  for (const m of [map, { ...map, mapType: undefined }]) {
    const before = structuredClone(m)
    expect(effectiveRendering(m).arl).toBe('C'); expect(effectiveStampShadow(stamp, m).enabled).toBe(true)
    expect(m).toEqual(before); expect(stamp.effects).toBeUndefined()
  }
})
it.each(['regional-map', 'world-map'] as const)('preserves %s defaults', mapType => {
  const m = { ...map, mapType }
  expect(effectiveRendering(m).arl).toBe('OFF'); expect(effectiveStampShadow(stamp, m).enabled).toBe(false)
})
it.each(['OFF', 'B', 'C'] as const)('honors an explicit %s override in scene/default resolution', arl => {
  const m = { ...map, rendering: { arl } }, p = { map: m, objects: [], layers: [] }
  expect(effectiveRendering(m).arl).toBe(arl)
  expect(exportScene(p, { scale: 2, includeGrid: false, transparent: false }).arlMode).toBe(arl)
})
it('preserves explicit map false and every individual on/off/default choice', () => {
  const disabled = { ...map, effects: { ...defaultMapEffects(), stampSoftShadow: { enabled: false, intensity: .25 } } }
  expect(effectiveStampShadow(stamp, disabled).enabled).toBe(false)
  for (const [softShadow, enabled] of [['on', true], ['off', false], ['default', true]] as const) {
    const o = { ...stamp, effects: { ...defaultStampEffects(), softShadow } }
    expect(effectiveStampShadow(o, map).enabled).toBe(enabled)
  }
  expect(effectiveStampShadow({ ...stamp, effects: { ...defaultStampEffects(), softShadow: 'on' } }, disabled).enabled).toBe(true)
  for (const v of [null, false, true]) expect(() => validateStampEffects({ ...defaultStampEffects(), softShadow: v })).toThrow()
})
it('validates persisted profile settings without coercing malformed values', () => {
  for (const v of [null, [], { arl: false }, { arl: 'D' }, { arl: 'OFF', secret: true }]) expect(() => validateRendering(v)).toThrow()
})
it('archive/reload retains overrides and contract semantics, with no materialized defaults', async () => {
  const raw = { formatVersion: 12, id: 'map', name: 'Profile', createdAt: '2026-10-08T00:00:00.000Z', modifiedAt: '2026-10-08T00:00:00.000Z', map, objects: [], layers: [{ id: "objects", name: "Objects", visible: true, locked: false, objectIds: [] }], objectGroups: [], layerTree: { roots: ["objects"], groups: [] }, assets: [] }
  const inherited = parseProject(raw); expect(inherited.map.rendering).toBeUndefined(); expect(inherited.map.effects).toBeUndefined()
  const explicit = parseProject({ ...raw, map: { ...map, rendering: { arl: 'B' } } })
  const restored = (await decodeProject(await encodeProject({ document: explicit, assets: new Map() }))).document
  expect(restored.map.rendering).toEqual({ arl: 'B' }); expect(restored.id).toBe(raw.id)
  expect(serializeCampfire(restored, raw, 3)).toEqual(serializeCampfire(inherited, raw, 3))
})
