import type { MapDocument } from './models'
import { SIMPLE_WALL, type WallStyle } from './walls'
export const WALL_PRESETS = [
  { id: 'timber', title: 'Simple Timber', feet: 1, color: '#987044', join: 'miter' },
  { id: 'polished-wood', title: 'Polished Wood', feet: 1, color: '#b48450', join: 'miter' },
  { id: 'living-wood', title: 'Living Wood', feet: 2, color: '#6b7044', join: 'round' },
  { id: 'heartwood', title: 'Rough Heartwood', feet: 3, color: '#674a33', join: 'bevel' },
  { id: 'root', title: 'Root Wall', feet: 3, color: '#514732', join: 'round' },
  { id: 'stone', title: 'Stone', feet: 3, color: '#82847c', join: 'miter' },
  { id: 'cave', title: 'Rough Stone / Cave Rock', feet: 5, color: '#555954', join: 'bevel' },
] as const
export function wallMapUnits(map: MapDocument) {
  const s = map.grid.physicalScale
  return { unit: s?.unit ?? 'cells' as const, pixels: map.grid.cellSize / (s?.distancePerCell ?? 1) }
}
export function wallPreset(id: string, map: MapDocument): WallStyle {
  const p = WALL_PRESETS.find(p => p.id === id)
  if (!p) throw Error('Unknown wall preset.')
  const u = wallMapUnits(map), thickness = p.feet * (u.unit === 'm' ? .3048 : u.unit === 'cells' ? .2 : 1)
  return { ...structuredClone(SIMPLE_WALL), strokeWidth: thickness * u.pixels, stroke: { kind: 'solid', color: p.color }, join: p.join,
    wall: { ...structuredClone(SIMPLE_WALL.wall), unit: u.unit, pixelsPerUnit: u.pixels, outline: { enabled: false, color: '#343632', width: 0, opacity: 1 } } }
}
