import { registerTestAssets } from '../test/assets'
import { beforeEach, expect, it, vi } from 'vitest'
import { DEFAULT_GRID, defaultMapStyle, normalizeGrid, normalizeMapSettings, snapPoint, snapDelta, resizeImpact, cellSummary, gridRenderPosition, gridDisplayStep } from './mapSettings'
import { createLayeredContent } from './layers'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
const a = { kind: 'stamp' as const, id: 'a', assetId: 'tree', x: 123, y: 67, width: 40, height: 60, rotation: 35, scaleX: -1, scaleY: 1, opacity: 0.7 }
const b = { ...a, id: 'b', x: 186, y: 29 }
const map = () => ({ width: 600, height: 400, background: { id: 'bg', name: 'Room', width: 600, height: 400 }, ...defaultMapStyle() })
beforeEach(() => { registerTestAssets({ asset: 'stamp' }); project.setState({ map: map(), ...createLayeredContent([a, b]) }); editor.setState({ activeLayerId: 'objects', selectedObjectIds: [] }) })
it('validates settings and normalizes equivalent offsets, colors and exact/partial cell information', () => {
  expect(normalizeGrid({ ...DEFAULT_GRID, offsetX: -10, offsetY: 110, color: '#AABBCC' })).toMatchObject({ offsetX: 40, offsetY: 10, color: '#aabbcc' })
  for (const patch of [{ cellSize: 0 }, { cellSize: Infinity }, { cellSize: 1025 }, { offsetX: NaN }, { opacity: 1.1 }, { color: '#nope' }]) expect(() => normalizeGrid({ ...DEFAULT_GRID, ...patch })).toThrow()
  expect(() => normalizeMapSettings({ ...map(), width: 8192, height: 8192 })).toThrow()
  expect(() => normalizeMapSettings({ ...map(), width: 10.5 })).toThrow()
  expect(cellSummary(100, 50, 0)).toBe('2 full')
  expect(cellSummary(125, 50, 0)).toBe('2 full + partial (25 px)')
  expect(cellSummary(100, 50, 10)).toBe('1 full + partial (10 px + 40 px)')
})
it.each([
  [{ x: 74, y: 76 }, 0, 0, { x: 50, y: 100 }],
  [{ x: -74, y: -76 }, 0, 0, { x: -50, y: -100 }],
  [{ x: 74, y: -76 }, 10, 20, { x: 60, y: -80 }],
])('snaps the map point %j with offsets %s/%s', (point, offsetX, offsetY, expected) => {
  expect(snapPoint(point, { ...DEFAULT_GRID, snapEnabled: true, offsetX, offsetY })).toEqual(expected)
})
it('uses one primary-center delta for a group and leaves relative geometry, viewport and transforms unchanged', () => {
  const grid = { ...DEFAULT_GRID, snapEnabled: true, offsetX: 10, offsetY: 20 }
  project.setState({ map: { ...map(), grid } })
  const viewport = editor.getState().viewport, delta = snapDelta(a, grid)
  project.getState().snapObjects('a', ['a', 'b'], false)
  expect(project.getState().objects).toEqual([{ ...a, x: a.x + delta.x, y: a.y + delta.y }, { ...b, x: b.x + delta.x, y: b.y + delta.y }])
  expect(editor.getState().viewport).toBe(viewport)
})
it('bypasses snapping for one placement or move without changing persistent settings or future snapping', () => {
  const grid = { ...DEFAULT_GRID, snapEnabled: true }
  project.setState({ map: { ...map(), grid } })
  const asset = { kind: 'stamp' as const, id: 'asset', name: 'Tree', naturalWidth: 40, naturalHeight: 60, mimeType: 'image/png', categoryId: '', contentHash: '', createdAt: '' }
  project.getState().place(asset, { x: 123, y: 67 }, true)
  expect(project.getState().objects[2]).toMatchObject({ x: 103, y: 37 })
  project.getState().place(asset, { x: 123, y: 67 })
  expect(project.getState().objects[3]).toMatchObject({ x: 80, y: 20 })
  project.getState().snapObjects('a', ['a', 'b'], true)
  expect(project.getState().objects.slice(0, 2)).toEqual([a, b])
  expect(project.getState().map.grid).toBe(grid)
  project.getState().updateTransform('a', { ...a, x: 101, rotation: 17 })
  expect(project.getState().objects[0]).toMatchObject({ x: 101, rotation: 17 })
})
it('detects rotated clipping and applies or cancels resize atomically without changing background, objects or layers', () => {
  const state = project.getState(), confirm = vi.fn(() => false)
  expect(resizeImpact(state.map, [{ ...a, x: 80, y: 40, width: 20, height: 80, rotation: 90 }], { width: 110, height: 200 }).objectCount).toBe(1)
  expect(project.getState().applyMapSettings({ ...state.map, width: 100, height: 100 }, confirm)).toBe(false)
  expect(confirm).toHaveBeenCalledWith({ objectCount: 2, background: true, needsConfirmation: true })
  expect(project.getState().map).toBe(state.map)
  expect(() => project.getState().applyMapSettings({ ...state.map, width: NaN }, confirm)).toThrow()
  project.getState().applyMapSettings({ ...state.map, width: 100, height: 100 }, () => true)
  expect(project.getState().map.background).toBe(state.map.background)
  expect(project.getState().objects).toBe(state.objects); expect(project.getState().layers).toBe(state.layers)
  project.getState().applyMapSettings({ ...state.map, width: 800, height: 500 }, confirm)
  expect(confirm).toHaveBeenCalledTimes(1)
  expect(project.getState().map.background).toMatchObject({ width: 600, height: 400 })
})
it('configures grid render order and bounded display density independently of snap and stored cell size', () => {
  expect(gridRenderPosition(DEFAULT_GRID)).toBe('below')
  expect(gridRenderPosition({ ...DEFAULT_GRID, renderAboveObjects: true })).toBe('above')
  expect(gridRenderPosition({ ...DEFAULT_GRID, visible: false, snapEnabled: true })).toBe('hidden')
  expect(gridDisplayStep({ ...DEFAULT_GRID, cellSize: 4 }, 0.01)).toBe(400)
  expect(DEFAULT_GRID.cellSize).toBe(50)
})

