import type { MapLayer, PlacedObject } from './models'
export const OBJECT_OFFSET = 24
export type OrderAction = 'forward' | 'backward' | 'front' | 'back'
export const defaultLayer = (): MapLayer => ({ id: 'objects', name: 'Objects', visible: true, locked: false, objectIds: [] })
// Entry point for legacy flat session objects; each instance is adopted exactly once.
export function createLayeredContent(objects: PlacedObject[] = []) {
  return { objects, layers: [{ ...defaultLayer(), objectIds: objects.map((object) => object.id) }] }
}
export function editableIds(layers: MapLayer[], objects: PlacedObject[]) {
  const existing = new Set(objects.filter((object) => !object.locked && object.visible !== false).map((object) => object.id))
  return new Set(layers.filter((layer) => layer.visible && !layer.locked).flatMap((layer) => layer.objectIds).filter((id) => existing.has(id)))
}
// Panel order is top to bottom; Konva paints back to front.
export function orderedObjects(layers: MapLayer[], objects: PlacedObject[], visibleOnly = false) {
  const byId = new Map(objects.map((object) => [object.id, object]))
  return layers.slice().reverse().filter((layer) => !visibleOnly || layer.visible).flatMap((layer) => layer.objectIds.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []))
}
export function reorderObjects(ids: string[], selection: string[], action: OrderAction) {
  const selected = new Set(selection)
  const result = [...ids]
  if (action === 'front' || action === 'back') {
    const yes = ids.filter((id) => selected.has(id)), no = ids.filter((id) => !selected.has(id))
    return action === 'front' ? [...no, ...yes] : [...yes, ...no]
  }
  if (action === 'forward') {
    for (let i = result.length - 2; i >= 0; i--) if (selected.has(result[i]) && !selected.has(result[i + 1])) [result[i], result[i + 1]] = [result[i + 1], result[i]]
  } else {
    for (let i = 1; i < result.length; i++) if (selected.has(result[i]) && !selected.has(result[i - 1])) [result[i], result[i - 1]] = [result[i - 1], result[i]]
  }
  return result
}
export function selectionBounds(objects: PlacedObject[]) {
  const points = objects.flatMap((object) => {
    const radians = object.rotation * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians)
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
      const x = sx * object.width / 2, y = sy * object.height / 2
      return { x: object.x + object.width / 2 + x * cos - y * sin, y: object.y + object.height / 2 + x * sin + y * cos }
    })
  })
  const x = Math.min(...points.map((point) => point.x)), y = Math.min(...points.map((point) => point.y))
  return { x, y, width: Math.max(...points.map((point) => point.x)) - x, height: Math.max(...points.map((point) => point.y)) - y }
}


