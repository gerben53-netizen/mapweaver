import { useEffect, type RefObject } from 'react'
import { Shape } from 'react-konva/lib/ReactKonvaCore'
import { makeDetailStroke, applyDetailStroke, type DetailBrush } from '../domain/environmentalDetail'
import { commitEnvironmentalDetail, useEnvironmentalDetailStore } from '../store/environmentalDetailStore'
import { useProjectStore } from '../store/projectStore'
import { useEditorStore } from '../store/editorStore'
import { projectObjects } from '../domain/projectView'
import type { MapDocument } from '../domain/models'
import type { Point } from './viewport'
import { ownObjectGesture } from './interaction'
import { screenToMap } from './viewport'

export function EnvironmentalDetailController({surface}:{surface:RefObject<HTMLDivElement|null>}){
  useEffect(()=>{const el=surface.current;if(!el)return;let pointer:number|null=null,points:Point[]=[],original:MapDocument|null=null,settings:DetailBrush|null=null,release:(()=>void)|null=null,frame=0,seed=0,id=''
    const active=()=>useEditorStore.getState().activeTool==='environmentalDetail'
    const point=(e:PointerEvent)=>{const r=el.getBoundingClientRect();return screenToMap({x:e.clientX-r.left,y:e.clientY-r.top},useEditorStore.getState().viewport)}
    const report=(e:unknown)=>useEditorStore.setState({message:e instanceof Error?e.message:'Environmental painting failed.'})
    const reset=()=>{cancelAnimationFrame(frame);frame=0;const previous=pointer;pointer=null;points=[];original=null;settings=null;release?.();release=null;useEnvironmentalDetailStore.setState({preview:null});if(previous!==null&&el.hasPointerCapture(previous))el.releasePointerCapture(previous)}
    const cancel=()=>{reset();useEnvironmentalDetailStore.setState({cursor:null})}
    const result=()=>applyDetailStroke(original!.environmentalDetail,makeDetailStroke(points,settings!,original!,projectObjects(useProjectStore.getState(),true),seed,id))
    const finish=()=>{if(!original||!settings)return reset();try{const before=original,data=result(),action=settings.action;reset();if(useProjectStore.getState().map!==before)throw Error('Map changed. Unfinished environmental stroke was cancelled.');if(JSON.stringify(before.environmentalDetail)!==JSON.stringify(data))commitEnvironmentalDetail(data,before.environmentalDetail,`${action==='erase'?'Erase':'Paint'} environmental detail`)}catch(e){reset();report(e)}}
    const preview=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;try{if(original)useEnvironmentalDetailStore.setState({preview:result()})}catch(e){cancel();report(e)}})}
    const add=(p:Point)=>{const last=points.at(-1);if(!last||Math.hypot(last.x-p.x,last.y-p.y)>.01)points.push(p)}
    const down=(e:PointerEvent)=>{if(!active()||e.defaultPrevented||e.button!==0||pointer!==null)return;const p=point(e),map=useProjectStore.getState().map;if(p.x<0||p.y<0||p.x>=map.width||p.y>=map.height)return;e.preventDefault();try{if(map.environmentalDetail?.locked||map.environmentalDetail?.visible===false)throw Error('Show and unlock Environmental Detail before painting.');settings={...useEnvironmentalDetailStore.getState().settings};original=map;pointer=e.pointerId;id=crypto.randomUUID();seed=crypto.getRandomValues(new Uint32Array(1))[0];release=ownObjectGesture(finish,cancel);el.setPointerCapture(pointer);add(p);useEditorStore.setState({message:''});preview()}catch(error){cancel();report(error)}}
    const move=(e:PointerEvent)=>{if(!active()||e.defaultPrevented){useEnvironmentalDetailStore.setState({cursor:null});return}const p=point(e);useEnvironmentalDetailStore.setState({cursor:p});if(pointer===e.pointerId){e.preventDefault();add(p);preview()}}
    const up=(e:PointerEvent)=>{if(pointer===e.pointerId){add(point(e));finish()}}
    const lost=(e:PointerEvent)=>{if(pointer===e.pointerId)cancel()}
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&pointer!==null){e.preventDefault();cancel()}}
    const leave=()=>{if(pointer===null)useEnvironmentalDetailStore.setState({cursor:null})}
    const stop=useEditorStore.subscribe((s,p)=>{if(s.activeTool!==p.activeTool)cancel()}),stopProject=useProjectStore.subscribe((s,p)=>{if(original&&s.map!==p.map)cancel()})
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);el.addEventListener('lostpointercapture',lost);el.addEventListener('pointerleave',leave);window.addEventListener('blur',cancel);window.addEventListener('keydown',key)
    return()=>{cancel();stop();stopProject();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);el.removeEventListener('lostpointercapture',lost);el.removeEventListener('pointerleave',leave);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key)}
  },[surface]);return null
}
export function EnvironmentalDetailFootprint(){const cursor=useEnvironmentalDetailStore(s=>s.cursor),brush=useEnvironmentalDetailStore(s=>s.settings),tool=useEditorStore(s=>s.activeTool),zoom=useEditorStore(s=>s.viewport.zoom);if(tool!=='environmentalDetail'||!cursor)return null;return <Shape listening={false} sceneFunc={c=>{const ctx=c._context;ctx.save();ctx.lineWidth=3/zoom;ctx.strokeStyle='#202822';ctx.beginPath();ctx.arc(cursor.x,cursor.y,brush.radius,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1/zoom;ctx.strokeStyle=brush.action==='erase'?'#ffb5a8':'#ecdda7';ctx.stroke();ctx.restore()}}/>}
