import { beforeEach, expect, it } from 'vitest'
import { createPattern, DEFAULT_PATTERN, normalizePattern, objectCapabilities, patternNodeTransform, patternPaintProps, patternRect } from './patterns'
import { DEFAULT_GRID, defaultMapStyle } from './mapSettings'
import { createLayeredContent, editableIds, orderedObjects, OBJECT_OFFSET } from './layers'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
const size = { width: 600, height: 400 }
const pattern = () => ({ ...createPattern('floor', { x: 10, y: 20, width: 100, height: 80 }), patternScale: 0.5, patternRotation: 35, patternOffsetX: -12, patternOffsetY: 23, opacity: 0.6 })
beforeEach(() => {
  project.setState({ map: { ...size, ...defaultMapStyle(), background: null }, ...createLayeredContent() })
  editor.setState({ selectedObjectIds: [], activeLayerId: 'objects', clipboard: [], pasteCount: 0, activeTool: 'select' })
})
it('normalizes all drawing directions, clips to the map and rejects outside starts and subminimum areas', () => {
  for (const [a, b] of [[{ x: 50, y: 60 }, { x: 200, y: 160 }], [{ x: 200, y: 160 }, { x: 50, y: 60 }], [{ x: 50, y: 160 }, { x: 200, y: 60 }], [{ x: 200, y: 60 }, { x: 50, y: 160 }]]) expect(patternRect(a, b, size, DEFAULT_GRID, false)).toEqual({ x: 50, y: 60, width: 150, height: 100 })
  expect(patternRect({ x: 50, y: 60 }, { x: 700, y: 500 }, size, DEFAULT_GRID, false)).toEqual({ x: 50, y: 60, width: 550, height: 340 })
  for (const [a, b] of [[{ x: -1, y: 20 }, { x: 200, y: 100 }], [{ x: 50, y: 60 }, { x: 57, y: 160 }], [{ x: 50, y: 60 }, { x: 50, y: 60 }]]) expect(patternRect(a, b, size, DEFAULT_GRID, false)).toBeNull()
})
it.each([false, true])('snaps both corners with offsets; Alt bypass=%s is temporary', (bypass) => {
  const grid = { ...DEFAULT_GRID, snapEnabled: true, offsetX: 10, offsetY: 20 }
  expect(patternRect({ x: 73, y: 82 }, { x: 217, y: 186 }, size, grid, bypass)).toEqual(bypass ? { x: 73, y: 82, width: 144, height: 104 } : { x: 60, y: 70, width: 150, height: 100 })
  expect(grid.snapEnabled).toBe(true)
})
it('validates all pattern fields and normalizes rotation before storing an atomic edit', () => {
  expect(normalizePattern({ ...DEFAULT_PATTERN, patternRotation: 450 })).toMatchObject({ patternRotation: 90 })
  for (const patch of [{ patternScale: 0 }, { patternScale: 101 }, { patternScale: NaN }, { patternRotation: Infinity }, { patternOffsetX: NaN }, { patternOffsetY: Infinity }, { opacity: -0.1 }, { opacity: 1.1 }]) expect(() => normalizePattern({ ...DEFAULT_PATTERN, ...patch })).toThrow()
  const object = pattern(); project.setState(createLayeredContent([object]))
  expect(() => project.getState().applyPatternProperties(object.id, { ...object, width: 7 }, DEFAULT_PATTERN)).toThrow()
  expect(project.getState().objects[0]).toBe(object)
})
it('resizes independent bounds while repeat tile scale and offsets stay unchanged; stretch retains them', () => {
  const object = pattern(); project.setState(createLayeredContent([object]))
  const transform = patternNodeTransform({ x: 110, y: 100, width: 100, height: 80, scaleX: 2, scaleY: 0.5, rotation: 0 })
  project.getState().updateTransform(object.id, transform)
  const resized = project.getState().objects[0]
  expect(resized).toEqual({ ...object, x: 10, y: 80, width: 200, height: 40 })
  if (resized.kind !== 'patternFill') throw new Error('Wrong object kind')
  expect(patternPaintProps(resized, { width: 20, height: 10 })).toMatchObject({ fillPatternRepeat: 'repeat', fillPatternScaleX: 0.5, fillPatternScaleY: 0.5, fillPatternX: -12, fillPatternY: 23 })
  expect(patternPaintProps({ ...resized, mode: 'stretch' }, { width: 20, height: 10 })).toMatchObject({ fillPatternRepeat: 'no-repeat', fillPatternScaleX: 10, fillPatternScaleY: 4 })
  expect(resized.patternOffsetX).toBe(-12)
})
it('duplicates and pastes one full pattern object with new identities and shared asset reference', () => {
  const object = pattern(); project.setState(createLayeredContent([object])); editor.setState({ selectedObjectIds: [object.id] })
  project.getState().copy(); project.getState().duplicate(); project.getState().paste()
  const objects = project.getState().objects
  expect(objects).toHaveLength(3); expect(new Set(objects.map((item) => item.id)).size).toBe(3)
  for (const copy of objects.slice(1)) expect(copy).toEqual({ ...object, id: copy.id, x: object.x + OBJECT_OFFSET, y: object.y + OBJECT_OFFSET })
  expect(project.getState().layers[0].objectIds).toHaveLength(3)
})
it('disables stamp-only edits but supports pattern ordering, layer moves, locks, visibility and deletion', () => {
  const object = pattern(), other = { ...pattern(), id: 'other' }
  project.setState(createLayeredContent([object, other])); editor.setState({ selectedObjectIds: [object.id] })
  expect(objectCapabilities(object)).toEqual({ rotate: false, flip: false, keepRatio: false })
  expect(objectCapabilities({ ...object, kind: 'stamp' })).toEqual({ rotate: true, flip: true, keepRatio: true })
  project.getState().updateTransform(object.id, { ...object, scaleX: -1 }); expect(project.getState().objects[0]).toBe(object)
  project.getState().orderSelection('front'); expect(project.getState().layers[0].objectIds).toEqual(['other', object.id])
  project.getState().addLayer(); const layerId = editor.getState().activeLayerId
  project.getState().moveSelection(layerId); expect(project.getState().layers[0].objectIds).toEqual([object.id])
  project.getState().changeLayer(layerId, { locked: true }); expect(editableIds(project.getState().layers, project.getState().objects).has(object.id)).toBe(false)
  project.getState().changeLayer(layerId, { visible: false }); expect(orderedObjects(project.getState().layers, project.getState().objects, true)).toEqual([other])
  project.getState().changeLayer(layerId, { locked: false, visible: true }); editor.setState({ selectedObjectIds: [object.id] })
  project.getState().deleteSelection(); expect(project.getState().objects).toEqual([other])
})
