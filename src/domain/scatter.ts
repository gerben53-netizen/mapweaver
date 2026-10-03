import { seededRandom } from './seededRandom'
export { seededRandom } from './seededRandom'
import type { AreaGeometry, MapObject, StampObject } from './models'
import type { Point } from '../canvas/viewport'
import { normalizeGeometry, geometryBounds, allRings } from './areas'
import type { ObjectTransform } from './transforms'
import { normalizeRotation } from './transforms'

export const SCATTER_LIMITS = { sources:16, instances:5000, documentInstances:10000, strokes:128, samples:4096, attempts:100000, coordinate:1e9 } as const
export interface ScatterSource { assetId:string; weight:number; width:number; height:number; rotation?:number }
export type ScatterRotationMode = 'none'|'random'|'range'
export interface ScatterSettings {
  rotationMode?:ScatterRotationMode
  diameter:number; density:number; spacing:number; falloff:'uniform'|'center'|'edge'; strategy:'random'|'even'
  collision:'allow'|'distance'|'bounds'; scaleMin:number; scaleMax:number; rotationMin:number; rotationMax:number
  flipX:boolean; flipY:boolean; opacityMin:number; opacityMax:number; align:boolean; order:'random'|'size'
}
export const DEFAULT_SCATTER:ScatterSettings = {diameter:240,density:8,spacing:35,falloff:'uniform',strategy:'random',collision:'distance',scaleMin:.8,scaleMax:1.2,rotationMin:0,rotationMax:360,flipX:false,flipY:false,opacityMin:1,opacityMax:1,align:false,order:'random'}
export interface ScatterStroke { mode:'paint'|'erase'; diameter:number; points:Point[] }
export interface ScatterInstance { assetId:string; x:number; y:number; width:number; height:number; rotation:number; scaleX:1|-1; scaleY:1|-1; opacity:number }
export type ScatterMatrix = [number,number,number,number,number,number]
export interface ScatterObject {
  kind:'scatter'; id:string; name:string; assetId?:never; visible?:boolean; locked?:boolean; opacity:number
  x:number; y:number; width:number; height:number; rotation:0; scaleX:1; scaleY:1
  engineVersion:1; seed:number; sources:ScatterSource[]; settings:ScatterSettings; strokes:ScatterStroke[]
  area?:AreaGeometry; matrix:ScatterMatrix; instances:ScatterInstance[]
}
export const newScatterSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0]
// Counter-based RNG: candidate rejection never shifts another candidate's attributes.

