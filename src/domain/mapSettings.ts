import { validateRendering } from './rendering'
import { validateCoastalContours } from './coastalContours'
import { isHexGrid, hexCenter, pixelToHex } from './hexGrid'
import { inGeometryRange } from './documentLimits'
import { validateWaterDepth } from './waterDepth'
import { validateGeographyFinish } from './geographyFinish'
import { validateLandEditing } from './landEditing'
import { validateTerrainPaint, validateTexturePaint } from './terrainPaint'
import { validateWorldThemeState } from './worldThemes'
import { validateMapEffects } from './mapEffects'
import { validateWaterAppearance } from './terrainStyles'
import { validateWorldGeneration } from '../world/model'
import { isLandMap, mapWorkspace } from './geography'
import type { GridSettings, MapDocument, PlacedObject } from './models'
import type { Point, Size } from '../canvas/viewport'
import { MAX_IMAGE_EDGE, MAX_IMAGE_PIXELS } from '../imports/limits'
import { selectionBounds } from './layers'
export const MIN_MAP_EDGE = 1
export const MAX_MAP_EDGE = MAX_IMAGE_EDGE
export const MAX_MAP_PIXELS = MAX_IMAGE_PIXELS
export const MIN_CELL_SIZE = 4
export const MAX_CELL_SIZE = 1024
export const DEFAULT_GRID: GridSettings = { visible: true, snapEnabled: false, cellSize: 50, offsetX: 0, offsetY: 0, color: '#58645c', opacity: 0.35, renderAboveObjects: false }
export const defaultMapStyle = () => ({ backgroundColor: '#d7d7cf', grid: { ...DEFAULT_GRID } })
export type MapSettings = Pick<MapDocument, 'rendering' | 'width' | 'height' | 'backgroundColor' | 'grid' | 'mapType' | 'geography' | 'generation' | 'water' | 'effects' | 'theme' | 'texturePaint' | 'terrainPaint' | 'landEditing' | 'geographyFinish' | 'waterDepth' | 'coastalContours'>
export function normalizeColor(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Use a six-digit hex color, for example #d7d7cf.')
  return color.toLowerCase()
}
export function normalizeOffset(value: number, cellSize: number) { return ((value % cellSize) + cellSize) % cellSize }
export function normalizeGrid(grid: GridSettings): GridSettings {
  if(isHexGrid(grid)&&![grid.offsetX,grid.offsetY].every(inGeometryRange))throw Error('Hex origin offsets must be within ±1,000,000,000 pixels.')
  if(grid.type!==undefined&&!['square','hex-flat','hex-pointy'].includes(grid.type))throw Error('Invalid grid type.')
  if (grid.physicalScale && (!Number.isFinite(grid.physicalScale.distancePerCell) || grid.physicalScale.distancePerCell <= 0 || grid.physicalScale.distancePerCell > 1e6 || !['ft','m'].includes(grid.physicalScale.unit))) throw Error('Physical scale requires a positive distance per cell (up to 1,000,000 ft or m).')
  if (!Number.isFinite(grid.cellSize) || grid.cellSize < MIN_CELL_SIZE || grid.cellSize > MAX_CELL_SIZE) throw new Error(`Cell size must be ${MIN_CELL_SIZE}–${MAX_CELL_SIZE} px.`)
  if (![grid.offsetX, grid.offsetY, grid.opacity].every(Number.isFinite)) throw new Error('Offsets and opacity must be finite numbers.')
  if (grid.opacity < 0 || grid.opacity > 1) throw new Error('Line opacity must be 0–100%.')
  if (![grid.visible, grid.snapEnabled, grid.renderAboveObjects].every((value) => typeof value === 'boolean')) throw new Error('Invalid grid options.')
  return { ...grid, color: normalizeColor(grid.color), offsetX: isHexGrid(grid)?grid.offsetX:normalizeOffset(grid.offsetX, grid.cellSize), offsetY: isHexGrid(grid)?grid.offsetY:normalizeOffset(grid.offsetY, grid.cellSize) }
}
export function normalizeMapSettings(settings: MapSettings): MapSettings {
  if (![settings.width, settings.height].every((value) => Number.isInteger(value) && value >= MIN_MAP_EDGE && value <= MAX_MAP_EDGE) || settings.width * settings.height > MAX_MAP_PIXELS) throw new Error(`Map size must be ${MIN_MAP_EDGE}–${MAX_MAP_EDGE} whole pixels per side, at most ${MAX_MAP_PIXELS.toLocaleString('en-US')} pixels total.`)
  return { rendering: settings.rendering === undefined ? undefined : validateRendering(settings.rendering), ...(settings.texturePaint===undefined?{}:{texturePaint:validateTexturePaint(settings.texturePaint)}), ...(settings.coastalContours===undefined?{}:{coastalContours:validateCoastalContours(settings.coastalContours)}), ...(settings.waterDepth===undefined?{}:{waterDepth:validateWaterDepth(settings.waterDepth)}), geographyFinish: settings.geographyFinish === undefined ? undefined : validateGeographyFinish(settings.geographyFinish), ...(settings.landEditing===undefined?{}:{landEditing:validateLandEditing(settings.landEditing)}), ...(settings.terrainPaint===undefined?{}:{terrainPaint:validateTerrainPaint(settings.terrainPaint)}), theme: settings.theme === undefined ? undefined : validateWorldThemeState(settings.theme), effects: settings.effects === undefined ? undefined : validateMapEffects(settings.effects), water: settings.water === undefined ? undefined : validateWaterAppearance(settings.water), ...(settings.generation?{generation:validateWorldGeneration(settings.generation)}:{}), ...mapWorkspace(settings), width: settings.width, height: settings.height, backgroundColor: normalizeColor(settings.backgroundColor), grid: normalizeGrid(settings.grid) }
}
export function snapPoint(point: Point, grid: GridSettings, bypass = false): Point {
  if (!grid.snapEnabled || bypass) return point
  if(isHexGrid(grid))return hexCenter(pixelToHex(point,grid),grid)
  return { x: grid.offsetX + Math.round((point.x - grid.offsetX) / grid.cellSize) * grid.cellSize, y: grid.offsetY + Math.round((point.y - grid.offsetY) / grid.cellSize) * grid.cellSize }
}
export function snapDelta(primary: PlacedObject, grid: GridSettings, bypass = false): Point {
  const center = { x: primary.x + primary.width / 2, y: primary.y + primary.height / 2 }
  const snapped = snapPoint(center, grid, bypass)
  return { x: snapped.x - center.x, y: snapped.y - center.y }
}
export function resizeImpact(map: MapDocument, objects: PlacedObject[], size: Size) {
  const shrinking = size.width < map.width || size.height < map.height
  const affected = shrinking ? objects.filter((object) => {
    const bounds = selectionBounds([object])
    return bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > size.width + 1e-8 || bounds.y + bounds.height > size.height + 1e-8
  }).length : 0
  const background = shrinking && !!map.background && (map.background.width > size.width || map.background.height > size.height)
  return { objectCount: affected, background, needsConfirmation: affected > 0 || background }
}
export function cellSummary(length: number, cell: number, offset: number) {
  const leading = Math.min(normalizeOffset(offset, cell), length)
  const whole = Math.floor((length - leading) / cell)
  const trailing = length - leading - whole * cell
  const partial = [leading, trailing].filter((value) => value > 1e-8)
  return `${whole} full${partial.length ? ` + partial (${partial.map((value) => `${Number(value.toFixed(4))} px`).join(' + ')})` : ''}`
}
export function gridRenderPosition(grid: GridSettings) { return !grid.visible ? 'hidden' : grid.renderAboveObjects ? 'above' : 'below' }
// Thin only the display below four screen pixels; snapping retains the actual cell size.
export function gridDisplayStep(grid: GridSettings, zoom: number) { return grid.cellSize * Math.max(1, Math.ceil(4 / (grid.cellSize * zoom))) }

export const interactionGrid = (map:MapDocument):GridSettings => isLandMap(map)&&!isHexGrid(map.grid)?{...map.grid,snapEnabled:false}:map.grid
