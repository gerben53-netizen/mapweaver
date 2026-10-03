import type { MapObject, AreaObject } from './models'
import type { LabelObject } from './annotations'
import { createLabel, restyleLabel, annotationBudget } from './annotations'
import { automaticLabelStyle } from './automaticLabelStyle'
import { automaticLabelFingerprint, automaticLabelOverridden, LABEL_CLASSES, LABEL_CATEGORIES, type LabelClass, type LabelCategory } from './automaticLabelMetadata'
import type { ProjectSnapshot } from '../store/history'
import { effectiveLayers, editableProjectIds, projectObjects } from './projectView'
import { isLandMap } from './geography'
import { allRings, closestPoint } from './areas'
import { pointInArea } from './scatter'
import { pathGeometry, pointAtDistance } from './paths'
import type { Point } from '../canvas/viewport'
import { normalizeRotation } from './transforms'

export interface AutoLabelOptions {categories:LabelCategory[];density:'low'|'medium'|'high'}
export const AUTO_LABEL_DEFAULTS:AutoLabelOptions={categories:[...LABEL_CATEGORIES],density:'medium'}
export const AUTO_LABEL_LIMIT=300
export interface LabelSource {object:MapObject;labelClass:LabelClass;category:LabelCategory;minor:boolean}
export interface LabelCandidate {x:number;y:number;rotation:number}
export interface AutoLabelResult {labels:LabelObject[];remove:string[];suppressed:number;preserved:number;eligible:number;omitted:number}
const generic=new Set(['Area','Landmass','Forest','Mountains','Mountain','Desert','Swamp','Snow','Lake','Label','Place','Landmark'])
/** Only existing semantic names: no filename, stamp artwork or name-generation inference. */
export function labelSource(o:MapObject):LabelSource|null{
 if(!o.name?.trim()||generic.has(o.name))return null
 let labelClass:LabelClass,category:LabelCategory,minor=false
 if(o.kind==='place'){
  if(o.marker?.labelEnabled===false)return null
  if(['capital','city','town','village','harbor'].includes(o.placeType)){category='settlements';labelClass=o.placeType==='capital'?'capital':o.placeType==='city'&&(o.importance>=3||o.marker?.prominence==='major'||o.marker?.prominence==='primary')?'majorCity':'settlement';minor=labelClass==='settlement'&&(o.placeType==='village'||o.importance===0)}
  else {category='landmarks';labelClass='landmark';minor=o.importance<1}
 }else if(o.kind==='path'&&o.pathKind==='river'){category='rivers';labelClass='river'}
 else if(o.kind==='area'){
  const kind=o.land?.labelKind
  if(kind==='waterMajor'||kind==='waterMinor'||!kind&&(o.land?.appearance?.style==='ocean'||o.land?.appearance?.style==='shallow')){category='water';labelClass=kind==='waterMajor'?'waterMajor':'waterMinor'}
  else if(kind==='mountainRange'||!kind&&o.land?.terrain==='mountains'){category='mountains';labelClass='mountainRange'}
  else {category='regions';labelClass=o.land?.role==='landmass'?'majorRegion':'region'}
 }else return null
 return{object:o,labelClass,category,minor}
}
const center=(o:{x:number;y:number;width:number;height:number})=>({x:o.x+o.width/2,y:o.y+o.height/2})
export function interiorCandidates(o:AreaObject):Point[]{
 const rings=allRings(o.geometry),candidates:Point[]=[center(o)]
 for(const poly of o.geometry.polygons){const xs=poly.outer.map(p=>p.x),ys=poly.outer.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;for(let row=0;row<12;row++)for(let col=0;col<12;col++)candidates.push({x:x+w*(col+.5)/12,y:y+h*(row+.5)/12})}
 const ranked=candidates.filter(p=>pointInArea(p,o.geometry)).map(p=>({p,d:Math.min(...rings.flatMap(r=>r.map((a,i)=>{const q=closestPoint(p,a,r[(i+1)%r.length]);return Math.hypot(q.x-p.x,q.y-p.y)})))})).sort((a,b)=>b.d-a.d||a.p.y-b.p.y||a.p.x-b.p.x).map(v=>v.p)
 const diverse:Point[]=[],separation=Math.max(4,Math.min(o.width,o.height)/6)
 for(const p of ranked){if(diverse.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>=separation))diverse.push(p);if(diverse.length>=32)break}
 return diverse
}
export const readableAngle=(x:number,y:number)=>{let degrees=Math.atan2(y,x)*180/Math.PI;if(degrees>90)degrees-=180;if(degrees< -90)degrees+=180;return normalizeRotation(degrees)}
export function labelCandidates(source:LabelSource,label:LabelObject):LabelCandidate[]{
 const o=source.object
 if(o.kind==='place'){
  const c=center(o),dx=(o.width+label.width)/2+6,dy=(o.height+label.height)/2+6
  return [[dx,0],[-dx,0],[0,-dy],[0,dy],[dx,-dy],[-dx,-dy],[dx,dy],[-dx,dy]].map(([x,y])=>({x:c.x+x,y:c.y+y,rotation:0}))
 }
 if(o.kind==='area')return interiorCandidates(o).map(p=>({...p,rotation:source.labelClass==='mountainRange'&&o.height>o.width*1.6?330:0}))
 if(o.kind==='path'){
  const length=pathGeometry(o).length,candidates:LabelCandidate[]=[]
  for(const f of [.5,.35,.65,.22,.78,.43,.57]){
   const d=length*f;if(d<label.width*.55||length-d<label.width*.55)continue
   const a=pointAtDistance(o,d-label.width/2).point,b=pointAtDistance(o,d+label.width/2).point,m=pointAtDistance(o,d).point,span=Math.hypot(b.x-a.x,b.y-a.y)
   if(span<label.width*.85)continue
   const q=closestPoint(m,a,b);if(Math.hypot(m.x-q.x,m.y-q.y)>Math.max(4,label.height*.3))continue
   const rotation=readableAngle(b.x-a.x,b.y-a.y),angle=rotation*Math.PI/180
   for(const side of [-1,1])candidates.push({x:m.x-Math.sin(angle)*(label.height/2+5)*side,y:m.y+Math.cos(angle)*(label.height/2+5)*side,rotation})
  }
  return candidates
 }
 return[]
}
export interface Box {x:number;y:number;width:number;height:number}
export function labelBox(o:Box&{rotation?:number},padding=0):Box{
 const a=(o.rotation||0)*Math.PI/180,c=center(o),w=Math.abs(Math.cos(a))*o.width+Math.abs(Math.sin(a))*o.height+padding*2,h=Math.abs(Math.sin(a))*o.width+Math.abs(Math.cos(a))*o.height+padding*2
 return{x:c.x-w/2,y:c.y-h/2,width:w,height:h}
}
const overlap=(a:Box,b:Box)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))
/** Small deterministic spatial hash; large items get a separate bounded list. */
class Exclusions {
 cells=new Map<string,{box:Box;hard:boolean}[]>();large:{box:Box;hard:boolean}[]=[]
 keys(b:Box){const keys:string[]=[];for(let y=Math.floor(b.y/128);y<=Math.floor((b.y+b.height)/128);y++)for(let x=Math.floor(b.x/128);x<=Math.floor((b.x+b.width)/128);x++){keys.push(x+','+y);if(keys.length>256)return []}return keys}
 add(box:Box,hard:boolean){const item={box,hard},keys=this.keys(box);if(!keys.length){this.large.push(item);return}for(const key of keys){const list=this.cells.get(key)||[];list.push(item);this.cells.set(key,list)}}
 score(box:Box){let score=0;const keys=this.keys(box),items=new Set([...this.large,...(keys.length?keys.flatMap(k=>this.cells.get(k)||[]):[...this.cells.values()].flat())]);for(const item of items){const area=overlap(box,item.box);if(area&&item.hard)return Infinity;score+=area}return score/(box.width*box.height)}
}
const pointsInBox=(b:Box)=>Array.from({length:15},(_,i)=>({x:b.x+b.width*(i%5)/4,y:b.y+b.height*Math.floor(i/5)/2}))
function withinSource(b:Box,source:LabelSource,land:AreaObject[],edited:boolean){
 if(source.object.kind!=='area')return true
 const area=source.object,points=pointsInBox(b)
 if(!points.every(p=>pointInArea(p,area.geometry)))return false
 // Reject an entire small hole/coast notch enclosed by the label rectangle as well.
 if(allRings(area.geometry).some(r=>r.some(p=>p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height)))return false
 if(source.labelClass==='waterMajor'&&points.some(p=>land.some(o=>pointInArea(p,o.geometry))))return false
 if(edited&&source.category!=='water'&&land.length&&!points.every(p=>land.some(o=>pointInArea(p,o.geometry))))return false
 return true
}
export function generateAutomaticLabels(snapshot:ProjectSnapshot,options:AutoLabelOptions):AutoLabelResult{
 if(!isLandMap(snapshot.map))throw Error('Automatic labels are available on World and Regional maps.')
 if(!['low','medium','high'].includes(options.density)||!options.categories.length||options.categories.some(c=>!LABEL_CATEGORIES.includes(c)))throw Error('Choose label categories and a density.')
 const {map,objects}=snapshot,visible=projectObjects(snapshot,true),editable=editableProjectIds({...snapshot,objects:objects.map(o=>o.kind==='label'&&o.automatic?.suppressed?{...o,visible:true}:o)})
 const allIds=new Set(objects.map(o=>o.id)),existing=objects.filter((o):o is LabelObject=>o.kind==='label'),sources=visible.map(labelSource).filter((s):s is LabelSource=>!!s&&editable.has(s.object.id)&&options.categories.includes(s.category))
 if(sources.length>AUTO_LABEL_LIMIT)throw Error('Choose fewer categories or hide layers: at most 300 named sources per layout.')
 const selectedSources=new Set(sources.map(s=>s.object.id)),protectedLabels=existing.filter(o=>!o.automatic||automaticLabelOverridden(o)||!editable.has(o.id)||!options.categories.includes(o.automatic.category)),protectedSources=new Set(protectedLabels.flatMap(o=>[...(o.ownerId?[o.ownerId]:[]),...(o.automatic?[o.automatic.sourceId]:[])]))
 // A hidden source is preserved, a deleted source can be cleaned; manual overrides never disappear.
 const managed=existing.filter(o=>o.automatic&&!protectedLabels.includes(o)&&(selectedSources.has(o.automatic.sourceId)||!allIds.has(o.automatic.sourceId)))
 const replacing=new Set(managed.map(o=>o.id)),obstacles=new Exclusions()
 for(const o of visible){if(replacing.has(o.id))continue;if(['label','place','title','infoPanel','legend','compass','scaleBar'].includes(o.kind))obstacles.add(labelBox(o,3),true);else if(o.kind==='stamp'||o.kind==='scatter')obstacles.add(labelBox(o),false)}
 const land=visible.filter((o):o is AreaObject=>o.kind==='area'&&o.land?.role==='landmass'),labels:LabelObject[]=[],frame=map.effects?.frame,margin=frame?.enabled?frame.inset+Math.max(20,frame.thickness*4):8
 let preserved=protectedLabels.filter(o=>o.automatic).length,omitted=0
 sources.sort((a,b)=>LABEL_CLASSES[b.labelClass].priority-LABEL_CLASSES[a.labelClass].priority||a.object.id.localeCompare(b.object.id,'en'))
 for(const source of sources){
  const o=source.object;if(protectedSources.has(o.id)){preserved++;continue}
  const old=managed.find(v=>v.automatic?.sourceId===o.id)
  const low=options.density==='low'&& !['majorRegion','region','capital','majorCity','waterMajor'].includes(source.labelClass),medium=options.density==='medium'&&source.minor
  if(low||medium){omitted++;continue}
  const created=createLabel(center(o),o.name!,o.kind==='place'?o:undefined,'right',map.mapType),styled=restyleLabel(created,automaticLabelStyle(map,source.labelClass,o.name!)),id=old?.id||'auto-'+crypto.randomUUID()
  const base={...styled,id,...(o.kind==='place'?{markerName:false}:{})},candidates=labelCandidates(source,base)
  let best:LabelObject|null=null,bestScore=Infinity
  for(const candidate of candidates){const label={...base,x:candidate.x-base.width/2,y:candidate.y-base.height/2,rotation:candidate.rotation},box=labelBox(label,2)
   if(box.x<margin||box.y<margin||box.x+box.width>map.width-margin||box.y+box.height>map.height-margin||!withinSource(box,source,land,!!map.landEditing))continue
   const score=obstacles.score(box);if(score<bestScore){bestScore=score;best=label}if(score===0)break
  }
  const fallback=candidates[0]||{...center(o),rotation:0},label:LabelObject=best||{...base,x:Math.max(0,Math.min(map.width-base.width,fallback.x-base.width/2)),y:Math.max(0,Math.min(map.height-base.height,fallback.y-base.height/2)),rotation:fallback.rotation,visible:false}
  if(label.ownerId)label.offset={x:label.x+label.width/2-o.x-o.width/2,y:label.y+label.height/2-o.y-o.height/2}
  label.automatic={version:1,sourceId:o.id,labelClass:source.labelClass,category:source.category,baseline:automaticLabelFingerprint(label),overridden:false,suppressed:!best}
  labels.push(label);if(best)obstacles.add(labelBox(label,3),true)
 }
 annotationBudget([...objects.filter(o=>!replacing.has(o.id)),...labels])
 return{labels,remove:[...replacing],suppressed:labels.filter(o=>o.automatic!.suppressed).length,preserved,eligible:sources.length,omitted}
}
export function automaticLabelLayer(snapshot:ProjectSnapshot){return effectiveLayers(snapshot).find(l=>l.visible&&!l.locked&&l.name==='Automatic labels')}
