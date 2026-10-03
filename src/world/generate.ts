import { extractRidges, drainageNetwork } from './geographyNetwork'
import clipping from 'polygon-clipping'
import type { MultiPolygon } from 'polygon-clipping'
import { pointInArea } from '../domain/scatter'
import { seededRandom } from '../domain/seededRandom'
import { createArea, allRings, normalizeGeometry } from '../domain/areas'
import { defaultLandArea, landBudget } from '../domain/landAreas'
import { createRoute, routePreset } from '../domain/routes'
import { defaultMapStyle } from '../domain/mapSettings'
import { defaultGeography } from '../domain/geography'
import type { AreaObject, MapLayer, MapObject } from '../domain/models'
import { contours } from './contours'
import { validateWorldParameters } from './model'
import type { WorldParameters, WorldResult } from './model'
export const WORLD_LIMITS={cols:145,rows:97,objects:240,points:9000} as const
export function seedHash(text:string){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0}
function noise(seed:number,x:number,y:number,channel:number){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),n=(a:number,b:number)=>seededRandom(seed,a+b*4099,channel);return (n(ix,iy)*(1-u)+n(ix+1,iy)*u)*(1-v)+(n(ix,iy+1)*(1-u)+n(ix+1,iy+1)*u)*v}
function fbm(seed:number,x:number,y:number,channel:number){return noise(seed,x,y,channel)*.57+noise(seed,x*2,y*2,channel+1)*.28+noise(seed,x*4,y*4,channel+2)*.15}
export function terrainField(parameters:WorldParameters, version:1|2=1){
 const p=validateWorldParameters(parameters),seed=seedHash(p.seed),cols=WORLD_LIMITS.cols,rows=WORLD_LIMITS.rows
 const centers=Array.from({length:p.continents},(_,i)=>{const columns=Math.ceil(Math.sqrt(p.continents*1.5)),rowCount=Math.ceil(p.continents/columns);return {x:.09+(i%columns+.3+seededRandom(seed,i,0)*.4)/columns*.82,y:.09+(Math.floor(i/columns)+.3+seededRandom(seed,i,1)*.4)/rowCount*.82,rx:.47/Math.sqrt(p.continents),ry:.48/Math.sqrt(p.continents),angle:seededRandom(seed,i,2)*Math.PI}})
 const islands=Array.from({length:Math.round(p.islands*20)},(_,i)=>({x:.08+seededRandom(seed,i,8)*.84,y:.1+seededRandom(seed,i,9)*.8,r:.015+seededRandom(seed,i,10)*.035}))
 const height:number[]=[],moisture:number[]=[],temperature:number[]=[],biomes:string[]=[]
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const nx=x/(cols-1),ny=y/(rows-1),wx=nx+(fbm(seed,nx*3,ny*3,30)-.5)*.24,wy=ny+(fbm(seed,nx*3,ny*3,35)-.5)*.24
  let mask=0
  for(const c of centers){const dx=wx-c.x,dy=wy-c.y,a=dx*Math.cos(c.angle)-dy*Math.sin(c.angle),b=dx*Math.sin(c.angle)+dy*Math.cos(c.angle);mask=Math.max(mask,Math.exp(-2*(a*a/c.rx**2+b*b/c.ry**2)))}
  for(const i of islands)mask=Math.max(mask,Math.exp(-2*((nx-i.x)**2+(ny-i.y)**2)/i.r**2)*.8)
  const ridge=1-Math.abs(noise(seed,nx*7,ny*13,50)*2-1),edge=Math.min(1,Math.min(nx,ny,1-nx,1-ny)*14)
  const coastDetail=version===2?(noise(seed,nx*19,ny*19,91)-.5)*.09*p.roughness+(noise(seed,nx*4,ny*4,93)-.5)*.1:0
  const h=(.08+mask*.73+coastDetail+(fbm(seed,nx*9,ny*9,60)-.5)*p.roughness*.65+ridge**5*.24*mask)*edge
  const elevation=Math.max(0,(h-p.water)/(1-p.water+.001)),m=Math.max(0,Math.min(1,fbm(seed,nx*5,ny*5,70)+(p.climate==='wet'?.23:p.climate==='dry'?-.25:0)))
  const t=Math.max(0,Math.min(1,1-Math.abs(ny-.5)*1.6-elevation*.24+(p.climate==='cold'?-.25:p.climate==='tropical'?.18:0)))
  height.push(h);moisture.push(m);temperature.push(t)
  biomes.push(h<=p.water?'ocean':t<.24?'tundra':elevation>.85?'alpine':p.mountains>0&&elevation>.65-p.mountains*.38&&ridge>.62?'mountains':m<.32&&t>.5?'desert':p.forests>0&&m>.78-p.forests*.38&&t>.28&&elevation<.7?(m>.65?'dense forest':'forest'):m>.72&&elevation<.12?'wetland':elevation>.35?'hills':elevation>.17?'upland':'grassland')
 }
 return {cols,rows,height,moisture,temperature,biomes}
}
/** Priority flood gives every land cell an acyclic drainage parent; raised basins become lakes. */
export function drainage(height:number[],cols:number,rows:number,water:number){
 const filled=height.slice(),parent=Array(height.length).fill(-1) as number[],seen=new Uint8Array(height.length),heap:number[]=[]
 const less=(a:number,b:number)=>filled[a]<filled[b]||filled[a]===filled[b]&&a<b
 const push=(n:number)=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(!less(heap[i],heap[p]))break;[heap[i],heap[p]]=[heap[p],heap[i]];i=p}}
 const pop=()=>{const n=heap[0],last=heap.pop()!;if(heap.length){heap[0]=last;let i=0;while(true){let j=i*2+1;if(j>=heap.length)break;if(j+1<heap.length&&less(heap[j+1],heap[j]))j++;if(!less(heap[j],heap[i]))break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j}}return n}
 for(let i=0;i<height.length;i++)if(height[i]<=water||i%cols===0||i%cols===cols-1||i<cols||i>=height.length-cols){seen[i]=1;push(i)}
 while(heap.length){const i=pop(),x=i%cols,y=Math.floor(i/cols);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const nx=x+dx,ny=y+dy,j=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=rows||seen[j])continue;seen[j]=1;parent[j]=i;filled[j]=Math.max(height[j],filled[i]+1e-7);push(j)}}
 for(let i=0;i<height.length;i++)if(parent[i]>=0){let best=parent[i],slope=-Infinity;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const x=i%cols+dx,y=Math.floor(i/cols)+dy,j=y*cols+x;if(x<0||y<0||x>=cols||y>=rows||filled[j]>=filled[i])continue;const drop=(filled[i]-filled[j])/Math.hypot(dx,dy);if(drop>slope){slope=drop;best=j}}parent[i]=best}
 const lake=height.map((h,i)=>h>water&&filled[i]-h>.012)
 return {filled,parent,lake}
}
export function generateWorld(parameters:WorldParameters, version:1|2=1):WorldResult{
 const p=validateWorldParameters(parameters),field=terrainField(p,version),{cols,rows,height,biomes}=field,flow=drainage(height,cols,rows,p.water)
 const layers:MapLayer[]=['Rivers','Lakes','Forests','Mountains','Biomes','Land'].map((name,i)=>({id:`world-v1-layer-${i}`,name,visible:true,locked:false,objectIds:[]})),objects:MapObject[]=[]
 let points=0,discarded=0
 let land:MultiPolygon=[]
 const multi=(g:import('../domain/models').AreaGeometry):MultiPolygon=>g.polygons.map(p=>[p.outer,...p.holes].map(r=>[...r,r[0]].map(p=>[p.x,p.y])))
 const addRegions=(values:number[],name:string,color:string,layer:number,terrain:NonNullable<AreaObject['land']>['terrain']='custom')=>{
  const result=contours(values,cols,rows,p.width,p.height);discarded+=result.discarded
  const geometries=result.geometries.flatMap(g=>{if(layer===5)return [g];try{return clipping.intersection(multi(g),land).flatMap(poly=>{try{return [normalizeGeometry({polygons:[{outer:poly[0].map(([x,y])=>({x,y})),holes:poly.slice(1).map(r=>r.map(([x,y])=>({x,y})))}]})]}catch{discarded++;return []}})}catch{discarded++;return []}})
  for(const g of geometries){const count=allRings(g).reduce((n,r)=>n+r.length,0);if(objects.length>=WORLD_LIMITS.objects-p.rivers*(version===2?2:1)||points+count>WORLD_LIMITS.points){discarded++;continue}
   const o=createArea(g,{kind:'solid',color});o.id=`world-v1-area-${objects.length}`;o.name=name;o.land={...defaultLandArea(layer===5?'landmass':'terrain-region'),terrain};if(layer===5){o.strokeWidth=p.width/1600;o.strokeColor='#446858';o.strokeOpacity=.8}
   objects.push(o);layers[layer].objectIds.push(o.id);points+=count
  }
 }
 addRegions(height.map((h,i)=>i%cols===0||i%cols===cols-1||i<cols||i>=height.length-cols?-1:h-p.water-1e-9),'Landmass','#b4bd89',5)
 land=objects.filter((o):o is AreaObject=>o.kind==='area').flatMap(o=>multi(o.geometry))
 const biomeStyles:[string,string,number,NonNullable<AreaObject['land']>['terrain']][]=[['upland','#a4ae7e',4,'custom'],['hills','#8f9972',4,'custom'],['desert','#d9c08a',4,'desert'],['tundra','#c5ccc0',4,'snow'],['wetland','#769f88',4,'swamp'],['mountains','#8a8879',3,'mountains'],['alpine','#dce0d7',3,'snow'],['forest','#688c65',2,'forest'],['dense forest','#47785c',2,'forest']]
 for(const [biome,color,layer,type] of biomeStyles)addRegions(biomes.map((b,i)=>b===biome&&!flow.lake[i]?1:-1),biome[0].toUpperCase()+biome.slice(1),color,layer,type)
 addRegions(flow.lake.map(v=>v?1:-1),'Lake','#729fb0',1)
 const visibleLake=flow.lake.map((v,i)=>v&&objects.some(o=>o.kind==='area'&&layers[1].objectIds.includes(o.id)&&pointInArea({x:i%cols*p.width/(cols-1),y:Math.floor(i/cols)*p.height/(rows-1)},o.geometry)))
 const used=new Set<number>(),candidates=height.map((h,i)=>({h,i})).filter(v=>v.h>p.water+.16&&!flow.lake[v.i]).sort((a,b)=>b.h-a.h||a.i-b.i),riverCells:number[][]=[]
 for(const {i} of candidates){if(riverCells.length>=p.rivers)break;if(used.has(i)||riverCells.some(r=>Math.hypot(i%cols-r[0]%cols,Math.floor(i/cols)-Math.floor(r[0]/cols))<(version===2?5:10)))continue
  const chain=[i];let at=i;while(flow.parent[at]>=0&&chain.length<256){at=flow.parent[at];chain.push(at);if(flow.lake[at]&&!visibleLake[at])break;if(height[at]<=p.water||visibleLake[at]||used.has(at))break}
  if(chain.length<(version===2?5:9)||chain.length>=256)continue
  const end=chain.at(-1)!;if(height[end]>p.water&&!visibleLake[end]&&!used.has(end))continue
  const style=routePreset('river');if(style.route.kind!=='river')throw Error('River style unavailable.')
  style.strokeWidth=p.width/600;style.route.startWidth=p.width/1600;style.route.endWidth=p.width/600;style.route.startFactor=1;style.route.bank.width=p.width/5000;style.stroke={kind:'solid',color:'#729fb0'}
  const o=createRoute(chain.map((cell,n)=>({id:`node-${n}`,x:cell%cols*p.width/(cols-1),y:Math.floor(cell/cols)*p.height/(rows-1),mode:'corner'})),false,style);o.id=`world-v1-river-${riverCells.length}`;o.name=`River ${riverCells.length+1}`
  objects.push(o);layers[0].objectIds.push(o.id);chain.forEach(v=>used.add(v));riverCells.push(chain)
 }
 const network=version===2?drainageNetwork(riverCells,field,flow.filled,visibleLake,p.water,p.width,p.height):undefined
 if(network){const old=new Set(layers[0].objectIds);for(let i=objects.length-1;i>=0;i--)if(old.has(objects[i].id))objects.splice(i,1);objects.push(...network.paths);layers[0].objectIds=network.paths.map(o=>o.id)}
 landBudget(objects)
 const groupId='world-v1',map:WorldResult['map']={width:p.width,height:p.height,...defaultMapStyle(),backgroundColor:'#729fb0',background:null,mapType:'world-map',geography:{...defaultGeography('world-map'),widthKm:p.widthKm},generation:{generatorId:'world-v1',generatorVersion:version,...(network?{geography:{version:1 as const,cols,rows,ridges:extractRidges(field,p.water,p.width,p.height),drainage:network.reaches}}:{}),parameters:p,groupId,objectIds:objects.map(o=>o.id),layerIds:layers.map(l=>l.id)}};map.grid.visible=false
 return {map,objects,layers,layerTree:{roots:[groupId],groups:[{id:groupId,name:'Generated World',visible:true,locked:false,children:layers.map(l=>l.id)}]},stats:{points,landFraction:height.filter(h=>h>p.water).length/height.length,riverCount:riverCells.length,discarded}}
}
