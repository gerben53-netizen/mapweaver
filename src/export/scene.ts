import { effectiveRendering } from '../domain/rendering'
import type { ArlMode } from '../store/arlStore'
import { environmentalOrder, environmentalBoundary } from '../domain/environmentalDetail'
import { texturePaintOrder, texturePaintBoundary } from '../domain/terrainPaint'
import { textureFloors } from '../domain/textureBrush'
import { isHexGrid, hexGridRange, MAX_HEX_CELLS } from '../domain/hexGrid'
import { landBaseOrder } from '../domain/landEditing'
import { terrainPaintOrder, terrainPaintBoundary } from '../domain/terrainPaint'
import { effectOrder, fogBoundary } from '../domain/mapEffects'
import { metersPerPixel } from '../domain/decorations'
import { isLandMap,mapWorkspace,formatDistance,unitKm } from '../domain/geography'
import { reconcileOpenings } from '../domain/openings'
import type { MapDocument, MapObject } from '../domain/models'
import type { ProjectSnapshot } from '../store/history'
import { projectObjects } from '../domain/projectView'
import { normalizeOffset, cellSummary } from '../domain/mapSettings'
export const EXPORT_LIMITS = { pixels: 32_000_000, edge: 16384, workingBytes: 512 * 1024 * 1024 } as const
export interface ExportOptions { arlMode?:ArlMode; includeScaleBar?:boolean; scale: 1 | 2; includeGrid: boolean; transparent: boolean }
export type ExportItem = {kind:'environmentalFloor'|'environmentalEdge'|'baseTexturePaint'|'texturePaint'|'fog'|'finish'|'terrainPaint'|'relief'|'waterDepth'|'coastalContours'} | {kind:'scaleBar'} | { kind: 'color'; color: string } | { kind: 'background'; background: NonNullable<MapDocument['background']> } | { kind: 'grid' } | { kind: 'object'; object: MapObject }
export interface ExportScene { arlMode?:ArlMode; textureRestricted?:boolean; map: MapDocument; width: number; height: number; scale: 1 | 2; items: ExportItem[] }
export function exportDimensions(map: Pick<MapDocument, 'width' | 'height'>, scale: 1 | 2) {
  const width = map.width * scale, height = map.height * scale
  if (![1, 2].includes(scale) || ![width, height].every((n) => Number.isInteger(n) && n > 0 && n <= EXPORT_LIMITS.edge) || width * height > EXPORT_LIMITS.pixels) throw new Error('Export exceeds 32 million pixels or 16,384 pixels per side. Choose 1× or a smaller map.')
  return { width, height }
}
export function exportScene(project: ProjectSnapshot, options: ExportOptions): ExportScene {
  if(options.includeGrid&&isHexGrid(project.map.grid)&&(project.map.grid.cellSize<6||hexGridRange(project.map,project.map.grid).count>MAX_HEX_CELLS))throw Error('Hex grid is too dense. Increase its diameter or export without the grid.')
  reconcileOpenings(project.objects,project.layers,true)
  const { width, height } = exportDimensions(project.map, options.scale)
  const map = structuredClone(project.map), items: ExportItem[] = []
  if (!options.transparent) items.push({ kind: 'color', color: map.backgroundColor })
  if (map.background) items.push({ kind: 'background', background: map.background })
  if(map.texturePaint?.baseTiles)items.push({kind:'baseTexturePaint'})
  if (options.includeGrid && !map.grid.renderAboveObjects) items.push({ kind: 'grid' })
  const baseOrder = landBaseOrder(terrainPaintOrder(effectOrder(projectObjects(project, true).filter(o=>!(o.kind==='area'&&o.ceiling)), map.effects),!!map.terrainPaint||!!map.landEditing||!!map.geographyFinish||!!map.waterDepth?.enabled||!!(map.coastalContours?.enabled&&map.coastalContours.count)),!!map.landEditing||!!map.geographyFinish||!!map.waterDepth?.enabled||!!(map.coastalContours?.enabled&&map.coastalContours.count))
  const ordered=environmentalOrder(texturePaintOrder(baseOrder,!!map.texturePaint),!!map.environmentalDetail),textureBoundary=texturePaintBoundary(ordered),paintBoundary=terrainPaintBoundary(ordered),boundary=fogBoundary(ordered,map.effects)
  const detailFloor=environmentalBoundary(ordered),detailEdge=detailFloor
  ordered.forEach((object,index)=>{if(index===textureBoundary&&map.texturePaint)items.push({kind:'texturePaint'});if(index===paintBoundary&&map.waterDepth?.enabled)items.push({kind:'waterDepth'});if(index===paintBoundary&&map.coastalContours?.enabled&&map.coastalContours.count)items.push({kind:'coastalContours'});if(index===paintBoundary&&map.terrainPaint)items.push({kind:'terrainPaint'});if(index===paintBoundary&&map.geographyFinish)items.push({kind:'relief'});if(index===detailFloor&&map.environmentalDetail)items.push({kind:'environmentalFloor'});if(index===detailEdge&&map.environmentalDetail)items.push({kind:'environmentalEdge'});if(index===boundary)items.push({kind:'fog'});items.push({kind:'object',object:structuredClone(object)})})
  if(textureBoundary===ordered.length&&map.texturePaint)items.push({kind:'texturePaint'})
  if(paintBoundary===ordered.length&&map.waterDepth?.enabled)items.push({kind:'waterDepth'})
  if(paintBoundary===ordered.length&&map.coastalContours?.enabled&&map.coastalContours.count)items.push({kind:'coastalContours'})
  if(paintBoundary===ordered.length&&map.terrainPaint)items.push({kind:'terrainPaint'})
  if(paintBoundary===ordered.length&&map.geographyFinish)items.push({kind:'relief'})
  if(detailFloor===ordered.length&&map.environmentalDetail)items.push({kind:'environmentalFloor'})
  if(detailEdge===ordered.length&&map.environmentalDetail)items.push({kind:'environmentalEdge'})
  if(boundary===-1&&map.effects?.fog.enabled)items.push({kind:'fog'})
  if(items.some(i=>i.kind==='object'&&i.object.kind==='scaleBar')&&metersPerPixel(map)===null)throw Error('Configure physical scale in Map settings, or hide the unavailable scale bar before exporting.')
  if (options.includeGrid && map.grid.renderAboveObjects) items.push({ kind: 'grid' })
  if(isLandMap(map)&&options.includeScaleBar)items.push({kind:'scaleBar'})
  if(map.effects?.vignette.enabled||map.effects?.frame.enabled)items.push({kind:'finish'})
  return { arlMode:options.arlMode??effectiveRendering(project.map).arl, textureRestricted:textureFloors(project.objects).length>0, map, width, height, scale: options.scale, items }
}
export function roll20Settings(map: MapDocument, options: ExportOptions) {
  if(isHexGrid(map.grid))return `PNG: ${map.width*options.scale} × ${map.height*options.scale} pixels. Hex ${map.grid.type==='hex-flat'?'flat':'pointy'} top: ${map.grid.cellSize*options.scale} px corner-to-corner; origin ${map.grid.offsetX*options.scale}, ${map.grid.offsetY*options.scale} px. Grid ${options.includeGrid?'included':'not included'}. Align the image manually in your VTT.`
  if(isLandMap(map)){const g=mapWorkspace(map).geography;return `PNG: ${map.width*options.scale} × ${map.height*options.scale} pixels
Map width: ${formatDistance(g.widthKm/unitKm(g.unit),g.unit)}
Scale bar: ${options.includeScaleBar?'included':'not included'}
Flat fictional coordinates; no Earth projection.`}
  const g = map.grid, x = normalizeOffset(g.offsetX, g.cellSize), y = normalizeOffset(g.offsetY, g.cellSize)
  const exactX = x < 1e-8 && Math.abs(map.width / g.cellSize - Math.round(map.width / g.cellSize)) < 1e-8
  const exactY = y < 1e-8 && Math.abs(map.height / g.cellSize - Math.round(map.height / g.cellSize)) < 1e-8
  const n = (value: number) => String(Number(value.toFixed(4)))
  return [`PNG: ${map.width * options.scale} × ${map.height * options.scale} pixels (${options.scale}×)`,
    `Grid: ${n(g.cellSize * options.scale)} export pixels per cell; ${options.includeGrid ? 'included' : 'not included'} in PNG`,
    `Horizontal: ${exactX ? `${Math.round(map.width / g.cellSize)} cells` : cellSummary(map.width * options.scale, g.cellSize * options.scale, x * options.scale)}`,
    `Vertical: ${exactY ? `${Math.round(map.height / g.cellSize)} cells` : cellSummary(map.height * options.scale, g.cellSize * options.scale, y * options.scale)}`,
    `Grid origin: ${n(x * options.scale)}, ${n(y * options.scale)} export pixels`,
    exactX && exactY ? 'Whole cells: use these horizontal/vertical cell counts when sizing the map in Roll20.' : 'Partial edge cells: manual grid alignment is required. Do not round cell counts to size the image.',
    'Mapweaver is the map editor; Roll20 remains the VTT. Upload and align the PNG manually.'].join('\n')
}
