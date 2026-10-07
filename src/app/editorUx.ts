import { isHexGrid } from '../domain/hexGrid'
import type { MapDocument } from '../domain/models'
import { isLandMap } from '../domain/geography'
export function squareDimensions(width: number, height: number, cell: number) { return { columns: width / cell, rows: height / cell } }
export function canvasFromSquares(columns: number, rows: number, cell: number) {
  if (![columns, rows, cell].every(v=>Number.isFinite(v)&&v>0)) throw Error('Enter positive columns, rows and resolution.')
  const width=columns*cell,height=rows*cell
  if (Math.abs(width-Math.round(width))>1e-7||Math.abs(height-Math.round(height))>1e-7) throw Error('These dimensions must resolve to whole pixels. Partial squares are allowed.')
  return {width:Math.round(width),height:Math.round(height)}
}
export function mapSizeText(map: MapDocument) { const d=squareDimensions(map.width,map.height,map.grid.cellSize); return isLandMap(map)||isHexGrid(map.grid)?`${map.width} × ${map.height} px`:`${Number(d.columns.toFixed(4))} × ${Number(d.rows.toFixed(4))} squares` }
export function gameScaleText(map:MapDocument) { return map.grid.physicalScale ? `1 square = ${map.grid.physicalScale.distancePerCell} ${map.grid.physicalScale.unit}` : 'Game scale not set' }
export function saveStateText(status:string, dirty:boolean, savedAt:string|null) {return status==='saving'?'Saving…':status==='error'?'Save failed':status==='conflict'?'Save conflict':status==='dirty'||dirty?'Unsaved changes':savedAt?'Saved':'Choose a project'}
export const toolNames:Record<string,string>={environmentalDetail:'Environmental Detail',ceiling:'Ceiling',textureBrush:'Texture Brush',waterDepth:'Water Depth',landBrush:'Land / Water',terrainBrush:'Terrain Brush',select:'Select',placeStamp:'Place asset',place:'Place Marker',patternFill:'Apply Material',editArea:'Edit area',editPath:'Edit path',wall:'Wall',path:'Path',route:'Path',scatter:'Scatter',opening:'Opening',area:'Area',measure:'Measure',label:'Label',legend:'Legend',compass:'Compass'}
export function toolHelp(tool:string) {
 if(['wall','path','route'].includes(tool))return 'Click nodes · Enter to finish · Esc to cancel · Space-drag to pan'
 if(['placeStamp','place','label','legend','compass'].includes(tool))return 'Click to place · Esc to return to Select · Space-drag to pan'
 if(tool==='landBrush')return 'Drag to shape land · Alt inverts Add/Remove for the stroke · Esc cancels · Space/middle-drag pans'
 if(tool==='waterDepth')return 'Drag over water to paint depth · Erase restores automatic depth · Esc cancels · Space/middle-drag pans'
 if(tool==='environmentalDetail')return 'Drag to paint detail · Esc cancels · Space/middle-drag pans'
 if(tool==='textureBrush')return 'Drag to paint materials · Esc cancels stroke · Space/middle-drag pans'
 if(tool==='terrainBrush')return 'Drag to paint terrain · Esc cancels stroke · Space/middle-drag pans · Semantic biomes stay unchanged'
 if(tool==='scatter')return 'Drag to paint · Esc cancels stroke · Space-drag to pan'
 if(tool==='opening')return 'Click a wall to place · Alt bypasses snap · Esc to cancel'
 if(tool==='editPath')return 'Drag nodes/handles · Double-click inserts · Enter commits · Esc restores'
 if(tool==='ceiling')return 'Ceiling: click vertices · Enter or click start closes · Esc cancels. Blocks direct sky light only.'
 if(tool==='area')return 'Drag a shape or click polygon points · Enter finishes polygon · Esc cancels'
 if(tool==='editArea')return 'Drag points · Enter to finish · Esc to cancel'
 if(tool==='patternFill')return 'Select an Area or Floor first; apply material to existing geometry'
 if(tool==='measure')return 'Click to measure · Enter finishes · Esc clears · Space-drag to pan'
 return 'Click to select · Shift-click adds · Space/middle-drag pans · F fits map · Shift+F fits selection'
}
