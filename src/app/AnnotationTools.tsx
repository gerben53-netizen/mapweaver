import { TitlePresetPicker } from './TitlePresetPicker'
import { MarkerWizard } from './MarkerWizard'
import { createMarkerBundle } from '../domain/markers'
import { markerDefaults } from '../domain/markerRegistry'
import { createMapElement } from '../domain/decorations'
import { CARTOGRAPHIC_ELEMENT_PRESETS,MAP_ELEMENTS,defaultElementPreset } from '../domain/cartographicPresets'
import type { ElementKind,ElementPreset } from '../domain/cartographicPresets'
import { useEffect,useState } from 'react'
import type { RefObject } from 'react'
import { createLabel,legendEntries } from '../domain/annotations'
import type { Point } from '../canvas/viewport'
import { screenToMap } from '../canvas/viewport'
import { snapPoint,interactionGrid } from '../domain/mapSettings'
import { ownObjectGesture } from '../canvas/interaction'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { Modal } from './Modal'
import styles from './OpeningTools.module.css'
export function AnnotationTools({surface}:{surface:RefObject<HTMLDivElement|null>}){
  const wizard=useEditorStore(s=>s.markerWizard)
  const tool=useEditorStore(s=>s.activeTool)
  const selectedPreset=useEditorStore(s=>s.elementPreset),mapType=useProjectStore(s=>s.map.mapType),themeId=useProjectStore(s=>s.map.theme?.id)
  const elementKind=MAP_ELEMENTS.find(e=>e.kind===tool&&e.kind!=='label'&&e.kind!=='place')?.kind as ElementKind|undefined
  const [pending,setPending]=useState<{point:Point;kind:'label'}|null>(null),[name,setName]=useState(''),[error,setError]=useState('')
  useEffect(()=>{const element=surface.current;if(!element)return;let pressed:{x:number;y:number;release:()=>void}|null=null
    const enabled=()=>['place','label','legend','compass','scaleBar','title','infoPanel'].includes(useEditorStore.getState().activeTool)
    const cancel=()=>{const old=pressed;pressed=null;old?.release()}
    const down=(e:PointerEvent)=>{if(!enabled()||e.defaultPrevented||e.button!==0)return;e.preventDefault();e.stopPropagation();pressed={x:e.clientX,y:e.clientY,release:ownObjectGesture(cancel,cancel)}}
    const up=(e:PointerEvent)=>{const old=pressed;cancel();if(!old||!enabled()||Math.hypot(old.x-e.clientX,old.y-e.clientY)>4)return
      const editor=useEditorStore.getState(),state=useProjectStore.getState(),bounds=element.getBoundingClientRect(),point=snapPoint(screenToMap({x:e.clientX-bounds.left,y:e.clientY-bounds.top},editor.viewport),interactionGrid(state.map),e.altKey)
      if(point.x<0||point.y<0||point.x>state.map.width||point.y>state.map.height)return
      try{if(editor.activeTool==='place'){state.addAnnotations(createMarkerBundle(point,editor.markerChoice??markerDefaults(state.map.mapType),state.map));useEditorStore.setState({activeTool:'select',inspector:'properties',inspectorCollapsed:false})}else if(editor.activeTool==='label'){setName('');setError('');setPending({point,kind:editor.activeTool})}else {const kind=editor.activeTool as ElementKind;state.addAnnotations([createMapElement(kind,point,state.map,kind==='legend'?legendEntries(state.objects):[],editor.elementPreset??defaultElementPreset(kind,state.map.mapType,state.map.theme?.id))]);useEditorStore.setState({activeTool:'select',inspector:'properties',inspectorCollapsed:false})}}catch(e){useEditorStore.setState({message:(e as Error).message})}
    }
    const mouse=(e:MouseEvent)=>{if(enabled()&&e.button===0){e.preventDefault();e.stopPropagation()}}
    element.addEventListener('pointerdown',down,true);element.addEventListener('mousedown',mouse,true);window.addEventListener('pointerup',up);window.addEventListener('blur',cancel)
    const unsubscribe=useEditorStore.subscribe((s,p)=>{if(s.activeTool!==p.activeTool)cancel()})
    return()=>{cancel();unsubscribe();element.removeEventListener('pointerdown',down,true);element.removeEventListener('mousedown',mouse,true);window.removeEventListener('pointerup',up);window.removeEventListener('blur',cancel)}
  },[surface])
  function submit(){if(!pending||!name.trim())return;try{const state=useProjectStore.getState();state.addAnnotations([createLabel(pending.point,name.trim(),undefined,'below',state.map.mapType,state.map.theme?.id)]);setPending(null)}catch(e){setError((e as Error).message)}}
  return <>{wizard&&<MarkerWizard/>}{['place','label','legend','compass','scaleBar','title','infoPanel'].includes(tool)&&<div className={styles.tools}>
    {tool==='place'&&<button onClick={()=>useEditorStore.setState({markerWizard:true})}>Edit marker choices…</button>}
    {elementKind&&<label>Style preset<select aria-label="New element preset" value={selectedPreset??defaultElementPreset(elementKind,mapType,themeId)} onChange={e=>useEditorStore.setState({elementPreset:e.target.value as ElementPreset})}>{CARTOGRAPHIC_ELEMENT_PRESETS[elementKind].filter(p=>p.id!=='legacy').map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    {tool==='title'&&<TitlePresetPicker value={selectedPreset??defaultElementPreset('title',mapType,themeId)} onChange={elementPreset=>useEditorStore.setState({elementPreset})}/>}
    <span>Click to place {MAP_ELEMENTS.find(e=>e.kind===tool)?.name??tool} · Esc cancels</span><button onClick={()=>useEditorStore.setState({activeTool:'select'})}>Done</button>
  </div>}
  {pending&&<Modal title={'New label'} onClose={()=>setPending(null)}><form onSubmit={e=>{e.preventDefault();submit()}}><label>{'Label text'}<input data-autofocus aria-label={'Label text'} maxLength={2048} value={name} onChange={e=>setName(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button type="submit" disabled={!name.trim()}>Create</button><button type="button" onClick={()=>setPending(null)}>Cancel</button></form></Modal>}</>
}
