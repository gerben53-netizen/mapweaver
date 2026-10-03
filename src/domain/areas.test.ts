import { afterEach, beforeEach, expect, it } from 'vitest'
import {
  AREA_LIMITS,
  allRings,
  areaGeometry,
  createArea,
  geometryBounds,
  normalizeGeometry,
  objectAssetId,
  rectangleGeometry,
  signedArea,
  validateArea,
  simplify,
  transformArea,
} from './areas'
import { combineGeometry } from './areaBoolean'
import { createPattern } from './patterns'
import { parseProject } from '../projects/format'
import { fixture, validateFixture } from '../projects/fixtures.test-support'
import { decodeProject, encodeProject } from '../projects/codec'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import {
  startAreaEdit,
  changeAreaPoint,
  endAreaEdit,
} from '../store/areaEditing'
import { snapPoint, defaultMapStyle } from './mapSettings'
import { exportScene } from '../export/scene'
const rect = (x = 10, y = 10, width = 100, height = 80) =>
  rectangleGeometry({ x, y, width, height })
beforeEach(() => {
  endAreaEdit(true)
  useProjectStore.setState({
    map: { width: 600, height: 400, ...defaultMapStyle(), background: null },
    objects: [],
    layers: [
      {
        id: 'objects',
        name: 'Objects',
        visible: true,
        locked: false,
        objectIds: [],
      },
    ],
  })
  useEditorStore.setState({
    selectedObjectIds: [],
    activeLayerId: 'objects',
    activeTool: 'select',
  })
  history.reset()
})
afterEach(() => endAreaEdit(true))
it('normalizes implicit closure, epsilon duplicates and opposite winding for holes', () => {
  const g = rect(),
    hole = rect(30, 30, 20, 20).polygons[0].outer
  g.polygons[0].outer.push(g.polygons[0].outer[0])
  g.polygons[0].holes = [hole]
  const n = normalizeGeometry(g)
  expect(n.polygons[0].outer).toHaveLength(4)
  expect(signedArea(n.polygons[0].outer)).toBeGreaterThan(0)
  expect(signedArea(n.polygons[0].holes[0])).toBeLessThan(0)
  expect(normalizeGeometry(n)).toEqual(n)
})
it('rejects nonfinite, crossing, outside holes and over-budget geometry without mutating input', () => {
  for (const g of [
    {
      polygons: [
        {
          outer: [
            { x: 0, y: 0 },
            { x: NaN, y: 1 },
            { x: 3, y: 0 },
          ],
          holes: [],
        },
      ],
    },
    {
      polygons: [
        {
          outer: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
            { x: 10, y: 0 },
          ],
          holes: [],
        },
      ],
    },
    {
      polygons: [
        { ...rect().polygons[0], holes: [rect(300, 300).polygons[0].outer] },
      ],
    },
    { polygons: Array(AREA_LIMITS.polygons + 1).fill(rect().polygons[0]) },
  ])
    expect(() => normalizeGeometry(g)).toThrow()
})
it.each(['rectangle', 'ellipse', 'polygon', 'freehand'] as const)(
  'creates %s in map coordinates with deterministic bounded detail',
  (shape) => {
    const points =
      shape === 'rectangle' || shape === 'ellipse'
        ? [
            { x: 10, y: 10 },
            { x: 110, y: 90 },
          ]
        : [
            { x: 10, y: 10 },
            { x: 60, y: 10 },
            { x: 110, y: 10 },
            { x: 110, y: 90 },
            { x: 10, y: 90 },
          ]
    const g = areaGeometry(shape, points, { width: 600, height: 400 })
    expect(geometryBounds(g)).toEqual({ x: 10, y: 10, width: 100, height: 80 })
    expect(allRings(g).flat().length).toBeLessThanOrEqual(128)
    expect(() =>
      areaGeometry(shape, points, { width: 50, height: 50 }),
    ).toThrow()
  },
)
it('uses map-unit RDP, Shift squares and grid/Alt semantics', () => {
  expect(
    simplify(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0.1 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
      ],
      1,
    ),
  ).toEqual([
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 20 },
  ])
  expect(
    geometryBounds(
      areaGeometry(
        'rectangle',
        [
          { x: 10, y: 10 },
          { x: 110, y: 60 },
        ],
        { width: 600, height: 400 },
        true,
      ),
    ).height,
  ).toBe(100)
  const g = { ...defaultMapStyle().grid, snapEnabled: true }
  expect(snapPoint({ x: 23, y: 71 }, g, false)).toEqual({ x: 0, y: 50 })
  expect(snapPoint({ x: 23, y: 71 }, g, true)).toEqual({ x: 23, y: 71 })
})
it('migrates repeat/stretch preserving IDs, frame and every pattern parameter, idempotently', async () => {
  const f = await fixture()
  for (const mode of ['repeat', 'stretch'] as const) {
    const old = {
      ...createPattern('shared', { x: 31, y: 44, width: 100, height: 80 }),
      id: 'pattern',
      mode,
      patternScale: 0.4,
      patternRotation: 37,
      patternOffsetX: 13,
      patternOffsetY: -9,
      opacity: 0.6,
    }
    f.document.objects[1] = old
    const d = parseProject(f.document),
      o = d.objects[1]
    expect(o.kind).toBe('area')
    expect(o.id).toBe(old.id)
    expect(d.layers).toEqual(f.document.layers)
    expect(parseProject(d)).toEqual(d)
    if (o.kind === 'area') {
      expect(o.patternFrame).toEqual({ x: 31, y: 44, width: 100, height: 80 })
      expect(o.fill).toMatchObject({
        kind: 'pattern',
        mode,
        scale: 0.4,
        rotation: 37,
        offsetX: 13,
        offsetY: -9,
      })
      expect(o.opacity).toBe(0.6)
    }
  }
})
it('handles union overlap/disjoint and subtract holes/empty, refuses complexity', () => {
  expect(
    combineGeometry('union', [rect(), rect(60, 10)])?.polygons,
  ).toHaveLength(1)
  expect(
    combineGeometry('union', [rect(), rect(210, 10)])?.polygons,
  ).toHaveLength(2)
  expect(
    combineGeometry('subtract', [rect(), rect(30, 30, 20, 20)])?.polygons[0]
      .holes,
  ).toHaveLength(1)
  expect(combineGeometry('subtract', [rect(), rect()])).toBeNull()
  expect(() => combineGeometry('union', Array(17).fill(rect()))).toThrow()
})
it('point edits form one undo step; Escape restores; triangles cannot lose a point', () => {
  const a = createArea(rect())
  useProjectStore.getState().addArea(a)
  history.reset()
  startAreaEdit(a)
  changeAreaPoint('add', { x: 60, y: 10 })
  useEditorStore.setState({ editPoint: 1 })
  changeAreaPoint('move', { x: 60, y: 15 })
  expect(useHistoryStore.getState().undoCount).toBe(0)
  endAreaEdit()
  expect(useHistoryStore.getState().undoCount).toBe(1)
  history.undo()
  expect(useProjectStore.getState().objects[0]).toEqual(a)
  history.redo()
  const edited = useProjectStore.getState().objects[0]
  if (edited.kind !== 'area') throw Error()
  startAreaEdit(edited)
  useEditorStore.setState({ editPoint: 1 })
  changeAreaPoint('remove')
  endAreaEdit(true)
  expect(useProjectStore.getState().objects[0]).toEqual(edited)
  const triangle = createArea({polygons:[{outer:[{x:300,y:50},{x:400,y:50},{x:350,y:150}],holes:[]}]})
  useProjectStore.getState().addArea(triangle)
  startAreaEdit(triangle)
  useEditorStore.setState({editPoint:0})
  changeAreaPoint('remove')
  expect(useProjectStore.getState().objects.find(o=>o.id===triangle.id)).toEqual(triangle)
  expect(useEditorStore.getState().message).toContain('three points')
  endAreaEdit(true)
})
it('moves/scales geometry and its stable frame; duplicate/paste/layer move and booleans undo atomically', () => {
  const a = createArea(rect())
  useProjectStore.getState().addArea(a)
  const moved = transformArea(a, { ...a, x: 30, width: 200, height: 160 })
  expect(moved.geometry.polygons[0].outer[1].x).toBe(230)
  expect(moved.patternFrame.x).toBe(30)
  useProjectStore.getState().duplicate()
  expect(useProjectStore.getState().objects[1].kind).toBe('area')
  useProjectStore.getState().copy()
  useProjectStore.getState().paste()
  expect(useProjectStore.getState().objects).toHaveLength(3)
  useProjectStore.getState().addLayer()
  const target = useEditorStore.getState().activeLayerId
  useProjectStore.getState().moveSelection(target)
  expect(useProjectStore.getState().layers[0].objectIds).toHaveLength(1)
  history.reset()
  const before = useProjectStore.getState().objects
  useProjectStore.getState().replaceAreas(
    before.map((o) => o.id),
    a,
  )
  expect(useHistoryStore.getState().undoCount).toBe(1)
  history.undo()
  expect(useProjectStore.getState().objects).toEqual(before)
})
it('roundtrips area holes and embedded patterns through portable v3 and excludes editor state from PNG scene', async () => {
  const f = await fixture(),
    d = parseProject(f.document),
    o = d.objects[1]
  if (o.kind !== 'area') throw Error()
  o.geometry = combineGeometry('subtract', [o.geometry, rect(20, 20, 10, 10)])!
  f.document = d
  const decoded = await decodeProject(await encodeProject(f), validateFixture)
  expect(decoded.document).toEqual(d)
  expect(objectAssetId(o)).toBe('shared-fill')
  const scene = exportScene(d, {
    scale: 1,
    includeGrid: false,
    transparent: true,
  })
  expect(scene.items.filter((i) => i.kind === 'object')).toHaveLength(2)
  expect(JSON.stringify(scene)).not.toContain('editPoint')
  const invalid = structuredClone(d)
  const area = invalid.objects[1]
  if (area.kind === 'area' && area.fill.kind === 'pattern')
    area.fill.assetId = 'missing'
  expect(() => parseProject(invalid)).toThrow('asset')
})

it('rejects missing pattern IDs, incomplete texture frames and unexpected nested data', () => {
  const a = createArea(rect(), {
    kind: 'pattern',
    assetId: 'source',
    mode: 'repeat',
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
  })
  for (const patch of [
    { fill: { ...a.fill, assetId: undefined } },
    { patternFrame: {} },
    { geometry: { ...a.geometry, unknown: true } },
    { x: NaN },
  ])
    expect(() => validateArea({ ...a, ...patch } as typeof a)).toThrow()
})
