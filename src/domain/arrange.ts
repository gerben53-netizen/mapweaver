import { isAnnotation, transformAnnotation } from './annotations'
import { scaleRoute } from './routes'
import { transformScatter } from './scatter'
import { isOpening } from './openings'
import { scaleWall } from './walls'
import type { PlacedObject } from './models'
import type { Size } from '../canvas/viewport'
import { offsetObject, transformArea } from './areas'
import { pathGeometry, validatePath, withPathGeometry } from './paths'
import { selectionBounds } from './layers'
import { validTransform } from './transforms'
import { transformSelection } from './selectionTransform'

export type ArrangeAction = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  | 'distribute-x' | 'distribute-y' | 'same-width' | 'same-height' | 'same-size' | 'map-x' | 'map-y'

/** Caller passes primary selection first. Results retain input order and identity. */
export function arrangeObjects(objects: PlacedObject[], action: ArrangeAction, map: Size): PlacedObject[] {
  if (!objects.length) return []
  if(objects.some(isOpening))throw new Error('Arrange the walls without selecting their linked openings; openings follow their wall.')
  if (objects.some(object => object.locked)) throw new Error('Unlock every selected object before arranging.')
  if (new Set(objects.map(object => object.id)).size !== objects.length) throw new Error('Selection contains duplicate objects.')
  const minimum = action.startsWith('map-') ? 1 : action.startsWith('distribute-') ? 3 : 2
  if (objects.length < minimum) throw new Error(`Select at least ${minimum} objects.`)
  const boxes = objects.map(object => selectionBounds([object]))
  const primary = boxes[0]
  let result: PlacedObject[]
  if (action === 'map-x' || action === 'map-y') {
    const combined = selectionBounds(objects)
    const dx = action === 'map-x' ? (map.width - combined.width) / 2 - combined.x : 0
    const dy = action === 'map-y' ? (map.height - combined.height) / 2 - combined.y : 0
    result = objects.map(object => offsetObject(object, dx, dy))
  } else if (action === 'distribute-x' || action === 'distribute-y') {
    const axis = action === 'distribute-x' ? 'x' : 'y', dimension = axis === 'x' ? 'width' : 'height'
    const ordered = objects.map((object, index) => ({ object, center: boxes[index][axis] + boxes[index][dimension] / 2, index })).sort((a, b) => a.center - b.center || a.index - b.index)
    const step = (ordered.at(-1)!.center - ordered[0].center) / (ordered.length - 1)
    const moved = new Map(ordered.map(({ object, center }, index) => {
      const delta = ordered[0].center + index * step - center
      return [object.id, offsetObject(object, axis === 'x' ? delta : 0, axis === 'y' ? delta : 0)]
    }))
    result = objects.map(object => moved.get(object.id)!)
  } else if (action.startsWith('same-')) {
    result = objects.map((object, index) => {
      if (!index) return object
      const box = boxes[index]
      const widthFactor = primary.width / box.width, heightFactor = primary.height / box.height
      if (action !== 'same-size' && object.kind !== 'patternFill') return transformSelection([object], { scale: action === 'same-width' ? widthFactor : heightFactor })[0]
      if (action === 'same-size' && object.kind === 'path') {
        // Bounds include symmetric stroke padding. Scale the centerline into the
        // remaining extent, rather than scaling the padded box twice.
        const geometry = pathGeometry(object).bounds
        const gw = geometry.right - geometry.x, gh = geometry.bottom - geometry.y
        const padding = (box.width - gw) / 2
        const nextPadding = gw < 1e-9 ? primary.width / 2 : gh < 1e-9 ? primary.height / 2 : padding * Math.min(widthFactor, heightFactor)
        const sx = gw < 1e-9 ? 1 : (primary.width - 2 * nextPadding) / gw
        const sy = gh < 1e-9 ? 1 : (primary.height - 2 * nextPadding) / gh
        if (!(padding > 0 && sx > 0 && sy > 0)) throw new Error('This path cannot match both visual dimensions. Use same width or same height.')
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2
        const vector = (p: { x: number; y: number }) => ({ x: p.x * sx, y: p.y * sy })
        return validatePath(withPathGeometry({ ...object, ...scaleWall(object,nextPadding / padding), ...scaleRoute(object,nextPadding / padding), strokeWidth: object.strokeWidth * nextPadding / padding }, object.nodes.map(node => ({ ...node, x: cx + (node.x - cx) * sx, y: cy + (node.y - cy) * sy, ...(node.in ? { in: vector(node.in) } : {}), ...(node.out ? { out: vector(node.out) } : {}) }))))
      }
      let sx = action === 'same-height' ? heightFactor : widthFactor
      let sy = action === 'same-width' ? widthFactor : heightFactor
      // Single-dimension matching preserves aspect ratio. Exact size uses local axes
      // for axis-aligned objects; shear cannot be represented by the stamp model.
      if (action === 'same-size' && object.kind === 'stamp') {
        const angle = object.rotation * Math.PI / 180, c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle))
        const determinant = c * c - s * s
        if (Math.abs(determinant) < 1e-8) {
          if (Math.abs(widthFactor - heightFactor) > 1e-8) throw new Error('This rotated stamp cannot match both visual dimensions. Use same width or same height.')
          sx = sy = widthFactor
        } else {
          sx = (c * primary.width - s * primary.height) / determinant / object.width
          sy = (c * primary.height - s * primary.width) / determinant / object.height
        }
      }
      if (!(sx > 0 && sy > 0)) throw new Error('The requested visual size cannot preserve this object’s rotation.')
      const width = object.width * sx, height = object.height * sy
      const transform = { ...object, x: object.x + (object.width - width) / 2, y: object.y + (object.height - height) / 2, width, height }
      const next = isAnnotation(object) ? transformAnnotation(object,transform) : object.kind === 'scatter' ? transformScatter(object,transform) : object.kind === 'area' ? transformArea(object, transform) : transform
      const actual = selectionBounds([next])
      if (action === 'same-size' && (Math.abs(actual.width - primary.width) > 1e-4 || Math.abs(actual.height - primary.height) > 1e-4)) throw new Error('This stroked geometry cannot match both bounds exactly. Use same width or same height.')
      return next
    })
  } else {
    result = objects.map((object, index) => {
      const box = boxes[index]
      const dx = action === 'left' ? primary.x - box.x : action === 'right' ? primary.x + primary.width - box.x - box.width : action === 'center-x' ? primary.x + primary.width / 2 - box.x - box.width / 2 : 0
      const dy = action === 'top' ? primary.y - box.y : action === 'bottom' ? primary.y + primary.height - box.y - box.height : action === 'center-y' ? primary.y + primary.height / 2 - box.y - box.height / 2 : 0
      return offsetObject(object, dx, dy)
    })
  }
  if (result.some(object => !validTransform(object))) throw new Error('Arrangement exceeds the coordinate limits.')
  return result
}