const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max
const keys=(v:unknown,allowed:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Invalid scatter fields.')}
const identifier=(v:unknown)=>typeof v==='string'&&/^[\w-]{1,80}$/.test(v)
export function validateScatterSettings(s:ScatterSettings){
  keys(s,[...Object.keys(DEFAULT_SCATTER),'rotationMode'])
  if(s.rotationMode!==undefined&&!['none','random','range'].includes(s.rotationMode))throw Error('Invalid scatter rotation mode.')
  for(const [k,min,max] of [['diameter',4,4096],['density',.01,100],['spacing',1,4096],['scaleMin',.01,20],['scaleMax',.01,20],['rotationMin',-360,360],['rotationMax',-360,360],['opacityMin',0,1],['opacityMax',0,1]] as const)if(!number(s[k],min,max))throw Error(`Invalid scatter ${k}.`)
  if(s.scaleMin>s.scaleMax||s.rotationMin>s.rotationMax||s.opacityMin>s.opacityMax||!['uniform','center','edge'].includes(s.falloff)||!['random','even'].includes(s.strategy)||!['allow','distance','bounds'].includes(s.collision)||!['random','size'].includes(s.order)||[s.flipX,s.flipY,s.align].some(v=>typeof v!=='boolean'))throw Error('Invalid scatter ranges or strategy.')
  return s
}
export const matrixPoint=(m:ScatterMatrix,p:Point):Point=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]})
export function inverseScatterPoint(o:ScatterObject,p:Point){const m=o.matrix,d=m[0]*m[3]-m[1]*m[2],x=p.x-m[4],y=p.y-m[5];return {x:(m[3]*x-m[2]*y)/d,y:(m[0]*y-m[1]*x)/d}}
export function instanceCorners(i:ScatterInstance){const a=i.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:i.x+x*i.width/2*c-y*i.height/2*s,y:i.y+x*i.width/2*s+y*i.height/2*c}))}
function bounds(points:Point[]){let x=Infinity,y=Infinity,r=-Infinity,b=-Infinity;for(const p of points){x=Math.min(x,p.x);y=Math.min(y,p.y);r=Math.max(r,p.x);b=Math.max(b,p.y)}return {x,y,width:Math.max(1,r-x),height:Math.max(1,b-y)}}
export function scatterBounds(o:ScatterObject){
  const points=o.instances.flatMap(i=>instanceCorners(i).map(p=>matrixPoint(o.matrix,p)))
  if(!points.length)for(const stroke of o.strokes)for(const p of stroke.points)for(const sign of [-1,1])points.push(matrixPoint(o.matrix,{x:p.x+sign*stroke.diameter/2,y:p.y+sign*stroke.diameter/2}))
  if(!points.length&&o.area)points.push(...allRings(o.area).flat().map(p=>matrixPoint(o.matrix,p)))
  return points.length?bounds(points):{x:o.matrix[4],y:o.matrix[5],width:1,height:1}
}
export const withScatterBounds=(o:ScatterObject):ScatterObject=>({...o,...scatterBounds(o)})
export function validateScatter(o:ScatterObject):ScatterObject{
  keys(o,['kind','id','name','visible','locked','opacity','x','y','width','height','rotation','scaleX','scaleY','engineVersion','seed','sources','settings','strokes','area','matrix','instances'])
  if(o.kind!=='scatter'||o.engineVersion!==1||!identifier(o.id)||typeof o.name!=='string'||!o.name.trim()||o.name.length>120||[...o.name].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||!Number.isInteger(o.seed)||!number(o.seed,0,4294967295)||!number(o.opacity,0,1)||o.rotation!==0||o.scaleX!==1||o.scaleY!==1||[o.locked,o.visible].some(v=>v!==undefined&&typeof v!=='boolean'))throw Error('Invalid scatter identity or version.')
  validateScatterSettings(o.settings)
  if(!Array.isArray(o.sources)||!o.sources.length||o.sources.length>SCATTER_LIMITS.sources||new Set(o.sources.map(a=>a.assetId)).size!==o.sources.length)throw Error('Choose 1–16 unique scatter stamps.')
  for(const a of o.sources){keys(a,['assetId','weight','width','height','rotation']);if((a.rotation!==undefined&&!number(a.rotation,-360,360))||!identifier(a.assetId)||!number(a.weight,.01,1000)||!number(a.width,.01,16384)||!number(a.height,.01,16384))throw Error('Invalid scatter source or frozen size.')}
  if(!Array.isArray(o.matrix)||o.matrix.length!==6||!o.matrix.every(v=>number(v,-1e9,1e9)))throw Error('Invalid scatter frame.')
  const [a,b,c,d]=o.matrix,scale=Math.hypot(a,b);if(scale<.0001||scale>10000||Math.abs(Math.hypot(c,d)-scale)>scale*1e-6||Math.abs(a*c+b*d)>scale*scale*1e-6)throw Error('Scatter supports uniform scaling and reflection only.')
  if(!Array.isArray(o.strokes)||o.strokes.length>SCATTER_LIMITS.strokes)throw Error('Scatter stroke limit exceeded.')
  let samples=0
  for(const s of o.strokes){keys(s,['mode','diameter','points']);if(!['paint','erase'].includes(s.mode)||!number(s.diameter,.0001,1e7)||!Array.isArray(s.points)||!s.points.length)throw Error('Invalid scatter stroke.');samples+=s.points.length;for(const p of s.points){keys(p,['x','y']);if(!number(p.x,-1e9,1e9)||!number(p.y,-1e9,1e9))throw Error('Invalid scatter sample.')}}
  if(samples>SCATTER_LIMITS.samples)throw Error('Scatter sample limit exceeded. Start another scatter object.')
  if(o.area){normalizeGeometry(o.area);keys(o.area,['polygons']);for(const polygon of o.area.polygons){keys(polygon,['outer','holes']);for(const ring of [polygon.outer,...polygon.holes])for(const p of ring)keys(p,['x','y'])}}
  if(!Array.isArray(o.instances)||o.instances.length>SCATTER_LIMITS.instances)throw Error('Scatter instance limit exceeded.')
  const ids=new Set(o.sources.map(a=>a.assetId))
  for(const i of o.instances){keys(i,['assetId','x','y','width','height','rotation','scaleX','scaleY','opacity']);if(!ids.has(i.assetId)||!number(i.x,-1e9,1e9)||!number(i.y,-1e9,1e9)||!number(i.width,.0001,1e7)||!number(i.height,.0001,1e7)||!number(i.rotation,0,360)||!number(i.opacity,0,1)||![1,-1].includes(i.scaleX)||![1,-1].includes(i.scaleY))throw Error('Invalid scatter instance.')}
  const expected=scatterBounds(o);if(Object.entries(expected).some(([k,v])=>!number(v,-1e9,1e9)||!number(o[k as keyof typeof expected],-1e9,1e9)||Math.abs(o[k as keyof typeof expected]-v)>1e-5))throw Error('Scatter bounds do not match its instances.')
  return o
}
export function createScatter(sources:ScatterSource[],settings=DEFAULT_SCATTER,seed=newScatterSeed()):ScatterObject{return {kind:'scatter',id:crypto.randomUUID(),name:'Scatter',opacity:1,x:0,y:0,width:1,height:1,rotation:0,scaleX:1,scaleY:1,engineVersion:1,seed,sources:structuredClone(sources),settings:{...settings},strokes:[],matrix:[1,0,0,1,0,0],instances:[]}}
export function composeScatter(o:ScatterObject,m:ScatterMatrix){const n=o.matrix;return withScatterBounds({...o,matrix:[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]]})}
export function transformScatter(o:ScatterObject,t:ObjectTransform){const scale=t.width/o.width;if(Math.abs(t.height/o.height-scale)>1e-5)throw Error('Scatter can only be scaled uniformly.');const angle=t.rotation*Math.PI/180,c=Math.cos(angle)*scale,s=Math.sin(angle)*scale,fx=t.scaleX,fy=t.scaleY,cx=o.x+o.width/2,cy=o.y+o.height/2;return validateScatter(composeScatter(o,[c*fx,s*fx,-s*fy,c*fy,t.x+t.width/2-c*fx*cx+s*fy*cy,t.y+t.height/2-s*fx*cx-c*fy*cy]))}
export function expandScatter(o:ScatterObject):StampObject[]{const [a,b,c,d]=o.matrix,scale=Math.hypot(a,b),reflected=a*d-b*c<0;return o.instances.map(i=>{const p=matrixPoint(o.matrix,i),width=i.width*scale,height=i.height*scale;return {kind:'stamp',id:crypto.randomUUID(),assetId:i.assetId,name:o.name,x:p.x-width/2,y:p.y-height/2,width,height,rotation:normalizeRotation(Math.atan2(b,a)*180/Math.PI+(reflected?-i.rotation:i.rotation)),scaleX:i.scaleX,scaleY:i.scaleY*(reflected?-1:1),opacity:o.opacity*i.opacity,...(o.visible===undefined?{}:{visible:o.visible}),...(o.locked===undefined?{}:{locked:o.locked})}})}
export function scatterDocumentCount(objects:MapObject[]){const count=objects.reduce((n,o)=>n+(o.kind==='scatter'?o.instances.length:0),0);if(count>SCATTER_LIMITS.documentInstances)throw Error('Project exceeds 10,000 scatter instances.');return count}
export function remapScatter(o:ScatterObject,ids:Map<string,string>):ScatterObject{return {...o,sources:o.sources.map(a=>({...a,assetId:ids.get(a.assetId)||a.assetId})),instances:o.instances.map(i=>({...i,assetId:ids.get(i.assetId)||i.assetId}))}}

