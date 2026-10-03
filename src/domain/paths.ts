import { smoothRiverNodes } from './riverAppearance'
import { isRouteKind, routeRadius, validateRoute, reverseRoute, scaleRoute } from './routes'
import { wallMaterialRadius } from './wallSets'
import { validateWall, scaleWall } from './walls'
import { Bezier } from 'bezier-js'
import type { PathNode, PathObject, PathStroke } from './models'
import type { Point } from '../canvas/viewport'
import type { ObjectTransform } from './transforms'
export const PATH_LIMITS = {
  nodes: 256,
  documentNodes: 20000,
  documentSamples: 250000,
  samples: 8192,
  depth: 12,
  instances: 2048,
  coordinate: 1e9,
  width: 1024,
  tolerance: 0.25,
} as const
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const add = (a: Point, b?: Point): Point => ({
  x: a.x + (b?.x || 0),
  y: a.y + (b?.y || 0),
})
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
export interface PathSegment {
  curve: Bezier
  straight: boolean
  length: number
  start: number
  index: number
}
export function buildSegments(
  nodes: PathNode[],
  closed: boolean,
): PathSegment[] {
  if (nodes.length > PATH_LIMITS.nodes)
    throw new Error('A path supports at most 256 nodes.')
  let start = 0
  return Array.from(
    { length: Math.max(0, nodes.length - (closed ? 0 : 1)) },
    (_, index) => {
      const a = nodes[index],
        b = nodes[(index + 1) % nodes.length],
        straight = !a.out && !b.in
      const curve = straight
        ? new Bezier(
            a,
            { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 },
            { x: a.x + (2 * (b.x - a.x)) / 3, y: a.y + (2 * (b.y - a.y)) / 3 },
            b,
          )
        : new Bezier(a, add(a, a.out), add(b, b.in), b)
      const length = straight ? distance(a, b) : curve.length(),
        segment = { curve, straight, length, start, index }
      start += length
      return segment
    },
  )
}
export function sampleSegments(
  segments: PathSegment[],
  tolerance: number = PATH_LIMITS.tolerance,
) {
  if (!Number.isFinite(tolerance) || tolerance < 0.05 || tolerance > 10)
    throw new Error('Sampling tolerance must be 0.05–10 map pixels.')
  const samples: { point: Point; t: number; segment: number }[] = []
  for (const s of segments) {
    const stack = [{ curve: s.curve, a: 0, b: 1, depth: 0 }]
    samples.push({ point: s.curve.get(0), t: 0, segment: s.index })
    while (stack.length) {
      const v = stack.pop()!,
        p = v.curve.points
      // Control polygon excess also detects collinear reversals/cusps.
      const excess =
        distance(p[0], p[1]) +
        distance(p[1], p[2]) +
        distance(p[2], p[3]) -
        distance(p[0], p[3])
      const chord = distance(p[0], p[3]),
        deviation = chord
          ? Math.max(
              ...[p[1], p[2]].map(
                (q) =>
                  Math.abs(
                    (p[3].x - p[0].x) * (q.y - p[0].y) -
                      (p[3].y - p[0].y) * (q.x - p[0].x),
                  ) / chord,
              ),
            )
          : Math.max(distance(p[0], p[1]), distance(p[0], p[2]))
      if (s.straight || (excess <= tolerance && deviation <= tolerance)) {
        samples.push({ point: v.curve.get(1), t: v.b, segment: s.index })
      } else {
        if (v.depth >= PATH_LIMITS.depth)
          throw new Error('Curve complexity exceeds the subdivision limit.')
        const split = v.curve.split(0.5),
          m = (v.a + v.b) / 2
        stack.push(
          { curve: split.right, a: m, b: v.b, depth: v.depth + 1 },
          { curve: split.left, a: v.a, b: m, depth: v.depth + 1 },
        )
      }
      if (samples.length + stack.length > PATH_LIMITS.samples)
        throw new Error('Path exceeds the 8192-sample budget.')
    }
  }
  return samples
}
const cache = new WeakMap<PathNode[], Map<string, ReturnType<typeof derive>>>()
function derive(nodes: PathNode[], closed: boolean) {
  const segments = buildSegments(nodes, closed),
    samples = sampleSegments(segments)
  const length = segments.reduce((n, s) => n + s.length, 0)
  const bounds = segments.map((s) => s.curve.bbox())
  return {
    segments,
    samples,
    length,
    cumulative: segments.map((s) => s.start + s.length),
    bounds: {
      x: Math.min(...bounds.map((b) => b.x.min)),
      y: Math.min(...bounds.map((b) => b.y.min)),
      right: Math.max(...bounds.map((b) => b.x.max)),
      bottom: Math.max(...bounds.map((b) => b.y.max)),
    },
  }
}
export function pathGeometry(path: Pick<PathObject, 'nodes' | 'closed'> & Partial<Pick<PathObject,'route'>>) {
  let entry = cache.get(path.nodes)
  if (!entry) {
    entry = new Map()
    cache.set(path.nodes, entry)
  }
  const smoothing=path.route?.kind==='river'?path.route.appearance?.smoothing??'off':'off',key=String(path.closed)+smoothing
  let result = entry.get(key)
  if (!result) {
    result = derive(smoothRiverNodes(path.nodes,smoothing), path.closed)
    entry.set(key, result)
  }
  return result
}
export function pointAtDistance(
  path: Pick<PathObject, 'nodes' | 'closed'>,
  distanceAlong: number,
) {
  const g = pathGeometry(path),
    d = Math.max(0, Math.min(g.length, distanceAlong)),
    s = g.segments.find((s) => s.start + s.length >= d) || g.segments.at(-1)!
  if (!s)
    return { point: { x: 0, y: 0 }, tangent: { x: 1, y: 0 }, segment: 0, t: 0 }
  const target = d - s.start
  let t = s.length ? target / s.length : 0
  if (!s.straight && t > 0 && t < 1) {
    let lo = 0,
      hi = 1
    for (let i = 0; i < 16; i++) {
      t = (lo + hi) / 2
      if (s.curve.split(0, t).length() < target) lo = t
      else hi = t
    }
    t = (lo + hi) / 2
  }
  let tangent = s.curve.derivative(t),
    n = Math.hypot(tangent.x, tangent.y)
  if (n < 1e-10) {
    tangent = sub(
      s.curve.get(Math.min(1, t + 1e-4)),
      s.curve.get(Math.max(0, t - 1e-4)),
    )
    n = Math.hypot(tangent.x, tangent.y)
  }
  return {
    point: s.curve.get(t),
    tangent: n ? { x: tangent.x / n, y: tangent.y / n } : { x: 1, y: 0 },
    segment: s.index,
    t,
  }
}
export const pointAtPosition = (
  p: Pick<PathObject, 'nodes' | 'closed'>,
  position: number,
) =>
  pointAtDistance(
    p,
    pathGeometry(p).length * Math.max(0, Math.min(1, position)),
  )
