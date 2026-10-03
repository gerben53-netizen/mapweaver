import { useEffect, type RefObject } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useWaterDepthStore, commitWaterDepth } from '../store/waterDepthStore'
import { waterStroke } from '../domain/waterDepth'
import { waterDepthSurface } from './drawWaterDepth'
import { projectObjects } from '../domain/projectView'

import { TerrainStroke } from '../domain/terrainBrush'
import { canCreateWithTool } from '../domain/mapCapabilities'
import { ownObjectGesture } from './interaction'
import { screenToMap } from './viewport'
import type { MapDocument } from '../domain/models'


export function WaterDepthController({surface}:{surface:RefObject<HTMLDivElement|null>}){
  useEffect(()=>{
    const el=surface.current;if(!el)return
    let stroke:TerrainStroke|null=null,map:MapDocument|null=null,pointer:number|null=null,release:(()=>void)|null=null,frame=0
    const report=(error:unknown)=>useEditorStore.setState({message:error instanceof Error?error.message:'Water depth painting failed.'})
    const reset=()=>{cancelAnimationFrame(frame);frame=0;stroke=null;map=null;const id=pointer;pointer=null;release?.();release=null;if(id!==null&&el.hasPointerCapture(id))el.releasePointerCapture(id);useWaterDepthStore.setState({preview:null})}
    const cancel=()=>{reset();useWaterDepthStore.setState({cursor:null})}
    const finish=()=>{
      if(!stroke||!map)return reset()
      const current=stroke,original=map
      try{const paint=current.finish();reset();if(useProjectStore.getState().map!==original)throw Error('Map changed during painting. The unfinished stroke was cancelled.');if(Object.keys(paint.tiles).length||original.waterDepth?.paint)commitWaterDepth({...original.waterDepth!,paint},original.waterDepth,'Paint water depth')}catch(error){reset();report(error)}
    }
    const point=(e:PointerEvent)=>{const bounds=el.getBoundingClientRect();return screenToMap({x:e.clientX-bounds.left,y:e.clientY-bounds.top},useEditorStore.getState().viewport)}
    const active=()=>useEditorStore.getState().activeTool==='waterDepth'&&canCreateWithTool(useProjectStore.getState().map.mapType,'waterDepth')
    const preview=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;try{if(stroke)useWaterDepthStore.setState({preview:stroke.snapshot()})}catch(error){cancel();report(error)}})}
    const down=(e:PointerEvent)=>{
      if(!active()||e.defaultPrevented||e.button!==0||pointer!==null)return
      const p=point(e),current=useProjectStore.getState().map
      if(p.x<0||p.y<0||p.x>=current.width||p.y>=current.height)return
      e.preventDefault()
      if(!current.waterDepth?.enabled){report(new Error('Enable automatic depth before painting.'));return}
      try{const settings={...useWaterDepthStore.getState().settings};const water=waterDepthSurface(current,projectObjects(useProjectStore.getState(),true,useEditorStore.getState().soloLayerId));stroke=waterStroke(current.waterDepth.paint,settings,current,water.contains,current.waterDepth.model==='bathymetry'?water.depthAt:undefined);map=current;pointer=e.pointerId;release=ownObjectGesture(finish,cancel);el.setPointerCapture(pointer);useEditorStore.setState({message:''});stroke.add(p);preview()}catch(error){cancel();report(error)}
    }
    const move=(e:PointerEvent)=>{
      if(!active()||e.defaultPrevented){useWaterDepthStore.setState({cursor:null});return}
      const p=point(e);useWaterDepthStore.setState({cursor:p})
      if(stroke&&pointer===e.pointerId){e.preventDefault();try{stroke.add(p);preview()}catch(error){cancel();report(error)}}
    }
    const up=(e:PointerEvent)=>{if(e.pointerId===pointer){try{stroke?.add(point(e));finish()}catch(error){cancel();report(error)}}}
    const leave=()=>{if(pointer===null)useWaterDepthStore.setState({cursor:null})}
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&stroke){e.preventDefault();cancel()}}
    const lost=(e:PointerEvent)=>{if(e.pointerId===pointer)cancel()}
    const stop=useEditorStore.subscribe((state,previous)=>{if(state.activeTool!==previous.activeTool)cancel()})
    const stopProject=useProjectStore.subscribe((state,previous)=>{if(stroke&&(state.map!==previous.map||state.objects!==previous.objects||state.layers!==previous.layers||state.layerTree!==previous.layerTree))cancel()})
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);el.addEventListener('lostpointercapture',lost);el.addEventListener('pointerleave',leave);window.addEventListener('blur',cancel);window.addEventListener('keydown',key)
    return()=>{cancel();stop();stopProject();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);el.removeEventListener('lostpointercapture',lost);el.removeEventListener('pointerleave',leave);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key)}
  },[surface])
  return null
}
