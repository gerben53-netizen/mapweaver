import type { TerrainPaint } from '../domain/terrainPaint'
import type { MapObject } from '../domain/models'
import { textureFloors } from '../domain/textureBrush'
import { traceLandClip } from './landClip'
import { paintTerrain } from './drawTerrainPaint'
export function drawTexturePaint(ctx:CanvasRenderingContext2D,paint:TerrainPaint|undefined,objects:MapObject[],restricted:boolean,images:ReadonlyMap<string,CanvasImageSource>,base=false){
 ctx.save();if(base){paintTerrain(ctx,paint&&{...paint,tiles:paint.baseTiles??{}},images);ctx.restore();return}if(restricted){traceLandClip(ctx,textureFloors(objects));ctx.clip()}paintTerrain(ctx,paint,images);ctx.restore()
}
