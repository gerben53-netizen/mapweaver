import { validateMapContract } from './generated/index'
import type { CampfireMapContractV2, MapWallV1 } from './generated/index'
import type { ProjectSnapshot } from '../store/history'
import { projectObjects } from '../domain/projectView'
import { pathGeometry, sampleSegments, pointAtDistance } from '../domain/paths'
import { isOpening, openingPlacement } from '../domain/openings'
import { defaultLighting } from './authoring'
import { normalizeOffset } from '../domain/mapSettings'
export class CampfireExportError extends Error { constructor(public readonly errors:string[]){super(errors.join('\n'));this.name='CampfireExportError'} }
const compareId=(a:{id:string},b:{id:string})=>a.id<b.id?-1:a.id>b.id?1:0
export const contractPoint=(point:{x:number;y:number})=>({x:point.x,y:point.y})
export function serializeCampfire(project:ProjectSnapshot,info:{id:string;name:string}):CampfireMapContractV2 {
 const {map}=project,g=map.grid,errors:string[]=[],objects=projectObjects(project,true),walls:MapWallV1[]=[],doors:CampfireMapContractV2['doors']=[],windows:NonNullable<CampfireMapContractV2['windows']>=[]
 if(g.type&&g.type!=='square')errors.push('Campfire v2 cannot represent a hex grid. Choose a square grid before export.')
 if(g.visible&&(normalizeOffset(g.offsetX,g.cellSize)>1e-8||normalizeOffset(g.offsetY,g.cellSize)>1e-8))errors.push('Campfire v2 has no grid origin offsets. Set both grid offsets to zero before export.')
 if(!g.physicalScale)errors.push('Set a physical game scale in Map settings before Campfire export (for example 1 square = 5 ft).')
 for(const o of project.objects)if(isOpening(o)&&!project.objects.some(w=>w.kind==='path'&&w.pathKind==='wall'&&w.id===o.wallId))errors.push('Opening has no exported wall: '+o.id)
 const byId=new Set<string>();for(const o of objects){if(byId.has(o.id))errors.push('Duplicate object ID: '+o.id);byId.add(o.id)}
 for(const wall of objects){
  if(wall.kind!=='path'||wall.pathKind!=='wall')continue
  let wallLineCount=0
  const geometry=pathGeometry(wall),openings=objects.filter(isOpening).filter(o=>o.wallId===wall.id).map(o=>({o,...openingPlacement(o,wall)})).sort((a,b)=>a.start-b.start||compareId(a.o,b.o))
  for(const opening of openings){if(opening.o.kind==='door'&&opening.o.doorType!=='passage')doors.push({id:opening.o.id,geometry:{start:contractPoint(pointAtDistance(wall,opening.start).point),end:contractPoint(pointAtDistance(wall,opening.end).point)},blocksVisionWhenClosed:true,...(opening.o.name?{label:opening.o.name}:{})})}
  for(const opening of openings)if(opening.o.kind==='window'){
   const geometry={start:contractPoint(pointAtDistance(wall,opening.start).point),end:contractPoint(pointAtDistance(wall,opening.end).point)},wallId=wall.id+':window:'+opening.o.id
   // One straight aperture chord belongs to one stable exported wall line, including curved native walls.
   walls.push({id:wallId,...geometry,blocksVision:true})
   windows.push({id:opening.o.id,wallId,geometry,...(opening.o.exteriorLight||{transmitsExteriorLight:false})})
  }
  for(const segment of geometry.segments){
   const cuts=openings.filter(o=>o.segmentIndex===segment.index),parts:{start:number;end:number;key:string}[]=[];let start=segment.start,key='start'
   for(const cut of cuts){parts.push({start,end:cut.start,key});start=cut.end;key=cut.o.id}
   parts.push({start,end:segment.start+segment.length,key})
   const samples=sampleSegments([segment])
   const distances=samples.map(s=>({point:s.point,d:segment.start+(s.t===0?0:s.t===1?segment.length:segment.curve.split(0,s.t).length())}))
   for(const part of parts){if(part.end-part.start<1e-8)continue
    const points=[pointAtDistance(wall,part.start).point,...distances.filter(s=>s.d>part.start+1e-8&&s.d<part.end-1e-8).map(s=>s.point),pointAtDistance(wall,part.end).point]
    for(let i=1;i<points.length;i++)walls.push({id:wallLineCount++===0?wall.id:`${wall.id}:${wall.nodes[segment.index].id}:${part.key}:${i}`,start:contractPoint(points[i-1]),end:contractPoint(points[i]),blocksVision:true})
   }
  }
 }
 const candidate={format:'CAMPFIRE_MAPWEAVER',version:2,mapId:info.id,revision:map.campfireRevision??1,name:info.name,dimensions:{pixelWidth:map.width,pixelHeight:map.height},grid:{type:g.visible?'SQUARE':'NONE',sizePx:g.cellSize,feetPerCell:g.physicalScale?g.physicalScale.distancePerCell*(g.physicalScale.unit==='m'?1/.3048:1):NaN},image:{path:'map.png',mimeType:'image/png'},walls:walls.sort((a,b)=>compareId(a,b)),doors:doors.sort((a,b)=>compareId(a,b)),windows:windows.sort((a,b)=>compareId(a,b)),lighting:{...(map.lighting||defaultLighting()),lights:[...(map.lighting||defaultLighting()).lights].sort((a,b)=>compareId(a,b))}}
 const checked=validateMapContract(candidate)
 if(!checked.valid)errors.push(...checked.errors)
 if(errors.length)throw new CampfireExportError(errors)
 if(!checked.valid)throw Error('Unreachable validation state')
 if(checked.value.version!==2)throw Error('Expected canonical v2 contract.')
 return checked.value
}
