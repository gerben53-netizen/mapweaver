import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import {
  buildSegments,
  createPath,
  pathGeometry,
  pointAtDistance,
  pointAtPosition,
  nearestPathPoint,
  insertPathNode,
  removePathNode,
  reversePath,
  transformPath,
  validatePath,
  withPathGeometry,
  setPathHandle,
  screenTolerance,
  constrainPathAngle,
  texturePositions,
  PATH_LIMITS,
} from './paths'
import type { PathNode, PathObject } from './models'
import { defaultMapStyle, snapPoint } from './mapSettings'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { startPathEdit, changePath, endPathEdit } from '../store/pathEditing'
import { beginObjectEdit } from '../store/objectEdits'
import { parseProject } from '../projects/format'
import { encodeProject, decodeProject } from '../projects/codec'
import { paintPath } from '../canvas/drawPath'
import { exportScene } from '../export/scene'
const nodes = (): PathNode[] => [
  { id: 'a', x: 50, y: 100, mode: 'corner' },
  { id: 'b', x: 250, y: 100, mode: 'corner' },
  { id: 'c', x: 350, y: 200, mode: 'corner' },
]
const curve = () =>
  createPath([
    { ...nodes()[0], out: { x: 0, y: -100 }, mode: 'smooth' },
    { ...nodes()[1], in: { x: 0, y: -100 }, mode: 'smooth' },
    nodes()[2],
  ])
