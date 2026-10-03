import { paintRoute } from './drawRoute'
import { paintWall } from './drawWall'
import type { OpeningObject, PathObject } from '../domain/models'
import { pathGeometry, texturePositions } from '../domain/paths'
export function pathTrace(
  c: CanvasRenderingContext2D,
  path: Pick<PathObject, 'nodes' | 'closed'>,
  x = 0,
  y = 0,
) {
  c.beginPath()
  const first = path.nodes[0]
  if (!first) return
  c.moveTo(first.x - x, first.y - y)
  for (const s of pathGeometry(path).segments) {
    const p = s.curve.points
    if (s.straight) c.lineTo(p[3].x - x, p[3].y - y)
    else
      c.bezierCurveTo(
        p[1].x - x,
        p[1].y - y,
        p[2].x - x,
        p[2].y - y,
        p[3].x - x,
        p[3].y - y,
      )
  }
  if (path.closed) c.closePath()
}
const tiles = new WeakMap<PathObject, ReturnType<typeof texturePositions>>()
// One explicit dispatch point; future pathKind renderers belong here.
export function paintPath(
  c: CanvasRenderingContext2D,
  path: PathObject,
  image?: CanvasImageSource,
  connections: {x:number;y:number}[] = [],
  openings: OpeningObject[] = [],
  preview = false,
) {
  if (path.route) return paintRoute(c,path,image,undefined,connections)
  if (path.pathKind === 'wall') return paintWall(c,path,image,connections,openings,preview)
  c.save()
  try {
    c.globalAlpha *= path.opacity
    c.lineWidth = path.strokeWidth
    c.lineCap = path.cap
    c.lineJoin = path.join
    c.miterLimit = 2
    if (path.stroke.kind === 'texture' && image) {
      let positions = tiles.get(path)
      if (!positions) {
        positions = texturePositions(path)
        tiles.set(path, positions)
      }
      const size = path.strokeWidth * path.stroke.scale
      for (const p of positions) {
        c.save()
        c.translate(p.point.x - path.x, p.point.y - path.y)
        c.rotate(Math.atan2(p.tangent.y, p.tangent.x))
        c.drawImage(image, -size / 2, -size / 2, size, size)
        c.restore()
      }
    } else {
      pathTrace(c, path, path.x, path.y)
      c.strokeStyle =
        path.stroke.kind === 'texture' ? '#d15a88' : path.stroke.color
      c.setLineDash(
        path.stroke.kind === 'dashed'
          ? [path.stroke.dash, path.stroke.gap]
          : path.stroke.kind === 'texture'
            ? [8, 4]
            : [],
      )
      c.stroke()
    }
  } finally {
    c.restore()
  }
}


