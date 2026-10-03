import type { Point, Size } from '../canvas/viewport'
import { decodeMask, emptyTerrainPaint, emptyTexturePaint, paintStep, textureMaterialKey, encodeMask, materialKey, PAINT_LIMITS, PAINT_SAMPLES, type TerrainPaint, type PaintMaterial } from './terrainPaint'
import { TERRAIN_STYLES, type TerrainStyleId } from './terrainStyles'
import { premiumTerrain } from './premiumTerrain'

export interface TerrainBrush { mode: 'paint' | 'erase' | 'blend'; style: TerrainStyleId; size: number; softness: number; strength: number; textureScale: number; textureId?: string; assetId?: string }
export const defaultTerrainBrush: TerrainBrush = { mode: 'paint', style: 'grassland', size: 120, softness: .65, strength: .4, textureScale: .6 }
export function brushFalloff(distance: number, radius: number, softness: number) {
  if (distance >= radius) return 0
  const hard = radius * (1 - softness)
  if (distance <= hard || !softness) return 1
  const t = (radius - distance) / (radius - hard)
  return t * t * (3 - 2 * t)
}
export function validateBrush(b: TerrainBrush) {
  if (b.textureId !== undefined && premiumTerrain(b.textureId)?.style !== b.style) throw Error('Unknown or mismatched premium terrain texture.')
  if (!['paint','erase','blend'].includes(b.mode) || !Object.hasOwn(TERRAIN_STYLES,b.style) || ![b.size,b.softness,b.strength,b.textureScale].every(Number.isFinite) || b.size < 8 || b.size > 512 || b.softness < 0 || b.softness > 1 || b.strength < 0 || b.strength > 1 || b.textureScale < .01 || b.textureScale > 100) throw Error('Invalid terrain brush settings.')
}
type Masks = Record<string, Uint8Array>
interface WorkTile { before: Masks; after: Masks; coverage: Float32Array; neighbors: Masks[]; targets: Record<string, Float32Array> }
/** Mutable, temporary stroke. Project state and history see only immutable tile snapshots. */
export class TerrainStroke {
  readonly base: TerrainPaint
  private layer: TerrainPaint
  private work = new Map<string, WorkTile>()
  private sources = new Map<string, Masks>()
  private dirty = new Set<string>()
  private previous: Point | null = null
  private lastDab: Point | null = null
  private remainder = 0
  private material: string
  constructor(base: TerrainPaint | undefined, readonly brush: TerrainBrush, readonly map: Size, private readonly canPaint?: (point: Point) => boolean, private readonly blendField?: {materials:Record<string,PaintMaterial>;target:(point:Point)=>Record<string,number>}, private readonly distance?:(sample:Point,center:Point)=>number, textureSurface=false) {
    validateBrush(brush)
    if(textureSurface && brush.textureId)throw Error('Texture brush uses library materials only.')
    this.base = base || (textureSurface?emptyTexturePaint():emptyTerrainPaint())
    if (this.base.locked || !this.base.visible) throw Error(`Show and unlock ${textureSurface?'Texture':'Terrain'} paint before painting.`)
    if(textureSurface&&brush.mode==='paint'&&!brush.assetId)throw Error('Choose a material before painting.')
    this.material = brush.assetId?textureMaterialKey(brush.assetId,brush.textureScale):materialKey(brush.style,brush.textureScale,brush.textureId)
    this.layer = this.base
    if(blendField)this.layer={...this.base,materials:{...this.base.materials,...blendField.materials}}
    if (brush.mode === 'paint' && !Object.hasOwn(this.base.materials,this.material)) {
      // Remove unused combinations before admitting another texture scale.
      const used = new Set(Object.values(this.base.tiles).flatMap(t=>Object.keys(t)))
      const materials = Object.fromEntries(Object.entries(this.base.materials).filter(([id])=>used.has(id)))
      if (used.size >= PAINT_LIMITS.materials) throw Error('Terrain paint supports 32 style/scale combinations. Reuse an existing scale or erase an unused material.')
      this.layer = {...this.base, version: brush.textureId ? 2 : this.base.version, materials:{...materials,[this.material]:(textureSurface?{assetId:brush.assetId!,scale:brush.textureScale}:{style:brush.style,scale:brush.textureScale,...(brush.textureId?{textureId:brush.textureId}:{})})}}
    }
  }
  private source(key: string) {
    let masks = this.sources.get(key)
    if (!masks) { masks = Object.fromEntries(Object.entries(this.base.tiles[key] || {}).map(([id,encoded])=>[id,decodeMask(encoded)])); this.sources.set(key,masks) }
    return masks
  }
  private dab(p: Point) {
    this.lastDab = p
    const radius = this.brush.size / 2, step = paintStep(this.base), n = PAINT_SAMPLES
    const x0 = Math.max(0,Math.floor((p.x-radius)/step)), y0 = Math.max(0,Math.floor((p.y-radius)/step))
    const x1 = Math.min(Math.ceil(this.map.width/step)-1,Math.ceil((p.x+radius)/step)), y1 = Math.min(Math.ceil(this.map.height/step)-1,Math.ceil((p.y+radius)/step))
    for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++) {
      const alpha = this.brush.strength * brushFalloff(this.distance?this.distance({x:(x+.5)*step,y:(y+.5)*step},p):Math.hypot((x+.5)*step-p.x,(y+.5)*step-p.y),radius,this.brush.softness)
      if (alpha <= 0 || (this.canPaint && !this.canPaint({x:(x+.5)*step,y:(y+.5)*step}))) continue
      const key = `${Math.floor(x/n)},${Math.floor(y/n)}`, index = (y%n)*n+x%n
      let tile = this.work.get(key)
      if (!tile) {
        if (this.work.size >= 256) throw Error('This stroke is too large. Release and continue with a new stroke.')
        const before = this.source(key), after = Object.fromEntries(Object.entries(before).map(([id,mask])=>[id,mask.slice()]))
        const neighbors: Masks[] = []
        if(this.brush.mode==='blend') for(const dy of [-1,0,1]) for(const dx of [-1,0,1]) neighbors.push(this.source(`${Math.floor(x/n)+dx},${Math.floor(y/n)+dy}`))
        const ids = this.brush.mode === 'blend' ? [...new Set([...neighbors.flatMap(m=>Object.keys(m)),...Object.keys(this.blendField?.materials??{})])] : this.brush.mode === 'paint' ? [this.material] : []
        ids.forEach(id=>after[id] ||= new Uint8Array(n*n))
        tile = {before,after,coverage:new Float32Array(n*n),neighbors,targets:this.brush.mode==='blend'?Object.fromEntries(ids.map(id=>[id,new Float32Array(n*n).fill(NaN)])):{}}; this.work.set(key,tile)
      }
      if (alpha <= tile.coverage[index]+1e-7) continue
      tile.coverage[index] = alpha
      const fieldTarget=this.blendField?.target({x:(x+.5)*step,y:(y+.5)*step})
      let remaining = 255
      for (const [id,mask] of Object.entries(tile.after)) {
        const old = tile.before[id]?.[index] || 0
        let target = this.brush.mode === 'paint' && id === this.material ? 255 : 0
        if(fieldTarget)target=fieldTarget[id]??0
        else if (this.brush.mode === 'blend') {
          // A symmetric nine-tap blur from immutable pre-stroke masks; crosses tile boundaries.
          const targets=tile.targets[id] ||= new Float32Array(n*n).fill(NaN)
          if(Number.isNaN(targets[index])){
            let sum=0
            for(const dy of [-3,0,3]) for(const dx of [-3,0,3]){
              if(x+dx<0||y+dy<0||(x+dx+.5)*step>=this.map.width||(y+dy+.5)*step>=this.map.height)continue
              const sx=x%n+dx,sy=y%n+dy,bx=sx<0?0:sx>=n?2:1,by=sy<0?0:sy>=n?2:1
              sum+=tile.neighbors[by*3+bx][id]?.[((sy+n)%n)*n+(sx+n)%n]||0
            }
            targets[index]=sum/9
          }
          target=targets[index]
        }
        const value = Math.min(remaining,Math.round(old*(1-alpha)+target*alpha))
        mask[index] = value; remaining -= value
      }
      this.dirty.add(key)
    }
  }
  add(point: Point) {
    if (!Number.isFinite(point.x+point.y)) return
    // Bound work even if captured pointer moves far outside the map.
    const p={x:Math.max(-this.brush.size,Math.min(this.map.width+this.brush.size,point.x)),y:Math.max(-this.brush.size,Math.min(this.map.height+this.brush.size,point.y))}
    if (!this.previous) { this.dab(p); this.previous=p; return }
    const from=this.previous, length=Math.hypot(p.x-from.x,p.y-from.y), spacing=Math.max(2,this.brush.size*.08)
    for (let d=spacing-this.remainder;d<=length;d+=spacing) this.dab({x:from.x+(p.x-from.x)*d/length,y:from.y+(p.y-from.y)*d/length})
    this.remainder=(this.remainder+length)%spacing; this.previous=p
  }
  get touchedTileCount() { return this.work.size }
  breakPath() {
    if (this.previous) this.dab(this.previous)
    this.previous=null; this.lastDab=null; this.remainder=0
  }
  finish() { if (this.previous && this.lastDab && Math.hypot(this.previous.x-this.lastDab.x,this.previous.y-this.lastDab.y)>.01) this.dab(this.previous); const result=this.snapshot(); if(result.version!==3)return result; const used=new Set(Object.values(result.tiles).flatMap(t=>Object.keys(t))); return {...result,materials:Object.fromEntries(Object.entries(result.materials).filter(([id])=>used.has(id)))} }
  snapshot(): TerrainPaint {
    if (!this.dirty.size) return this.layer
    const tiles={...this.layer.tiles}
    for (const key of this.dirty) {
      const tile=Object.fromEntries(Object.entries(this.work.get(key)!.after).filter(([,mask])=>mask.some(v=>v>0)).map(([id,mask])=>[id,encodeMask(mask)]))
      if (Object.keys(tile).length) tiles[key]=tile; else delete tiles[key]
    }
    this.dirty.clear()
    if (Object.keys(tiles).length>PAINT_LIMITS.tiles) throw Error('Terrain paint tile budget exceeded. Erase unused paint before adding more.')
    this.layer={...this.layer,tiles}
    return this.layer
  }
}