export function nearestPathPoint(
  path: Pick<PathObject, 'nodes' | 'closed'>,
  point: Point,
) {
  let best = { point: { x: 0, y: 0 }, segment: 0, t: 0, distance: Infinity }
  for (const s of pathGeometry(path).segments) {
    // Exact projection avoids a lookup-table residual at straight T junctions.
    const a=s.curve.points[0],b=s.curve.points[3],dx=b.x-a.x,dy=b.y-a.y
    const t=s.straight?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1))):0
    const p = s.straight?{x:a.x+dx*t,y:a.y+dy*t,t}:s.curve.project(point),d = distance(p, point)
    if (d < best.distance)
      best = {
        point: { x: p.x, y: p.y },
        segment: s.index,
        t: p.t || 0,
        distance: d,
      }
  }
  return best
}
export function pathBounds(
  path: Pick<
    PathObject,
    'nodes' | 'closed' | 'strokeWidth' | 'stroke' | 'join' | 'pathKind' | 'wall' | 'route'
  >,
) {
  const b = pathGeometry(path).bounds
  // Miter limit is explicitly 2 in both renderers. Texture tiles are square.
  const padding = path.wall?.alignment === 'outside' ? path.strokeWidth * (path.wall.material?.set.continuous?2.3:2) : path.route ? routeRadius(path)*2 : path.wall?.material ? wallMaterialRadius(path.strokeWidth, path.wall.material) :
    (path.strokeWidth / 2 + (path.wall?.outline.enabled ? path.wall.outline.width : 0)) *
    (path.stroke.kind === 'texture' && path.pathKind !== 'wall'
      ? path.stroke.scale * Math.SQRT2
      : path.join === 'miter'
        ? 2
        : Math.SQRT2)
  return {
    x: b.x - padding,
    y: b.y - padding,
    width: b.right - b.x + padding * 2,
    height: b.bottom - b.y + padding * 2,
  }
}
export function withPathGeometry(
  path: PathObject,
  nodes = path.nodes,
): PathObject {
  const p = { ...path, nodes }
  return { ...p, ...pathBounds(p) }
}
export function createPath(
  nodes: PathNode[],
  closed = false,
  strokeWidth = 8,
  stroke: PathStroke = { kind: 'solid', color: '#dfbe85' },
): PathObject {
  return validatePath(
    withPathGeometry({
      kind: 'path',
      pathKind: 'generic',
      id: crypto.randomUUID(),
      name: 'Path',
      nodes,
      closed,
      strokeWidth,
      stroke,
      opacity: 1,
      cap: 'round',
      join: 'round',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }),
  )
}
export function insertPathNode(
  path: PathObject,
  segment: number,
  t: number,
): PathObject {
  if (path.nodes.length >= PATH_LIMITS.nodes || t <= 0 || t >= 1)
    throw new Error('Choose a segment interior; maximum 256 nodes.')
  const nodes = structuredClone(path.route?.kind==='river'?smoothRiverNodes(path.nodes,path.route.appearance?.smoothing??'off'):path.nodes),
    s = pathGeometry(path).segments[segment]
  if (!s) throw new Error('Invalid segment.')
  const a = nodes[segment],
    b = nodes[(segment + 1) % nodes.length],
    split = s.curve.split(t),
    p = split.left.points[3]
  const node: PathNode = {
    id: crypto.randomUUID(),
    x: p.x,
    y: p.y,
    mode: s.straight ? 'corner' : 'smooth',
  }
  if (!s.straight) {
    a.out = sub(split.left.points[1], a)
    b.in = sub(split.right.points[2], b)
    node.in = sub(split.left.points[2], node)
    node.out = sub(split.right.points[1], node)
  }
  nodes.splice(segment + 1, 0, node)
  return withPathGeometry(path, nodes)
}
export function removePathNode(path: PathObject, index: number) {
  if (path.nodes.length <= (path.closed ? 3 : 2))
    throw new Error('Keep at least two nodes (three when closed).')
  return withPathGeometry(
    path,
    path.nodes.filter((_, i) => i !== index),
  )
}
export function reversePath(path: PathObject) {
  return withPathGeometry(
    {...path,...reverseRoute(path)},
    [...path.nodes].reverse().map((n) => ({ ...n, in: n.out, out: n.in })),
  )
}
export function setPathHandle(
  node: PathNode,
  side: 'in' | 'out',
  vector: Point,
): PathNode {
  const other = side === 'in' ? 'out' : 'in',
    length = Math.hypot(vector.x, vector.y),
    old = node[other],
    otherLength = old ? Math.hypot(old.x, old.y) : length
  return {
    ...node,
    [side]: vector,
    ...(node.mode === 'smooth'
      ? {
          [other]: length
            ? {
                x: (-vector.x / length) * otherLength,
                y: (-vector.y / length) * otherLength,
              }
            : { x: 0, y: 0 },
        }
      : {}),
  }
}
export function transformPath(path: PathObject, t: ObjectTransform) {
  const sx = (t.width / path.width) * t.scaleX,
    sy = (t.height / path.height) * t.scaleY,
    r = (t.rotation * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r)
  const vector = (p: Point) => ({
    x: p.x * sx * c - p.y * sy * s,
    y: p.x * sx * s + p.y * sy * c,
  })
  const nodes = path.nodes.map((n) => {
    const p = vector({
      x: n.x - path.x - path.width / 2,
      y: n.y - path.y - path.height / 2,
    })
    return {
      ...n,
      x: t.x + t.width / 2 + p.x,
      y: t.y + t.height / 2 + p.y,
      ...(n.in ? { in: vector(n.in) } : {}),
      ...(n.out ? { out: vector(n.out) } : {}),
    }
  })
  return validatePath(
    withPathGeometry(
      {
        ...path,
        ...scaleWall(path,Math.min(Math.abs(sx),Math.abs(sy))),
        ...scaleRoute(path,Math.min(Math.abs(sx),Math.abs(sy))),
        strokeWidth: path.strokeWidth * Math.min(Math.abs(sx), Math.abs(sy)),
      },
      nodes,
    ),
  )
}
export const screenTolerance = (pixels: number, zoom: number) =>
  pixels / Math.max(0.01, zoom)
