import { MIN_PATTERN_SCALE, MAX_PATTERN_SCALE } from './patterns'
import { validateLandArea } from './landAreas'
import { composeScatter, validateScatter } from './scatter'
import { transformPath } from './paths'
import type {
  AreaFill,
  AreaGeometry,
  AreaObject,
  MapObject,
  PatternFillObject,
} from './models'
import type { Point, Size } from '../canvas/viewport'
import type { ObjectTransform } from './transforms'

export const AREA_LIMITS = {
  ring: 512,
  holes: 16,
  polygons: 32,
  points: 2048,
  booleanObjects: 16,
  booleanPoints: 4096,
  samples: 4096,
  simplified: 512,
  timeoutMs: 1500,
  coordinate: 1e9,
  epsilon: 1e-6,
  minimum: 8,
  sampleDistance: 2,
  tolerance: 1.5,
} as const
export type AreaShape = 'rectangle' | 'ellipse' | 'polygon' | 'freehand'
export const objectAssetId = (o: MapObject): string | undefined =>
  o.kind === 'path' ? (o.stroke.kind === 'texture' ? o.stroke.assetId : undefined) : o.kind === 'area'
    ? o.fill.kind === 'pattern'
      ? o.fill.assetId
      : undefined
    : o.assetId
export const objectAssetIds = (o: MapObject): string[] => o.kind === 'stamp' && o.family ? [...new Set(o.family.family.variants.map(v => v.assetId))] : o.kind === 'legend' ? o.entries.flatMap(e=>e.assetId?[e.assetId]:[]) : o.kind === 'scatter' ? o.sources.map(a=>a.assetId) : objectAssetId(o) ? [objectAssetId(o)!] : []
export const allRings = (g: AreaGeometry) =>
  g.polygons.flatMap((p) => [p.outer, ...p.holes])
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
export function signedArea(r: Point[]) {
  return (
    r.reduce((s, p, i) => {
      const q = r[(i + 1) % r.length]
      return s + p.x * q.y - q.x * p.y
    }, 0) / 2
  )
}
function onSegment(p: Point, a: Point, b: Point) {
  return (
    Math.abs(cross(a, b, p)) < AREA_LIMITS.epsilon &&
    p.x >= Math.min(a.x, b.x) - 1e-6 &&
    p.x <= Math.max(a.x, b.x) + 1e-6 &&
    p.y >= Math.min(a.y, b.y) - 1e-6 &&
    p.y <= Math.max(a.y, b.y) + 1e-6
  )
}
function intersects(a: Point, b: Point, c: Point, d: Point) {
  return (
    (cross(a, b, c) * cross(a, b, d) < 0 &&
      cross(c, d, a) * cross(c, d, b) < 0) ||
    onSegment(a, c, d) ||
    onSegment(b, c, d) ||
    onSegment(c, a, b) ||
    onSegment(d, a, b)
  )
}
function inside(p: Point, r: Point[]) {
  let yes = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i],
      b = r[j]
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      yes = !yes
  }
  return yes
}
function ringsCross(a: Point[], b: Point[]) {
  return a.some((p, i) =>
    b.some((q, j) =>
      intersects(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length]),
    ),
  )
}
export function normalizeGeometry(value: AreaGeometry): AreaGeometry {
  if (
    !value ||
    !Array.isArray(value.polygons) ||
    !value.polygons.length ||
    value.polygons.length > AREA_LIMITS.polygons
  )
    throw new Error('Area needs 1–32 polygons.')
  let total = 0
  const ring = (input: Point[], hole: boolean) => {
    if (!Array.isArray(input) || input.length > AREA_LIMITS.ring + 1)
      throw new Error('A ring supports at most 512 points.')
    const r: Point[] = []
    for (const p of input) {
      if (
        !p ||
        ![p.x, p.y].every(
          (v) =>
            typeof v === 'number' &&
            Number.isFinite(v) &&
            Math.abs(v) <= AREA_LIMITS.coordinate,
        )
      )
        throw new Error('Area coordinates must be finite and bounded.')
      if (!r.length || distance(p, r[r.length - 1]) > AREA_LIMITS.epsilon)
        r.push({ x: p.x, y: p.y })
    }
    if (r.length > 1 && distance(r[0], r[r.length - 1]) <= AREA_LIMITS.epsilon)
      r.pop()
    total += r.length
    if (
      r.length < 3 ||
      r.length > AREA_LIMITS.ring ||
      total > AREA_LIMITS.points ||
      Math.abs(signedArea(r)) < AREA_LIMITS.epsilon
    )
      throw new Error('Area is empty or exceeds its point budget.')
    for (let i = 0; i < r.length; i++)
      for (let j = i + 1; j < r.length; j++)
        if (
          j !== i + 1 &&
          !(i === 0 && j === r.length - 1) &&
          intersects(r[i], r[(i + 1) % r.length], r[j], r[(j + 1) % r.length])
        )
          throw new Error('Area edges must not cross or touch themselves.')
    return signedArea(r) > 0 !== !hole ? r.reverse() : r
  }
  const polygons = value.polygons.map((p) => {
    if (!p || !Array.isArray(p.holes) || p.holes.length > AREA_LIMITS.holes)
      throw new Error('A polygon supports at most 16 holes.')
    const outer = ring(p.outer, false),
      holes = p.holes.map((h) => ring(h, true))
    for (let i = 0; i < holes.length; i++) {
      if (!inside(holes[i][0], outer) || ringsCross(outer, holes[i]))
        throw new Error('Holes must be strictly inside their polygon.')
      for (let j = 0; j < i; j++)
        if (
          ringsCross(holes[i], holes[j]) ||
          inside(holes[i][0], holes[j]) ||
          inside(holes[j][0], holes[i])
        )
          throw new Error('Holes must not overlap.')
    }
    return { outer, holes }
  })
  for (let i = 0; i < polygons.length; i++)
    for (let j = 0; j < i; j++) {
      const a = polygons[i],
        b = polygons[j]
      if (
        [a.outer, ...a.holes].some(ar => [b.outer, ...b.holes].some(br => ringsCross(ar, br))) ||
        (inside(a.outer[0], b.outer) &&
          !b.holes.some((h) => inside(a.outer[0], h))) ||
        (inside(b.outer[0], a.outer) &&
          !a.holes.some((h) => inside(b.outer[0], h)))
      )
        throw new Error('Area polygons must not overlap or touch.')
    }
  return { polygons }
}
export function geometryBounds(g: AreaGeometry) {
  const points = allRings(g).flat()
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity
  for (const p of points) {
    x = Math.min(x, p.x)
    y = Math.min(y, p.y)
    right = Math.max(right, p.x)
    bottom = Math.max(bottom, p.y)
  }
  return { x, y, width: right - x, height: bottom - y }
}
export const rectangleGeometry = (r: {
  x: number
  y: number
  width: number
  height: number
}): AreaGeometry => ({
  polygons: [
    {
      outer: [
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y },
        { x: r.x + r.width, y: r.y + r.height },
        { x: r.x, y: r.y + r.height },
      ],
      holes: [],
    },
  ],
})
export function areaGeometry(
  shape: AreaShape,
  points: Point[],
  map: Size,
  shift = false,
): AreaGeometry {
  let geometry: AreaGeometry
  if (shape === 'rectangle' || shape === 'ellipse') {
    const a = points[0],
      b = { ...points[points.length - 1] }
    if (shift) {
      const side = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      b.x = a.x + Math.sign(b.x - a.x || 1) * side
      b.y = a.y + Math.sign(b.y - a.y || 1) * side
    }
    const r = {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(a.x - b.x),
      height: Math.abs(a.y - b.y),
    }
    const radius = Math.max(r.width, r.height) / 2,
      segments =
        radius > 0
          ? Math.min(
              512,
              Math.max(
                32,
                Math.ceil(
                  Math.PI / Math.acos(1 - Math.min(0.25, radius) / radius) / 4,
                ) * 4,
              ),
            )
          : 32
    geometry =
      shape === 'rectangle'
        ? rectangleGeometry(r)
        : {
            polygons: [
              {
                outer: Array.from({ length: segments }, (_, i) => ({
                  x:
                    r.x +
                    r.width / 2 +
                    (Math.cos((i * 2 * Math.PI) / segments) * r.width) / 2,
                  y:
                    r.y +
                    r.height / 2 +
                    (Math.sin((i * 2 * Math.PI) / segments) * r.height) / 2,
                })),
                holes: [],
              },
            ],
          }
  } else
    geometry = {
      polygons: [
        {
          outer:
            shape === 'freehand'
              ? simplify(points, AREA_LIMITS.tolerance)
              : points,
          holes: [],
        },
      ],
    }
  geometry = normalizeGeometry(geometry)
  const b = geometryBounds(geometry)
  if (b.width < AREA_LIMITS.minimum || b.height < AREA_LIMITS.minimum)
    throw new Error('Draw an area at least 8 × 8 map pixels.')
  if (
    allRings(geometry).some((r) =>
      r.some((p) => p.x < 0 || p.y < 0 || p.x > map.width || p.y > map.height),
    )
  )
    throw new Error('Keep the entire new area inside the map.')
  return geometry
}
export function closestPoint(p: Point, a: Point, b: Point) {
  const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2,
    t = d
      ? Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / d,
          ),
        )
      : 0
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}
// Iterative RDP: bounded stack and samples; tolerance is in map pixels, never screen pixels.
export function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length > AREA_LIMITS.samples)
    throw new Error('Freehand sample limit reached. Draw a shorter contour.')
  if (points.length < 3) return points
  const keep = new Set([0, points.length - 1]),
    stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    let max = tolerance,
      index = -1
    for (let i = a + 1; i < b; i++) {
      const d = distance(
        points[i],
        closestPoint(points[i], points[a], points[b]),
      )
      if (d > max) {
        max = d
        index = i
      }
    }
    if (index >= 0) {
      keep.add(index)
      stack.push([a, index], [index, b])
    }
  }
  const result = points.filter((_, i) => keep.has(i))
  if (result.length > AREA_LIMITS.simplified)
    throw new Error(
      'Freehand detail exceeds 512 points. Draw a simpler contour.',
    )
  return result
}
export function createArea(
  geometry: AreaGeometry,
  fill: AreaFill = { kind: 'solid', color: '#769aa0' },
): AreaObject {
  const g = normalizeGeometry(geometry),
    b = geometryBounds(g)
  return {
    kind: 'area',
    id: crypto.randomUUID(),
    name: 'Area',
    geometry: g,
    ...b,
    fill,
    opacity: 1,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    strokeColor: '#263a42',
    strokeOpacity: 1,
    strokeWidth: 0,
    strokeStyle: 'solid',
    patternFrame: { ...b },
  }
}
export function migratePattern(o: PatternFillObject): AreaObject {
  return {
    ...createArea(rectangleGeometry(o)),
    id: o.id,
    name: 'Pattern area',
    locked: o.locked,
    opacity: o.opacity,
    fill: {
      kind: 'pattern',
      assetId: o.assetId,
      mode: o.mode,
      scale: o.patternScale,
      rotation: o.patternRotation,
      offsetX: o.patternOffsetX,
      offsetY: o.patternOffsetY,
    },
  }
}
export function withGeometry(o: AreaObject, g: AreaGeometry): AreaObject {
  const geometry = normalizeGeometry(g)
  return { ...o, geometry, ...geometryBounds(geometry) }
}
export function transformArea(o: AreaObject, t: ObjectTransform): AreaObject {
  const sx = t.width / o.width,
    sy = t.height / o.height
  if (
    t.rotation !== 0 ||
    t.scaleX !== 1 ||
    t.scaleY !== 1 ||
    sx <= 0 ||
    sy <= 0
  )
    throw new Error('Area transforms must preserve orientation.')
  const move = (p: Point) => ({
    x: t.x + (p.x - o.x) * sx,
    y: t.y + (p.y - o.y) * sy,
  })
  const geometry = {
    polygons: o.geometry.polygons.map((p) => ({
      outer: p.outer.map(move),
      holes: p.holes.map((h) => h.map(move)),
    })),
  }
  const frame = move(o.patternFrame)
  return {
    ...withGeometry(o, geometry),
    ...(o.patternTransform ? {
      patternFrame: o.patternFrame,
      patternTransform: [sx*o.patternTransform[0],sy*o.patternTransform[1],sx*o.patternTransform[2],sy*o.patternTransform[3],sx*o.patternTransform[4]+t.x-o.x*sx,sy*o.patternTransform[5]+t.y-o.y*sy] as [number,number,number,number,number,number],
    } : { patternFrame: { ...frame, width: o.patternFrame.width*sx, height:o.patternFrame.height*sy } }),
  }
}
export function offsetObject<T extends MapObject>(
  o: T,
  dx: number,
  dy: number,
): T {
  return (
    o.kind === 'scatter' ? validateScatter(composeScatter(o,[1,0,0,1,dx,dy])) : o.kind === 'path' ? transformPath(o, {...o,x:o.x+dx,y:o.y+dy}) : o.kind === 'area'
      ? transformArea(o, { ...o, x: o.x + dx, y: o.y + dy })
      : { ...o, x: o.x + dx, y: o.y + dy }
  ) as T
}
export function validateArea(o: AreaObject): AreaObject {
  if(o.land!==undefined)validateLandArea(o.land)
  if (o.roomSource !== undefined) {
    const s=o.roomSource
    if(!s||typeof s!=='object'||Object.keys(s).some(k=>!['wallIds','fingerprint','seed'].includes(k))||!Array.isArray(s.wallIds)||!s.wallIds.length||s.wallIds.length>256||new Set(s.wallIds).size!==s.wallIds.length||s.wallIds.some(id=>typeof id!=='string'||!/^[\w-]{1,80}$/.test(id))||typeof s.fingerprint!=='string'||!/^[a-f0-9]{1,8}$/.test(s.fingerprint)||!s.seed||Object.keys(s.seed).some(k=>!['x','y'].includes(k))||![s.seed.x,s.seed.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=AREA_LIMITS.coordinate))throw new Error('Invalid room floor provenance.')
  }
  const keys = (value: unknown, allowed: string[]) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((k) => !allowed.includes(k))
    )
      throw new Error('Invalid area fields.')
  }
  keys(o.geometry, ['polygons'])
  if (
    !Array.isArray(o.geometry.polygons) ||
    o.geometry.polygons.length > AREA_LIMITS.polygons
  )
    throw new Error('Invalid area polygons.')
  for (const p of o.geometry.polygons) {
    keys(p, ['outer', 'holes'])
    if (!Array.isArray(p.holes) || p.holes.length > AREA_LIMITS.holes)
      throw new Error('Invalid holes.')
    for (const r of [p.outer, ...p.holes]) {
      if (!Array.isArray(r) || r.length > AREA_LIMITS.ring + 1)
        throw new Error('Invalid ring.')
      for (const point of r) keys(point, ['x', 'y'])
    }
  }
  keys(o.patternFrame, ['x', 'y', 'width', 'height'])
  keys(
    o.fill,
    o.fill?.kind === 'pattern'
      ? ['kind', 'assetId', 'mode', 'scale', 'rotation', 'offsetX', 'offsetY']
      : o.fill?.kind === 'solid'
        ? ['kind', 'color']
        : ['kind'],
  )
  if (o.patternTransform !== undefined && (!Array.isArray(o.patternTransform) || o.patternTransform.length !== 6 || !o.patternTransform.every(n => Number.isFinite(n) && Math.abs(n) <= AREA_LIMITS.coordinate) || Math.abs(o.patternTransform[0] * o.patternTransform[3] - o.patternTransform[1] * o.patternTransform[2]) < 1e-12)) throw new Error('Invalid area pattern transform.')
  const area = withGeometry(o, o.geometry)
  if (
    !['x', 'y', 'width', 'height'].every((key) => {
      const k = key as 'x' | 'y' | 'width' | 'height'
      return (
        Number.isFinite(o[k]) &&
        Math.abs(o[k]) <= AREA_LIMITS.coordinate &&
        Math.abs(o[k] - area[k]) < 1e-5
      )
    })
  )
    throw new Error('Area bounds do not match its geometry.')
  if (
    o.kind !== 'area' ||
    typeof o.id !== 'string' ||
    !/^[\w-]{1,80}$/.test(o.id) ||
    typeof o.name !== 'string' ||
    !o.name.trim() ||
    o.name.length > 120 ||
    [...o.name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    throw new Error('Invalid area identity.')
  if (
    ![o.opacity, o.strokeOpacity].every(
      (n) => Number.isFinite(n) && n >= 0 && n <= 1,
    ) ||
    !Number.isFinite(o.strokeWidth) ||
    o.strokeWidth < 0 ||
    o.strokeWidth > 1024 ||
    !['solid', 'dashed', 'dotted'].includes(o.strokeStyle) ||
    !/^#[\da-f]{6}$/i.test(o.strokeColor)
  )
    throw new Error('Invalid area stroke or opacity.')
  if (
    o.rotation !== 0 ||
    o.scaleX !== 1 ||
    o.scaleY !== 1 ||
    (o.visible !== undefined && typeof o.visible !== 'boolean') ||
    (o.locked !== undefined && typeof o.locked !== 'boolean')
  )
    throw new Error('Invalid area transform.')
  if (
    !o.patternFrame ||
    ![
      o.patternFrame.x,
      o.patternFrame.y,
      o.patternFrame.width,
      o.patternFrame.height,
    ].every(
      (n) => Number.isFinite(n) && Math.abs(n) <= AREA_LIMITS.coordinate,
    ) ||
    o.patternFrame.width <= 0 ||
    o.patternFrame.height <= 0
  )
    throw new Error('Invalid pattern frame.')
  const f = o.fill
  if (!f || !['none', 'solid', 'pattern'].includes(f.kind))
    throw new Error('Invalid area fill.')
  if (f.kind === 'solid' && !/^#[\da-f]{6}$/i.test(f.color))
    throw new Error('Choose a six-digit hex color.')
  if (
    f.kind === 'pattern' &&
    (typeof f.assetId !== 'string' ||
      !/^[\w-]{1,80}$/.test(f.assetId) ||
      !['repeat', 'stretch'].includes(f.mode) ||
      ![f.scale, f.rotation, f.offsetX, f.offsetY].every(
        (n) => Number.isFinite(n) && Math.abs(n) <= AREA_LIMITS.coordinate,
      ) ||
      f.scale < MIN_PATTERN_SCALE ||
      f.scale > MAX_PATTERN_SCALE)
  )
    throw new Error('Invalid area pattern.')
  return area
}
