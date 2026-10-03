import { TerrainStroke, type TerrainBrush } from './terrainBrush'
import { emptyTexturePaint, validateTexturePaint, type TerrainPaint } from './terrainPaint'
import { textureFloors } from './textureBrush'
import { pointInArea } from './scatter'
import type { MapObject } from './models'
import type { Point, Size } from '../canvas/viewport'

/** Two sparse surfaces, one gesture/history record. Never turns stored hidden Area paint into base paint. */
export class TextureStroke {
  private readonly base:TerrainPaint
  private readonly area:TerrainStroke
  private readonly background:TerrainStroke
  private previous:Point|null=null
  constructor(paint:TerrainPaint|undefined,readonly brush:TerrainBrush,private readonly map:Size,visibleObjects:MapObject[],hasFloors:boolean){
    this.base=paint??emptyTexturePaint()
    const floors=textureFloors(visibleObjects)
    const onFloor=(p:Point)=>floors.some(o=>pointInArea(p,o.geometry))
    // Old no-Area paint was map-wide. Keep it editable without rewriting its saved surface.
    const legacyBase=!hasFloors&&Object.keys(this.base.tiles).length>0
    const {baseTiles,...surface}=this.base
    this.area=new TerrainStroke(surface,brush,map,p=>legacyBase||onFloor(p),undefined,undefined,true)
    this.background=new TerrainStroke({...surface,tiles:baseTiles??{}},brush,map,p=>!onFloor(p)&&(brush.mode!=='paint'||!legacyBase),undefined,undefined,true)
  }
  add(p:Point){
    if(!Number.isFinite(p.x+p.y))return
    // Pointer capture may leave the map. Clip the traveled segment, never draw outside it.
    const inside=p.x>=0&&p.y>=0&&p.x<this.map.width&&p.y<this.map.height
    if(inside){this.area.add(p);this.background.add(p)}
    else if(this.previous){
      const a=this.previous,dx=p.x-a.x,dy=p.y-a.y
      const tx=dx>0?(this.map.width-a.x)/dx:dx<0?-a.x/dx:Infinity,ty=dy>0?(this.map.height-a.y)/dy:dy<0?-a.y/dy:Infinity,t=Math.min(1,tx,ty)
      if(t>=0){const edge={x:a.x+dx*t,y:a.y+dy*t};this.area.add(edge);this.background.add(edge)}
    }
    if(!inside){this.area.breakPath();this.background.breakPath()}
    if(this.area.touchedTileCount+this.background.touchedTileCount>256)throw Error('This stroke is too large. Release and continue with a new stroke.')
    this.previous=inside?p:null
  }
  private combine(area:TerrainPaint,background:TerrainPaint):TerrainPaint {
    const used=new Set([...Object.values(area.tiles),...Object.values(background.tiles)].flatMap(t=>Object.keys(t)))
    const materials=Object.fromEntries(Object.entries({...area.materials,...background.materials}).filter(([id])=>used.has(id)))
    return {...this.base,materials,tiles:area.tiles,baseTiles:background.tiles}
  }
  snapshot(){return this.combine(this.area.snapshot(),this.background.snapshot())}
  finish(){return validateTexturePaint(this.combine(this.area.finish(),this.background.finish()))}
}
