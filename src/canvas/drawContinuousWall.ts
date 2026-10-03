import { openingPlacement } from '../domain/openings'
import type { OpeningObject, PathObject } from '../domain/models'
import type { WallConnection } from '../domain/walls'
import type { MaterialChannel } from '../domain/continuousWallMaterial'
import { materialOption, materialPixelsPerUnit, materialValues } from '../domain/continuousWallMaterial'
import { wallStyle } from '../domain/walls'
import { wallField, wallFlow, organicOffset, materialNoise } from '../domain/continuousWallGeometry'
import { pathTrace } from './drawPath'
import { outsideWall } from '../domain/wallAlignment'

type Raster = {preview:boolean;canvas:HTMLCanvasElement;left:number;top:number;width:number;height:number;neighbors:PathObject[];openings:OpeningObject[];image:CanvasImageSource}
const cache=new Map<PathObject,Raster>(), sourceCache=new Map<CanvasImageSource,ImageData>()
const MAX_PIXELS=4_194_304,MAX_CACHED_PIXELS=16_777_216
let cachedPixels=0,sourcePixelCount=0
const clamp=(x:number)=>Math.max(0,Math.min(1,x)),mix=(a:number,b:number,t:number)=>a+(b-a)*t
const modulo=(x:number,n:number)=>(x%n+n)%n
function sourcePixels(image:CanvasImageSource) {
  const old=sourceCache.get(image);if(old)return old
  const canvas=document.createElement('canvas');canvas.width=Number('naturalWidth'in image?image.naturalWidth:'width'in image?image.width:0);canvas.height=Number('naturalHeight'in image?image.naturalHeight:'height'in image?image.height:0)
  const c=canvas.getContext('2d',{willReadFrequently:true})!;c.drawImage(image,0,0)
  const data=c.getImageData(0,0,canvas.width,canvas.height),pixels=data.width*data.height
  while(sourceCache.size&&sourcePixelCount+pixels>16_777_216){const [key,value]=sourceCache.entries().next().value!;sourcePixelCount-=value.width*value.height;sourceCache.delete(key)}
  sourceCache.set(image,data);sourcePixelCount+=pixels;return data
}
/** Periodic crossfade across source edges, sampled in physical units, not stretched to wall length. */
function blendSample(data:ImageData,art:import('../domain/wallSets').PackedArt,u:number,v:number) {
  const at=(x:number,y:number)=>{
    const px=art.rect.x+Math.min(art.width-1,Math.floor(modulo(x,1)*art.width)),py=art.rect.y+Math.min(art.height-1,Math.floor(modulo(y,1)*art.height)),i=(py*data.width+px)*4
    return [data.data[i],data.data[i+1],data.data[i+2],data.data[i+3]/255]
  }
  // Two half-period samples use complementary smooth weights: no hard tile boundary.
  const x=modulo(u,1),y=modulo(v,1),wx=(1-Math.cos(x*2*Math.PI))/2,wy=(1-Math.cos(y*2*Math.PI))/2
  const a=at(x,y),b=at(x+.5,y),c=at(x,y+.5),d=at(x+.5,y+.5)
  return a.map((value,i)=>mix(mix(b[i],value,wx),mix(d[i],c[i],wx),wy))
}
const periodicCache=new WeakMap<ImageData,Map<string,ImageData>>()
function sample(data:ImageData,art:import('../domain/wallSets').PackedArt,u:number,v:number) {
  let entries=periodicCache.get(data);if(!entries){entries=new Map();periodicCache.set(data,entries)}
  const key=`${art.rect.x},${art.rect.y},${art.width},${art.height}`
  let tile=entries.get(key)
  if(!tile){
    const width=Math.min(512,art.width),height=Math.min(512,art.height);tile=new ImageData(width,height)
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const color=blendSample(data,art,x/width,y/height),i=(y*width+x)*4;for(let k=0;k<3;k++)tile.data[i+k]=color[k];tile.data[i+3]=color[3]*255}
    entries.set(key,tile)
  }
  const i=(Math.floor(modulo(v,1)*tile.height)*tile.width+Math.floor(modulo(u,1)*tile.width))*4
  return [tile.data[i],tile.data[i+1],tile.data[i+2],tile.data[i+3]/255]
}