const document = (p: PathObject) => ({
  formatVersion: 4,
  id: 'project',
  name: 'Paths',
  createdAt: '2026-09-23T00:00:00.000Z',
  modifiedAt: '2026-09-23T00:00:00.000Z',
  map: { width: 600, height: 400, ...defaultMapStyle(), background: null },
  objects: [p],
  layers: [
    {
      id: 'objects',
      name: 'Objects',
      visible: true,
      locked: false,
      objectIds: [p.id],
    },
  ],
  assets: [],
})
beforeEach(() => {
  endPathEdit(true)
  const d = document(createPath(nodes()))
  project.setState({
    map: d.map,
    objects: [],
    layers: [{ ...d.layers[0], objectIds: [] }],
  })
  editor.setState({
    activeTool: 'select',
    activeLayerId: 'objects',
    selectedObjectIds: [],
    clipboard: [],
  })
  history.reset()
})
afterEach(() => endPathEdit(true))
it('measures straight/mixed curves, cumulative lengths, positions and unit tangents', () => {
  const line = createPath(nodes().slice(0, 2)),
    g = pathGeometry(line)
  expect(g.length).toBeCloseTo(200)
  expect(g.cumulative).toEqual([200])
  expect(pointAtDistance(line, 100).point).toMatchObject({ x: 150, y: 100 })
  expect(pointAtPosition(line, 0.5).tangent).toEqual({ x: 1, y: 0 })
  const p = curve()
  expect(pathGeometry(p).segments.map((s) => s.straight)).toEqual([false, true])
  expect(pathGeometry(p).length).toBeGreaterThan(341)
  expect(pointAtDistance(p, 0).tangent).toEqual({ x: 0, y: -1 })
  expect(p.y).toBeLessThan(25)
  expect(pathGeometry(p)).toBe(
    pathGeometry({ ...p, opacity: 0.5 } as PathObject),
  )
  expect(pathGeometry({ ...p, nodes: [...p.nodes] })).not.toBe(pathGeometry(p))
})
it('nearest segment and exact cubic split preserve every sampled curve point', () => {
  const p = curve(),
    near = nearestPathPoint(p, { x: 150, y: 25 })
  expect(near.segment).toBe(0)
  expect(near.distance).toBeLessThan(0.1)
  const next = insertPathNode(p, 0, 0.37),
    a = buildSegments(p.nodes, false)[0],
    b = buildSegments(next.nodes, false)
  for (let i = 0; i <= 100; i++) {
    const t = i / 100,
      old = a.curve.get(t),
      v =
        t <= 0.37 ? b[0].curve.get(t / 0.37) : b[1].curve.get((t - 0.37) / 0.63)
    expect(v.x).toBeCloseTo(old.x, 7)
    expect(v.y).toBeCloseTo(old.y, 7)
  }
  expect(pathGeometry(next).length).toBeCloseTo(pathGeometry(p).length, 2)
  expect(() => removePathNode(createPath(nodes().slice(0, 2)), 0)).toThrow()
  expect(removePathNode(next, 1).nodes).toHaveLength(3)
})
it('reverses handles and closed direction without changing the locus or length', () => {
  const p = withPathGeometry({ ...curve(), closed: true }),
    r = reversePath(p)
  expect(pathGeometry(r).length).toBeCloseTo(pathGeometry(p).length, 6)
  expect(reversePath(r)).toEqual(p)
  expect(r.nodes[1].out).toEqual(p.nodes[1].in)
})
it('translates, rotates, scales and mirrors points and relative handles', () => {
  const p = curve(),
    m = transformPath(p, { ...p, x: p.x + 20, y: p.y - 10 })
  expect(m.nodes[0].x).toBeCloseTo(p.nodes[0].x + 20)
  expect(m.nodes[0].out).toEqual(p.nodes[0].out)
  const rotated = transformPath(p, { ...p, rotation: 90 })
  expect(rotated.nodes[0].out?.x).toBeCloseTo(100)
  const mirror = transformPath(p, { ...p, scaleX: -1 })
  expect(mirror.nodes[1].x - mirror.nodes[0].x).toBeCloseTo(-200)
  const scaled = transformPath(p, {
    ...p,
    width: p.width * 2,
    height: p.height * 2,
  })
  expect(pathGeometry(scaled).length).toBeCloseTo(pathGeometry(p).length * 2, 5)
  expect(scaled.strokeWidth).toBe(16)
})
it('links smooth handle direction, keeps corner handles independent and shares snapping', () => {
  const n = { ...nodes()[0], mode: 'smooth' as const, in: { x: -40, y: 0 } },
    changed = setPathHandle(n, 'out', { x: 0, y: 20 })
  expect(changed.in).toEqual({ x: -0, y: -40 })
  expect(
    setPathHandle({ ...n, mode: 'corner' }, 'out', { x: 0, y: 20 }).in,
  ).toEqual(n.in)
  const grid = { ...defaultMapStyle().grid, snapEnabled: true }
  expect(snapPoint({ x: 23, y: 71 }, grid, false)).toEqual({ x: 0, y: 50 })
  expect(snapPoint({ x: 23, y: 71 }, grid, true)).toEqual({ x: 23, y: 71 })
  expect(constrainPathAngle({ x: 0, y: 0 }, { x: 100, y: 10 }).y).toBe(0)
  expect([0.25, 1, 4].map((z) => screenTolerance(8, z))).toEqual([32, 8, 2])
})
it('strictly validates identities, bounds, handles, width, opacity, nodes and future kinds', () => {
  const p = curve()
  for (const patch of [
    { pathKind: 'wall' },
    { strokeWidth: 0 },
    { opacity: NaN },
    { x: p.x + 1 },
    { nodes: [] },
    { nodes: [p.nodes[0], p.nodes[0]] },
    { nodes: p.nodes.map((n) => ({ ...n, out: { x: Infinity, y: 0 } })) },
    { nodes: Array(257).fill(p.nodes[0]) },
    { unexpected: true },
  ])
    expect(() => validatePath({ ...p, ...patch } as PathObject)).toThrow()
})
it('bounds pathological samples and texture instances before rendering', () => {
  const many = Array.from({ length: PATH_LIMITS.nodes }, (_, i) => ({
    id: String(i),
    x: i * 10,
    y: 100 + Math.sin(i) * 50,
    mode: 'corner' as const,
  }))
  expect(createPath(many).nodes).toHaveLength(256)
  expect(() =>
    createPath([
      { id: 'a', x: 0, y: 0, mode: 'corner', out: { x: 1e9, y: 1e9 } },
      { id: 'b', x: 1, y: 1, mode: 'corner', in: { x: -1e9, y: 1e9 } },
    ]),
  ).toThrow()
  expect(() =>
    createPath(nodes(), false, 8, {
      kind: 'texture',
      assetId: 'texture',
      scale: 1,
      spacing: 0.1,
      offset: 0,
    }),
  ).toThrow()
  expect(() =>
    createPath(
      [
        { ...nodes()[0], x: 0 },
        { ...nodes()[1], x: 100000 },
      ],
      false,
      8,
      { kind: 'texture', assetId: 'texture', scale: 1, spacing: 1, offset: 0 },
    ),
  ).toThrow()
})
it('solid/dashed/texture styles render bounded tiles and a safe missing-image placeholder', () => {
  const c = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
  const p = createPath(nodes())
  paintPath(c, p)
  expect(c.stroke).toHaveBeenCalled()
  const d = createPath(nodes(), true, 12, {
    kind: 'dashed',
    color: '#112233',
    dash: 20,
    gap: 10,
  })
  paintPath(c, d)
  expect(c.setLineDash).toHaveBeenLastCalledWith([20, 10])
  const t = createPath(nodes(), false, 10, {
    kind: 'texture',
    assetId: 'texture',
    scale: 2,
    spacing: 20,
    offset: 5,
  })
  paintPath(c, t)
  expect(c.strokeStyle).toBe('#d15a88')
  paintPath(c, t, {} as CanvasImageSource)
  expect(c.drawImage).toHaveBeenCalledTimes(texturePositions(t).length)
})
it('roundtrips format v4 and portable files, upgrades v3; rejects unknown textures/types', async () => {
  const p = curve(),
    d = parseProject(document(p))
  expect(d.formatVersion).toBe(12)
  expect(parseProject(d)).toEqual(d)
  const old = {
    ...document(p),
    formatVersion: 3,
    objects: [],
    layers: [{ ...d.layers[0], objectIds: [] }],
  }
  expect(parseProject(old).formatVersion).toBe(12)
  expect(() => parseProject({ ...document(p), formatVersion: 3 })).toThrow()
  const decoded = await decodeProject(
    await encodeProject({ document: d, assets: new Map() }),
    async () => {
      throw Error('No asset expected')
    },
  )
  expect(decoded.document).toEqual(d)
  const texture = createPath(nodes(), false, 8, {
    kind: 'texture',
    assetId: 'missing',
    scale: 1,
    spacing: 30,
    offset: 0,
  })
  expect(() => parseProject(document(texture))).toThrow('asset')
  const scene = exportScene(d, {
    scale: 1,
    transparent: true,
    includeGrid: false,
  })
  expect(
    scene.items.some((i) => i.kind === 'object' && i.object.kind === 'path'),
  ).toBe(true)
  expect(JSON.stringify(scene)).not.toContain('editPoint')
})
it('node sessions commit exactly one undo; cancel restores; transform previews use original geometry', () => {
  const p = curve()
  project.getState().addPath(p)
  history.reset()
  startPathEdit(p)
  changePath((o) => insertPathNode(o, 0, 0.5))
  changePath(reversePath)
  expect(useHistoryStore.getState().undoCount).toBe(0)
  endPathEdit()
  expect(useHistoryStore.getState().undoCount).toBe(1)
  history.undo()
  expect(project.getState().objects[0]).toEqual(p)
  history.redo()
  const after = project.getState().objects[0] as PathObject
  startPathEdit(after)
  changePath(reversePath)
  endPathEdit(true)
  expect(project.getState().objects[0]).toEqual(after)
  const edit = beginObjectEdit(p.id)!
  edit.preview({ ...after, rotation: 30 })
  edit.preview({ ...after, rotation: 60 })
  edit.finish()
  expect(project.getState().objects[0]).toEqual(
    transformPath(after, { ...after, rotation: 60 }),
  )
})
it('copy/paste, duplicate, layer transfer and hidden/locked guards retain path geometry', () => {
  const p = curve()
  project.getState().addPath(p)
  project.getState().copy()
  project.getState().paste()
  project.getState().duplicate()
  expect(project.getState().objects).toHaveLength(3)
  project.getState().addLayer()
  const id = editor.getState().activeLayerId
  project.getState().moveSelection(id)
  expect(project.getState().layers[0].objectIds).toHaveLength(1)
  project.getState().changeLayer(id, { locked: true })
  const before = project.getState().objects
  project.getState().deleteSelection()
  expect(project.getState().objects).toEqual(before)
})

it('revalidates mutable input despite a populated geometry cache and applies import defaults',()=>{
 const path=curve();pathGeometry(path);path.nodes[0].x+=50;expect(()=>validatePath(path)).toThrow('bounds')
 const fresh=curve(),raw=document(fresh);const optional=raw.objects[0] as Partial<PathObject>;delete optional.name;delete optional.opacity;delete optional.cap;delete optional.join;delete optional.rotation;delete optional.scaleX;delete optional.scaleY
 expect(parseProject(raw).objects[0]).toMatchObject({kind:'path',name:'Path',opacity:1,cap:'round',join:'round',rotation:0,scaleX:1,scaleY:1})
})

