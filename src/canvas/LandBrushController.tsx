import { resolvedLandBrush, landGridPoint } from '../domain/landHexGrid'
import { useEffect, type RefObject } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { useLandBrushStore } from '../store/landBrushStore'
import { currentSnapshot } from '../projects/session'
import { commitLandStroke, landBrushInput } from '../store/landBrushActions'
import { calculateLandStroke } from './landBrushClient'
import { ownObjectGesture } from './interaction'
import { screenToMap, type Point } from './viewport'
import type { ProjectSnapshot } from '../store/history'
import { LAND_BRUSH_LIMITS, type LandBrush } from '../domain/landBrush'
import { isEditing } from '../store/shortcuts'
import { isOrganicLandShape, nextOrganicLandSeed } from '../domain/organicLandFootprint'

export function LandBrushController({surface}:{surface:RefObject<HTMLDivElement|null>}){
 useEffect(()=>{
  const el=surface.current;if(!el)return
  let points:Point[]=[],snapshot:ProjectSnapshot|null=null,brush:LandBrush|null=null,pointer:number|null=null,release:(()=>void)|null=null,controller:AbortController|null=null,timer:ReturnType<typeof setTimeout>|null=null,epoch=0,seed=0,newId='',lastAngle=0
  const report=(error:unknown)=>{if(!(error instanceof DOMException&&error.name==='AbortError'))useEditorStore.setState({message:error instanceof Error?error.message:'Land editing failed.'})}
  const reset=()=>{epoch++;controller?.abort();controller=null;if(timer)clearTimeout(timer);timer=null;const id=pointer;pointer=null;if(id!==null&&el.hasPointerCapture(id))el.releasePointerCapture(id);points=[];snapshot=null;brush=null;release?.();release=null;useLandBrushStore.setState({preview:null,busy:false})}
  const cancel=()=>{reset();useLandBrushStore.setState({cursor:null})}
  const runPreview=async()=>{
   timer=null;if(!snapshot||!brush||controller)return
   const current=epoch;controller=new AbortController()
   try{const result=await calculateLandStroke(landBrushInput(snapshot,brush,[...points],seed,newId),controller.signal);if(current===epoch)useLandBrushStore.setState({preview:result})}catch(error){if(current===epoch)report(error)}finally{if(current===epoch)controller=null}
  }
  const finish=()=>{
   if(!snapshot||!brush||useLandBrushStore.getState().busy)return
   const before=snapshot,settings=brush,path=[...points],current=++epoch;controller?.abort();if(timer)clearTimeout(timer);timer=null;controller=new AbortController()
   const id=pointer;pointer=null;if(id!==null&&el.hasPointerCapture(id))el.releasePointerCapture(id)
   useLandBrushStore.setState({busy:true})
   const signal=controller.signal
   void Promise.resolve().then(()=>calculateLandStroke(landBrushInput(before,settings,path,seed,newId),signal)).then(result=>{
    if(current!==epoch)return;reset();try{commitLandStroke(before,result,settings.action);if(isOrganicLandShape(settings.shape))useLandBrushStore.setState({organicSeed:nextOrganicLandSeed(seed)})}catch(error){report(error)}
   }).catch(error=>{if(current===epoch){reset();report(error)}})
  }
  const position=(e:PointerEvent)=>{const r=el.getBoundingClientRect(),p=screenToMap({x:e.clientX-r.x,y:e.clientY-r.y},useEditorStore.getState().viewport),map=useProjectStore.getState().map;return{...landGridPoint({x:Math.max(0,Math.min(map.width,p.x)),y:Math.max(0,Math.min(map.height,p.y))},brush??resolvedLandBrush(useLandBrushStore.getState().settings,map.grid,e.altKey)),inside:p.x>=0&&p.y>=0&&p.x<=map.width&&p.y<=map.height}}
  const down=(e:PointerEvent)=>{
   if(e.defaultPrevented||e.button!==0||useEditorStore.getState().activeTool!=='landBrush'||snapshot)return
   if(!position(e).inside)return
   e.preventDefault()
   try{snapshot=currentSnapshot();const settings=resolvedLandBrush(useLandBrushStore.getState().settings,snapshot.map.grid,e.altKey);brush={...settings,action:e.altKey&&['add','remove'].includes(settings.action)?settings.action==='add'?'remove':'add':settings.action};points=[position(e)];seed=isOrganicLandShape(settings.shape)?useLandBrushStore.getState().organicSeed:1;newId=crypto.randomUUID();pointer=e.pointerId;release=ownObjectGesture(finish,cancel);el.setPointerCapture(pointer);useEditorStore.setState({message:''});void runPreview()}catch(error){cancel();report(error)}
  }
  const move=(e:PointerEvent)=>{
   if(e.defaultPrevented||useEditorStore.getState().activeTool!=='landBrush')return
   const p=position(e),old=useLandBrushStore.getState().cursor
   if(old&&Math.hypot(p.x-old.x,p.y-old.y)>1)lastAngle=Math.atan2(p.y-old.y,p.x-old.x)
   useLandBrushStore.setState({cursor:p,angle:lastAngle,inverted:e.altKey})
   if(pointer===e.pointerId&&brush&&Math.hypot(p.x-points.at(-1)!.x,p.y-points.at(-1)!.y)>=Math.max(.5,brush.size*.01)){
    points.push(p);if(points.length>LAND_BRUSH_LIMITS.samples){cancel();report(Error('Use a shorter land stroke.'));return}
    if(!timer&&!controller)timer=setTimeout(()=>void runPreview(),120)
   }
  }
  const up=(e:PointerEvent)=>{if(pointer===e.pointerId){points.push(position(e));finish()}}
  const leave=()=>{if(pointer===null)useLandBrushStore.setState({cursor:null})}
  const lost=(e:PointerEvent)=>{if(e.pointerId===pointer)cancel()}
  const key=(e:KeyboardEvent)=>{if(isEditing(e.target))return;if(e.key==='Alt')useLandBrushStore.setState({inverted:e.type==='keydown'});if(e.key==='Escape'&&snapshot){e.preventDefault();cancel()}}
  const stopEditor=useEditorStore.subscribe((s,p)=>{if(s.activeTool!==p.activeTool||s.soloLayerId!==p.soloLayerId)cancel()})
  const stopProject=useProjectStore.subscribe((s,p)=>{if(snapshot&&(s.map!==p.map||s.objects!==p.objects||s.layers!==p.layers||s.objectGroups!==p.objectGroups||s.layerTree!==p.layerTree))cancel()})
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointerleave',leave);el.addEventListener('pointercancel',cancel);el.addEventListener('lostpointercapture',lost);window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',cancel)
  return()=>{cancel();stopEditor();stopProject();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointerleave',leave);el.removeEventListener('pointercancel',cancel);el.removeEventListener('lostpointercapture',lost);window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',cancel)}
 },[surface])
 return null
}