function build(path:PathObject,image:CanvasImageSource,neighbors:PathObject[],openings:OpeningObject[],preview:boolean):Raster {
  const material=path.wall!.material!,definition=material.set.continuous!,style=wallStyle(path),values=materialValues(style),field=wallField(path),atlas=sourcePixels(image)
  const margin=2,left=Math.floor(path.x)-margin,top=Math.floor(path.y)-margin,width=Math.ceil(path.width)+margin*2,height=Math.ceil(path.height)+margin*2
  const ratio=Math.min(preview?.5:2,4096/Math.max(width,height),Math.sqrt(MAX_PIXELS/(width*height))),w=Math.max(1,Math.ceil(width*ratio)),h=Math.max(1,Math.ceil(height*ratio))
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
  const c=canvas.getContext('2d',{willReadFrequently:true})!
  c.scale(ratio,ratio);c.translate(-left,-top);c.strokeStyle='#fff';c.lineWidth=path.strokeWidth*(outsideWall(path)?2:1);c.lineJoin=path.join;c.lineCap=path.cap;c.miterLimit=2
  pathTrace(c,path);c.stroke()
  if(outsideWall(path)){c.globalCompositeOperation='destination-out';pathTrace(c,path);c.fill();c.globalCompositeOperation='source-over'}
  c.resetTransform()
  const mask=c.getImageData(0,0,w,h),output=c.createImageData(w,h),pixels=materialPixelsPerUnit(style,definition.scale.unit),textureScale=materialOption(style,'textureScale')
  const length=definition.scale.textureLength*pixels*textureScale,breadth=definition.scale.textureWidth*pixels*textureScale,edgeWidth=definition.scale.edgeWidth*pixels,detailScale=materialOption(style,'detailScale')
  const cuts=openings.map(o=>openingPlacement(o,path)),fields=neighbors.map(wallField),core=[1,3,5].map(start=>parseInt(material.set.coreColor.slice(start,start+2),16))
  const maskPixel=(x:number,y:number)=>x<0||y<0||x>=w||y>=h?0:mask.data[(y*w+x)*4+3]/255
  const readMask=(x:number,y:number)=>{const px=Math.floor(x),py=Math.floor(y),u=x-px,v=y-py;return mix(mix(maskPixel(px,py),maskPixel(px+1,py),u),mix(maskPixel(px,py+1),maskPixel(px+1,py+1),u),v)}
  const channel=(kind:MaterialChannel,u:number,v:number,choice:number)=>{
    const indices=definition.sources[kind];if(!indices?.length)return null
    const position=clamp(choice)*(indices.length-1),i=Math.floor(position),a=sample(atlas,material.set.bodyVariants[indices[i]],u,v)
    if(i===indices.length-1)return a
    const b=sample(atlas,material.set.bodyVariants[indices[i+1]],u,v);return a.map((value,j)=>mix(value,b[j],position-i))
  }
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
    const x=left+(px+.5)/ratio,y=top+(py+.5)/ratio,offset=organicOffset(field,x,y)
    const alpha=readMask(px+offset.x*ratio,py+offset.y*ratio)
    if(!alpha)continue
    const flow=wallFlow(field,x,y);if(!Number.isFinite(flow.distance))continue
    const variation=(materialNoise(material.seed,x/(length*1.7),y/(length*1.7))+1)/2*values.variation
    // World anchoring at nodes and overlaps avoids restarting a visible ribbon at a join.
    let junction=0,crossing=false
    for(const other of fields){const f=wallFlow(other,x,y);if(f.distance<other.width){junction=Math.max(junction,clamp((other.width-f.distance)/(other.width*.5)));if(f.distance<other.width*.5&&!flow.atEnd&&!f.atEnd&&Math.abs(flow.tangentX*f.tangentY-flow.tangentY*f.tangentX)>.15)crossing=true}}
    let nodeDistance=Infinity
    for(const node of path.nodes)nodeDistance=Math.min(nodeDistance,Math.hypot(x-node.x,y-node.y))
    const jointWeight=Math.max(junction,clamp(1-nodeDistance/(field.width*1.2)))
    const phase=values.variation*materialNoise(material.seed^9123,x/(length*2),y/(length*2))*.45
    const localU=flow.u/length+phase,localV=flow.v/breadth+.5,worldU=x/length,worldV=y/breadth
    const local=channel('fill',localU,localV,variation)!,world=channel('fill',worldU,worldV,0)!
    const color=local.map((v,i)=>mix(v,world[i],jointWeight))
    let rgb=core.map((v,i)=>mix(v,color[i],color[3]))
    const composite=(kind:MaterialChannel,amount:number,scale=1)=>{if(amount<=0)return;const local=channel(kind,localU/scale,localV/scale,variation),world=jointWeight?channel(kind,worldU/scale,worldV/scale,0):local;const result=local?.map((v,i)=>mix(v,world?.[i]??v,jointWeight));if(result)rgb=rgb.map((v,i)=>mix(v,result[i],clamp(result[3]*amount)))}
    const maskSample=channel('mask',localU,localV,variation),detailMask=maskSample?maskSample[3]*(maskSample[0]+maskSample[1]+maskSample[2])/765:1
    composite('variation',values.variation*.55)
    composite('growth',values.growth*detailMask,detailScale)
    composite('overgrowth',values.overgrowth*detailMask,detailScale)
    const nominalRadius=field.width*(outsideWall(path)?1:.5),edge=clamp(1-(nominalRadius-flow.distance)/edgeWidth)*(1-junction)
    composite(flow.v<0?'innerEdge':'outerEdge',edge*materialOption(style,'edgeStrength'))
    if(flow.atEnd)composite('endcap',clamp(1-nodeDistance/field.width)*(1-junction))
    if(junction)composite(crossing?'crossing':'tee',junction)
    else if(nodeDistance<field.width&&!flow.atEnd)composite(flow.v<0?'insideCorner':'outsideCorner',clamp(1-nodeDistance/field.width))
    for(const cut of cuts){const distance=Math.min(Math.abs(flow.arc-cut.start),Math.abs(flow.arc-cut.end));composite('opening',clamp(1-distance/edgeWidth))}
    const outline=path.wall!.outline
    if(outline.enabled&&outline.width>0){
      const radius=outline.width*ratio,mx=px+offset.x*ratio,my=py+offset.y*ratio
      const boundary=(1-Math.min(readMask(mx-radius,my),readMask(mx+radius,my),readMask(mx,my-radius),readMask(mx,my+radius)))*(1-junction)*outline.opacity
      rgb=rgb.map((v,i)=>mix(v,parseInt(outline.color.slice(1+i*2,3+i*2),16),boundary))
    }
    // Restrained direction-independent contact edge; never directional lighting or a cast shadow.
    const ao=1-.08*edge*materialOption(style,'edgeStrength'),index=(py*w+px)*4
    for(let i=0;i<3;i++)output.data[index+i]=Math.round(rgb[i]*ao)
    output.data[index+3]=Math.round(alpha*255)
  }
  c.putImageData(output,0,0)
  return {preview,canvas,left,top,width,height,neighbors,openings,image}
}
/** One cached surface per native wall, shared by editor and PNG, independent of viewport zoom. */
export function paintContinuousWall(c:CanvasRenderingContext2D,path:PathObject,image:CanvasImageSource,connections:WallConnection[]=[],hitColor?:string,openings:OpeningObject[]=[],preview=false) {
  if(hitColor){c.strokeStyle=hitColor;c.lineWidth=path.strokeWidth;c.lineCap=path.cap;c.lineJoin=path.join;pathTrace(c,path,path.x,path.y);c.stroke();return}
  const neighbors=connections.flatMap(p=>p.neighbor?[p.neighbor]:[])
  let surface=cache.get(path)
  if(!surface||surface.preview!==preview||surface.image!==image||surface.neighbors.length!==neighbors.length||surface.neighbors.some((n,i)=>n!==neighbors[i])||surface.openings.length!==openings.length||surface.openings.some((o,i)=>o!==openings[i])){
    if(surface){cachedPixels-=surface.canvas.width*surface.canvas.height;cache.delete(path)}
    surface=build(path,image,neighbors,openings,preview)
    const pixels=surface.canvas.width*surface.canvas.height
    while(cache.size&&cachedPixels+pixels>MAX_CACHED_PIXELS){const [key,value]=cache.entries().next().value!;cachedPixels-=value.canvas.width*value.canvas.height;cache.delete(key)}
    cache.set(path,surface);cachedPixels+=pixels
  }else{cache.delete(path);cache.set(path,surface)}
  c.drawImage(surface.canvas,surface.left-path.x,surface.top-path.y,surface.width,surface.height)
}