// Arc-length sampling, removing redundant collinear input first. Frequency of events is immaterial.
export function sampleStroke(input:Point[],step:number):Point[]{
  const points:Point[]=[];for(const p of input){const b=points.at(-1),a=points.at(-2);if(b&&Math.hypot(p.x-b.x,p.y-b.y)<1e-8)continue;if(a&&b&&Math.abs((b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x))<1e-7&&(b.x-a.x)*(p.x-b.x)+(b.y-a.y)*(p.y-b.y)>=0)points.pop();points.push(p)}
  if(!points.length)return [];const result=[points[0]];let remaining=step
  for(let k=1;k<points.length;k++){let p=points[k-1];const q=points[k];let length=Math.hypot(q.x-p.x,q.y-p.y);while(length>=remaining){const t=remaining/length;p={x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t};result.push(p);if(result.length>SCATTER_LIMITS.samples)throw Error('Brush stroke too long. Use a larger brush or shorter stroke.');length-=remaining;remaining=step}remaining-=length}
  return result
}
export function pointInRing(p:Point,ring:Point[]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
export const pointInArea=(p:Point,g:AreaGeometry)=>g.polygons.some(poly=>pointInRing(p,poly.outer)&&!poly.holes.some(h=>pointInRing(p,h)))
function segmentDistance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
export function brushContains(p:Point,stroke:ScatterStroke){return stroke.points.some((q,i)=>segmentDistance(p,q,stroke.points[Math.max(0,i-1)])<=stroke.diameter/2)}
// Conservative full-image rectangle containment; excludes holes even wholly inside a stamp.
export function instanceInArea(i:ScatterInstance,g:AreaGeometry){const corners=instanceCorners(i);if(!corners.every(p=>pointInArea(p,g)))return false;const box=bounds(corners);for(const ring of allRings(g)){if(ring.some(p=>pointInRing(p,corners)))return false;for(let k=0;k<ring.length;k++){const a=ring[k],b=ring[(k+1)%ring.length];if(Math.max(a.x,b.x)<box.x||Math.min(a.x,b.x)>box.x+box.width||Math.max(a.y,b.y)<box.y||Math.min(a.y,b.y)>box.y+box.height)continue;for(let j=0;j<4;j++){const c=corners[j],d=corners[(j+1)%4],cross=(p:Point,q:Point,r:Point)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return false}}}return true}
export function generateScatter(input:ScatterObject):ScatterObject{
  const o=validateScatter(withScatterBounds({...input,instances:[]})),s=o.settings,total=o.sources.reduce((n,a)=>n+a.weight,0),rand=(n:number,c:number)=>seededRandom(o.seed,n,c)
  let instances:ScatterInstance[]=[],attempt=0,dab=0
  const ranks=new Map<ScatterInstance,number>()
  const cell=Math.max(8,s.spacing),index=new Map<string,ScatterInstance[]>(),cells=(i:ScatterInstance)=>{const radius=s.collision==='bounds'?Math.hypot(i.width,i.height)/2:0;return {x0:Math.floor((i.x-radius)/cell),x1:Math.floor((i.x+radius)/cell),y0:Math.floor((i.y-radius)/cell),y1:Math.floor((i.y+radius)/cell)}}
  const addIndex=(i:ScatterInstance)=>{const b=cells(i);if((b.x1-b.x0+1)*(b.y1-b.y0+1)>4096)throw Error('Stamp too large for collision spacing. Increase spacing or allow overlap.');for(let y=b.y0;y<=b.y1;y++)for(let x=b.x0;x<=b.x1;x++){const key=x+','+y;const list=index.get(key)||[];list.push(i);index.set(key,list)}}
  const accept=(x:number,y:number,n:number,tangent:number,radial:number)=>{
    if(instances.length>=SCATTER_LIMITS.instances)return
    if(s.falloff!=='uniform'&&rand(n,3)>(s.falloff==='center'?1-radial:radial))return
    let weight=rand(n,4)*total;const source=o.sources.find(a=>(weight-=a.weight)<=0)||o.sources[0],scale=s.scaleMin+rand(n,5)*(s.scaleMax-s.scaleMin)
    const i:ScatterInstance={assetId:source.assetId,x,y,width:source.width*scale,height:source.height*scale,rotation:scatterRotation(s,source,()=>rand(n,6),tangent),scaleX:s.flipX&&rand(n,7)<.5?-1:1,scaleY:s.flipY&&rand(n,8)<.5?-1:1,opacity:s.opacityMin+rand(n,9)*(s.opacityMax-s.opacityMin)}
    if(o.area&&!instanceInArea(i,o.area))return
    if(s.collision!=='allow'){
      const box=bounds(instanceCorners(i)),b=cells(i);if((b.x1-b.x0+3)*(b.y1-b.y0+3)>8192)throw Error('Stamp too large for collision spacing.');const seen=new Set<ScatterInstance>();for(let y=b.y0-1;y<=b.y1+1;y++)for(let x=b.x0-1;x<=b.x1+1;x++)for(const other of index.get(x+','+y)||[]){if(seen.has(other))continue;seen.add(other);if(s.collision==='distance'){if(Math.hypot(i.x-other.x,i.y-other.y)<s.spacing)return}else{const ob=bounds(instanceCorners(other));if(box.x<ob.x+ob.width&&box.x+box.width>ob.x&&box.y<ob.y+ob.height&&box.y+box.height>ob.y)return}}
    }
    instances.push(i);ranks.set(i,rand(n,11));if(s.collision!=='allow')addIndex(i)
  }
  const tryCandidate=(x:number,y:number,tangent:number,radial:number)=>{if(attempt>=SCATTER_LIMITS.attempts)throw Error('Scatter generation exceeds 100,000 attempts. Reduce density or split the region.');const n=attempt++;accept(x,y,n,tangent,radial)}
  const operations:({area:AreaGeometry}|ScatterStroke)[]=[...(o.area?[{area:o.area}]:[]),...o.strokes]
  for(const op of operations){
    if('mode'in op&&op.mode==='erase'){instances=instances.filter(i=>!brushContains(i,op));index.clear();if(s.collision!=='allow')instances.forEach(addIndex);continue}
    if('area'in op){const b=geometryBounds(op.area),step=Math.sqrt(10000/s.density),count=Math.ceil(b.width*b.height*s.density/10000);if(count>SCATTER_LIMITS.attempts-attempt)throw Error('Area density exceeds the generation budget.');for(let k=0;k<count;k++){const n=attempt,x=s.strategy==='even'?b.x+(k%Math.ceil(b.width/step)+.2+rand(n,0)*.6)*step:b.x+rand(n,0)*b.width,y=s.strategy==='even'?b.y+(Math.floor(k/Math.ceil(b.width/step))+.2+rand(n,1)*.6)*step:b.y+rand(n,1)*b.height;tryCandidate(x,y,0,s.falloff==='uniform'?0:Math.max(0,1-Math.min(...allRings(op.area).map(ring=>Math.min(...ring.map((p,i)=>segmentDistance({x,y},p,ring[(i+1)%ring.length])))))/(Math.min(b.width,b.height)/2)))}continue}
    const centers=sampleStroke(op.points,Math.max(.00001,op.diameter/3)),r=op.diameter/2,target=Math.PI*r*r*s.density/10000/3
    for(let j=0;j<centers.length;j++){const count=Math.floor(target)+(seededRandom(o.seed,dab++,12)<target%1?1:0),side=Math.ceil(Math.sqrt(count*4/Math.PI));const p=centers[j],prev=centers[Math.max(0,j-1)],next=centers[Math.min(centers.length-1,j+1)],tangent=Math.atan2(j?p.y-prev.y:next.y-p.y,j?p.x-prev.x:next.x-p.x)*180/Math.PI;for(let k=0;k<(s.strategy==='even'?side*side:count);k++){const n=attempt,rad=Math.sqrt(rand(n,0)),angle=rand(n,1)*2*Math.PI;let dx=rad*r*Math.cos(angle),dy=rad*r*Math.sin(angle);if(s.strategy==='even'){dx=((k%side+.2+rand(n,0)*.6)/side*2-1)*r;dy=((Math.floor(k/side)+.2+rand(n,1)*.6)/side*2-1)*r}if(Math.hypot(dx,dy)>r){if(++attempt>SCATTER_LIMITS.attempts)throw Error('Scatter attempt limit exceeded.');continue}tryCandidate(p.x+dx,p.y+dy,tangent,Math.hypot(dx,dy)/r)}}
  }
  instances.sort((a,b)=>(s.order==='size'?b.width*b.height-a.width*a.height:0)||(ranks.get(a)!-ranks.get(b)!))
  return validateScatter(withScatterBounds({...o,instances}))
}

/** A missing mode is an engine-1 recipe, including its historical tangent alignment. */
export function scatterRotation(s:ScatterSettings,source:ScatterSource,random:()=>number,tangent=0){
  if(s.rotationMode===undefined)return normalizeRotation(s.rotationMin+random()*(s.rotationMax-s.rotationMin)+(s.align?tangent:0))
  const base=source.rotation??0
  if(s.rotationMode==='none')return normalizeRotation(base)
  if(s.rotationMode==='range')return normalizeRotation(base+s.rotationMin+random()*(s.rotationMax-s.rotationMin))
  return normalizeRotation(base+random()*360+(s.align?tangent:0))
}
export function scatterDefaults(mapType?:string,preset:Partial<ScatterSettings>={}):ScatterSettings {
  return {...DEFAULT_SCATTER,rotationMode:mapType==='world-map'||mapType==='regional-map'?'none':'random',...preset}
}
export function scatterRotationMode(s:ScatterSettings):ScatterRotationMode {
  return s.rotationMode??(s.rotationMin===0&&s.rotationMax===360?'random':'range')
}
