import type { LandBrush } from './landBrush'
import type { GridSettings } from './models'
import { isHexGrid, hexOrientation, pixelToHex, hexCenter } from './hexGrid'
import { DEFAULT_HEX } from './hexLandShape'
import type { Point } from '../canvas/viewport'
export function resolvedLandBrush(b:LandBrush,grid:GridSettings,bypass=false):LandBrush{
  if(b.shape!=='hexagon'||!isHexGrid(grid)||!b.snapHex||!['add','remove'].includes(b.action))return{...b,hexGrid:undefined}
  return{...b,size:b.matchHex?grid.cellSize:b.size,hex:{...(b.hex??DEFAULT_HEX),orientation:hexOrientation(grid),rotation:0},hexGrid:bypass?undefined:grid}
}
export const landGridPoint=(p:Point,b:LandBrush)=>b.hexGrid?hexCenter(pixelToHex(p,b.hexGrid),b.hexGrid):p
