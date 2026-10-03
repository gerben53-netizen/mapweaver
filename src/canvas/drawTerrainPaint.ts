import { decodeMask, PAINT_SAMPLES, paintStep, type TerrainPaint, type PaintTile } from '../domain/terrainPaint'
import { TERRAIN_STYLES } from '../domain/terrainStyles'
import { terrainTexture } from './terrainTexture'
import { premiumTextureImage } from './premiumTerrainTextures'

// 1,024 resident logical tiles (64 MiB RGBA). Immutable tile identity invalidates only dirty regions.
const cache = new Map<PaintTile,{key:string;canvas:HTMLCanvasElement;images:number[]}>()
// Cached tiles must not keep decoded images from closed projects alive.
const sourceIds=new WeakMap<object,number>();let nextSourceId=1
function sourceId(image:CanvasImageSource|undefined){if(!image)return 0;let id=sourceIds.get(image);if(!id){id=nextSourceId++;sourceIds.set(image,id)}return id}
export function paintTileImage(tile: PaintTile, key: string, paint: TerrainPaint, images:ReadonlyMap<string,CanvasImageSource>=new Map()) {
  const signature=key+JSON.stringify(Object.keys(tile).map(id=>paint.materials[id]))
  const sources=Object.keys(tile).flatMap(id=>paint.materials[id].assetId?[sourceId(images.get(paint.materials[id].assetId!))]:[])
  const old=cache.get(tile)
  if(old?.key===signature&&sources.every((image,i)=>image===old.images[i])){cache.delete(tile);cache.set(tile,old);return old.canvas}
  const [tx,ty]=key.split(',').map(Number), step=paintStep(paint), size=PAINT_SAMPLES*step
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size
  const ctx=canvas.getContext('2d')!, result=ctx.createImageData(size,size), weights=new Uint16Array(size*size), colors=new Float32Array(size*size*3)
  const texture=document.createElement('canvas');texture.width=texture.height=size;const source=texture.getContext('2d',{willReadFrequently:true})!
  for(const [id,encoded] of Object.entries(tile)){
    const material=paint.materials[id], style=material.style?TERRAIN_STYLES[material.style]:undefined, mask=decodeMask(encoded)
    source.clearRect(0,0,size,size)
    if(style){source.fillStyle=style.color;source.fillRect(0,0,size,size)}
    source.save();source.translate(-tx*size,-ty*size)
    const image = material.assetId ? images.get(material.assetId) : material.textureId ? premiumTextureImage(material.textureId) : style?terrainTexture(style.texture):undefined
    if (!image) throw Error('Terrain texture is not ready. Wait for loading before rendering.')
    const pattern=source.createPattern(image,'repeat')!
    pattern.setTransform(new DOMMatrix().scale(material.scale));source.fillStyle=pattern;source.globalAlpha=(material.assetId||material.textureId)?1:.35
    source.fillRect(tx*size,ty*size,size,size);source.restore()
    const data=source.getImageData(0,0,size,size).data
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=y*size+x,alpha=Math.round(data[i*4+3]/255*mask[Math.floor(y/step)*PAINT_SAMPLES+Math.floor(x/step)])
      weights[i]+=alpha
      for(let c=0;c<3;c++)colors[i*3+c]+=data[i*4+c]*alpha
    }
  }
  for(let i=0;i<weights.length;i++){for(let c=0;c<3;c++)result.data[i*4+c]=weights[i]?colors[i*3+c]/weights[i]:0;result.data[i*4+3]=weights[i]}
  ctx.putImageData(result,0,0);texture.width=texture.height=0
  cache.set(tile,{key:signature,canvas,images:sources})
  while(cache.size>1024)cache.delete(cache.keys().next().value!)
  return canvas
}
/** Map coordinates only; Konva/export supply the viewport/output transform. */
export function paintTerrain(ctx:CanvasRenderingContext2D, paint?:TerrainPaint,images:ReadonlyMap<string,CanvasImageSource>=new Map()){
  if(!paint?.visible||!paint.opacity)return
  const tileSize=PAINT_SAMPLES*paintStep(paint)
  ctx.save();ctx.globalAlpha*=paint.opacity
  for(const [key,tile] of Object.entries(paint.tiles)){const [x,y]=key.split(',').map(Number);ctx.drawImage(paintTileImage(tile,key,paint,images),x*tileSize,y*tileSize)}
  ctx.restore()
}
