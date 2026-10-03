import { useEffect,useState } from 'react'
import type { RefObject } from 'react'
import type { Point } from './viewport'
import { screenToMap } from './viewport'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useProjectSession } from '../projects/session'
import { effectiveLayers,editableProjectIds } from '../domain/projectView'
import { createScatter,inverseScatterPoint,SCATTER_LIMITS,validateScatterSettings } from '../domain/scatter'
import type { ScatterObject,ScatterStroke } from '../domain/scatter'
import { ownObjectGesture } from './interaction'
import { generateScatterAsync } from './scatterClient'
export function useScatterDrawing(surface:RefObject<HTMLDivElement|null>){
  const [preview,setPreview]=useState<ScatterObject|null>(null),[cursor,setCursor]=useState<Point|null>(null)
  useEffect(()=>{
    const element=surface.current;if(!element)return
    let input:ScatterObject|null=null,expected:ScatterObject|undefined,stroke:ScatterStroke|null=null,pointer:number|null=null,release=()=>{},timer:ReturnType<typeof setTimeout>|undefined,previewController:AbortController|undefined,commitController:AbortController|undefined,serial=0,finishing=false,generation=0,layerId='',map=useProjectStore.getState().map
    const report=(e:unknown)=>useEditorStore.setState({message:(e as Error).message})
    const detach=()=>{if(pointer!==null&&element.hasPointerCapture(pointer))element.releasePointerCapture(pointer);pointer=null}
    const cancel=()=>{serial++;clearTimeout(timer);timer=undefined;previewController?.abort();previewController=undefined;const owned=!!commitController;commitController?.abort();commitController=undefined;release();release=()=>{};input=null;stroke=null;finishing=false;detach();setPreview(null);if(owned)useEditorStore.setState({scatterBusy:false})}
    const point=(e:PointerEvent)=>{const b=element.getBoundingClientRect();return screenToMap({x:e.clientX-b.left,y:e.clientY-b.top},useEditorStore.getState().viewport)}
    const candidate=()=>({...input!,strokes:[...input!.strokes,structuredClone(stroke!)]})
    const show=()=>{if(timer)return;timer=setTimeout(()=>{timer=undefined;if(!input||!stroke||finishing)return;previewController?.abort();const controller=new AbortController();previewController=controller;const revision=++serial;generateScatterAsync(candidate(),controller.signal).then(o=>{if(serial===revision&&!finishing)setPreview(o)}).catch(e=>{if(!controller.signal.aborted)report(e)})},70)}
    const finish=()=>{
      if(!input||!stroke||finishing)return
      finishing=true;clearTimeout(timer);timer=undefined;serial++;previewController?.abort();detach()
      const original=expected,controller=new AbortController();commitController=controller;useEditorStore.setState({scatterBusy:true})
      generateScatterAsync(candidate(),controller.signal).then(result=>{
        if(controller.signal.aborted)return
        const current=useProjectStore.getState(),editor=useEditorStore.getState()
        if(generation!==useProjectSession.getState().generation||map!==current.map||layerId!==editor.activeLayerId)throw Error('Map or layer changed. Stroke cancelled.')
        release();release=()=>{};input=null;stroke=null
        current.commitScatter(result,original)
      }).catch(e=>{if(!controller.signal.aborted)report(e)}).finally(()=>{if(commitController===controller)cancel()})
    }
    const append=(p:Point)=>{if(!input||!stroke)return;const q=inverseScatterPoint(input,p),last=stroke.points.at(-1)!;if(Math.hypot(q.x-last.x,q.y-last.y)<.01)return;if(stroke.points.length>=SCATTER_LIMITS.samples)throw Error('Stroke has too many samples. Use shorter strokes.');stroke.points.push(q)}
    const down=(e:PointerEvent)=>{
      const editor=useEditorStore.getState();if(e.defaultPrevented||e.button!==0||editor.activeTool!=='scatter'||editor.scatterBusy)return
      e.preventDefault();e.stopPropagation()
      try{
        validateScatterSettings(editor.scatterSettings);const state=useProjectStore.getState();map=state.map;layerId=editor.activeLayerId
        const layer=effectiveLayers(state,editor.soloLayerId).find(l=>l.id===layerId);if(!layer?.visible||layer.locked)throw Error('Choose a visible, unlocked layer.')
        const selected=state.objects.find(o=>editor.selectedObjectIds.length===1&&o.id===editor.selectedObjectIds[0]),allowed=editableProjectIds(state,editor.soloLayerId)
        expected=selected?.kind==='scatter'&&allowed.has(selected.id)&&layer.objectIds.includes(selected.id)?selected:undefined
        if(editor.scatterMode==='erase'&&!expected)throw Error('Select one editable scatter object on the active layer to erase.')
        if(expected&&editor.scatterMode==='paint'&&JSON.stringify(expected.sources)!==JSON.stringify(editor.scatterSources))expected=undefined
        if(!expected&&!editor.scatterSources.length)throw Error('Choose stamp assets first.')
        const p=point(e);if(p.x<0||p.y<0||p.x>map.width||p.y>map.height)throw Error('Start inside the map.')
        input=expected||createScatter(editor.scatterSources,editor.scatterSettings,editor.scatterSeed)
        stroke={mode:editor.scatterMode,diameter:editor.scatterSettings.diameter/Math.hypot(input.matrix[0],input.matrix[1]),points:[inverseScatterPoint(input,p)]}
        useEditorStore.setState({message:''});generation=useProjectSession.getState().generation;release=ownObjectGesture(finish,cancel);pointer=e.pointerId;element.setPointerCapture(pointer);setCursor(p);show()
      }catch(error){cancel();report(error)}
    }
    const move=(e:PointerEvent)=>{if(useEditorStore.getState().activeTool!=='scatter')return;const p=point(e);setCursor(p);if(e.defaultPrevented||pointer!==e.pointerId||!stroke||finishing)return;try{append(p);show()}catch(error){cancel();report(error)}}
    const up=(e:PointerEvent)=>{if(pointer!==e.pointerId||finishing)return;try{append(point(e));finish()}catch(error){cancel();report(error)}}
    const leave=()=>{if(pointer===null)setCursor(null)}
    const unsubscribe=useEditorStore.subscribe((s,p)=>{if(s.activeTool!==p.activeTool&&s.activeTool!=='scatter'){cancel();setCursor(null)}})
    element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',cancel);element.addEventListener('pointerleave',leave);window.addEventListener('blur',cancel)
    return()=>{unsubscribe();cancel();element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('pointerleave',leave);window.removeEventListener('blur',cancel)}
  },[surface])
  return {preview,cursor}
}
