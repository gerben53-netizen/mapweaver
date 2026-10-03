import { hexGridEdges, hexGridRange, MAX_HEX_CELLS, isHexGrid } from '../domain/hexGrid'
import type { Context } from 'konva/lib/Context'
import type { MapDocument } from '../domain/models'
import { gridDisplayStep, normalizeOffset } from '../domain/mapSettings'
let hexCache:{key:string;edges:ReturnType<typeof hexGridEdges>}|undefined
// Export passes zoom=1: lines occupy one map pixel and scale with the PNG.
export function drawGrid(context: Context, map: MapDocument, zoom: number) {
  if(isHexGrid(map.grid)){
    const g=map.grid
    if(g.cellSize*zoom<6||hexGridRange(map,g).count>MAX_HEX_CELLS)return
    const key=[map.width,map.height,g.type,g.cellSize,g.offsetX,g.offsetY].join(':')
    if(hexCache?.key!==key)hexCache={key,edges:hexGridEdges(map,g)}
    context.save();context.beginPath();context.rect(0,0,map.width,map.height);context.clip();context.beginPath()
    for(const [a,b] of hexCache.edges){context.moveTo(a.x,a.y);context.lineTo(b.x,b.y)}
    context.setAttr('strokeStyle',g.color);context.setAttr('globalAlpha',g.opacity);context.setAttr('lineWidth',1/zoom);context.stroke();context.restore();return
  }
  const grid = map.grid, step = gridDisplayStep(grid, zoom)
  context.save()
  context.beginPath(); context.rect(0, 0, map.width, map.height); context.clip()
  context.beginPath()
  for (let x = normalizeOffset(grid.offsetX, grid.cellSize); x <= map.width; x += step) { context.moveTo(x, 0); context.lineTo(x, map.height) }
  for (let y = normalizeOffset(grid.offsetY, grid.cellSize); y <= map.height; y += step) { context.moveTo(0, y); context.lineTo(map.width, y) }
  context.setAttr('strokeStyle', grid.color); context.setAttr('globalAlpha', grid.opacity); context.setAttr('lineWidth', 1 / zoom)
  context.stroke(); context.restore()
}