export function constrainPathAngle(anchor: Point, point: Point) {
  const d = distance(anchor, point),
    angle =
      (Math.round(
        Math.atan2(point.y - anchor.y, point.x - anchor.x) / (Math.PI / 4),
      ) *
        Math.PI) /
      4
  return {
    x: anchor.x + Math.cos(angle) * d,
    y: anchor.y + Math.sin(angle) * d,
  }
}
export function texturePositions(path: PathObject) {
  if (path.stroke.kind !== 'texture') return []
  const { spacing, offset } = path.stroke,
    length = pathGeometry(path).length,
    start = ((offset % spacing) + spacing) % spacing,
    count = Math.max(0, Math.floor((length - start) / spacing) + 1)
  if (count > PATH_LIMITS.instances)
    throw new Error('Texture exceeds 2048 tiles. Increase spacing.')
  return Array.from({ length: count }, (_, i) =>
    pointAtDistance(path, start + i * spacing),
  )
}
const finite = (n: unknown, max: number = PATH_LIMITS.coordinate) =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= max
const keys = (v: unknown, allowed: string[]) => {
  if (
    !v ||
    typeof v !== 'object' ||
    Array.isArray(v) ||
    Object.keys(v).some((k) => !allowed.includes(k))
  )
    throw new Error('Invalid path fields.')
}
export function validatePath(path: PathObject): PathObject {
  keys(path, [
    'kind',
    'pathKind',
    'wall',
    'route',
    'id',
    'name',
    'nodes',
    'closed',
    'strokeWidth',
    'stroke',
    'opacity',
    'cap',
    'join',
    'x',
    'y',
    'width',
    'height',
    'rotation',
    'scaleX',
    'scaleY',
    'locked',
    'visible',
  ])
  if (
    path.kind !== 'path' ||
    !['generic','wall','river','road','border'].includes(path.pathKind) ||
    typeof path.id !== 'string' ||
    !/^[-\w]{1,80}$/.test(path.id) ||
    typeof path.name !== 'string' ||
    !path.name.trim() ||
    path.name.length > 120 ||
    [...path.name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw new Error('Invalid path identity.')
  if (
    typeof path.closed !== 'boolean' ||
    !Array.isArray(path.nodes) ||
    path.nodes.length < (path.closed ? 3 : 2) ||
    path.nodes.length > PATH_LIMITS.nodes
  )
    throw new Error('Path needs 2–256 nodes (at least 3 when closed).')
  const ids = new Set<string>()
  for (const n of path.nodes) {
    keys(n, ['id', 'x', 'y', 'mode', 'in', 'out','junction'])
    if (
      typeof n.id !== 'string' ||
      !/^[-\w]{1,80}$/.test(n.id) ||
      ids.has(n.id) ||
      !finite(n.x) ||
      !finite(n.y) ||
      !['corner', 'smooth'].includes(n.mode)
    )
      throw new Error('Invalid or duplicate path node.')
    if(n.junction!==undefined&&(typeof n.junction!=='string'||!/^[-\w]{1,80}$/.test(n.junction)))throw new Error('Invalid wall junction reference.')
    ids.add(n.id)
    for (const h of [n.in, n.out])
      if (h !== undefined) {
        keys(h, ['x', 'y'])
        if (
          !finite(h.x) ||
          !finite(h.y) ||
          !finite(n.x + h.x) ||
          !finite(n.y + h.y)
        )
          throw new Error('Invalid control handle.')
      }
  }
  if (
    !finite(path.strokeWidth, PATH_LIMITS.width) ||
    path.strokeWidth <= 0 ||
    !finite(path.opacity, 1) ||
    path.opacity < 0 ||
    !['butt', 'round', 'square'].includes(path.cap) ||
    !['miter', 'round', 'bevel'].includes(path.join) ||
    path.rotation !== 0 ||
    path.scaleX !== 1 ||
    path.scaleY !== 1 ||
    (path.visible !== undefined && typeof path.visible !== 'boolean') ||
    (path.locked !== undefined && typeof path.locked !== 'boolean')
  )
    throw new Error('Invalid path style or transform.')
  // Admission must not trust a cache populated before mutable/untrusted input changed.
  cache.delete(path.nodes)
  const stroke = path.stroke
  keys(
    stroke,
    stroke?.kind === 'texture'
      ? ['kind', 'assetId', 'scale', 'spacing', 'offset']
      : stroke?.kind === 'dashed'
        ? ['kind', 'color', 'dash', 'gap']
        : ['kind', 'color'],
  )
  if (stroke.kind === 'texture') {
    if (
      typeof stroke.assetId !== 'string' ||
      !/^[-\w]{1,80}$/.test(stroke.assetId) ||
      !finite(stroke.scale, 100) ||
      stroke.scale < 0.01 ||
      !finite(stroke.spacing) ||
      stroke.spacing < 1 ||
      !finite(stroke.offset)
    )
      throw new Error('Invalid path texture.')
    if (path.pathKind === 'generic' && pathGeometry(path).length / stroke.spacing + 1 > PATH_LIMITS.instances)
      throw new Error('Texture exceeds 2048 tiles. Increase spacing.')
  } else if (
    !['solid', 'dashed'].includes(stroke.kind) ||
    !/^#[\da-f]{6}$/i.test(stroke.color) ||
    (stroke.kind === 'dashed' &&
      (!finite(stroke.dash, 10000) ||
        !finite(stroke.gap, 10000) ||
        stroke.dash < 0.1 ||
        stroke.gap < 0.1))
  )
    throw new Error('Invalid path stroke.')
  if (pathGeometry(path).length < 0.01)
    throw new Error('Path must have a non-zero length.')
  if(path.pathKind==='wall')validateWall(path)
  else if(path.wall!==undefined)throw new Error('Generic paths cannot contain wall settings.')
  if(isRouteKind(path.pathKind))validateRoute(path)
  else if(path.route!==undefined)throw new Error('Only routes can contain route settings.')
  const result = withPathGeometry(path)
  for (const k of ['x', 'y', 'width', 'height'] as const)
    if (!finite(path[k]) || Math.abs(path[k] - result[k]) > 1e-5)
      throw new Error('Path bounds do not match its geometry.')
  return result
}

