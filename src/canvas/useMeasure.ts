import {useEffect,useState} from 'react'
import type {RefObject} from 'react'
import {useEditorStore} from '../store/editorStore'
import {useProjectStore} from '../store/projectStore'
import {isLandMap} from '../domain/geography'
import {screenToMap} from './viewport'
import type {Point} from './viewport'
import {isEditing} from '../store/shortcuts'
export function useMeasure(surface:RefObject<HTMLDivElement|null>) {
  const [points,setPoints]=useState<Point[]>([])
  useEffect(()=>{const el=surface.current;if(!el)return;let fixed:Point[]=[],done=false
    const position=(e:PointerEvent)=>{const r=el.getBoundingClientRect();return screenToMap({x:e.clientX-r.left,y:e.clientY-r.top},useEditorStore.getState().viewport)}
    const active=()=>useEditorStore.getState().activeTool==='measure'&&isLandMap(useProjectStore.getState().map)
    const reset=()=>{fixed=[];done=false;setPoints([])}
    const down=(e:PointerEvent)=>{if(!active()||e.defaultPrevented||e.button!==0)return;e.preventDefault();e.stopPropagation();const p=position(e),m=useProjectStore.getState().map;if(p.x<0||p.y<0||p.x>m.width||p.y>m.height)return;if(done)reset();if(fixed.length>=256){useEditorStore.setState({message:'Measurement limit: 256 points. Enter to finish or Escape to clear.'});return}fixed.push(p);setPoints([...fixed])}
    const move=(e:PointerEvent)=>{if(active()&&!done&&!e.defaultPrevented&&fixed.length)setPoints([...fixed,position(e)])}
    const key=(e:KeyboardEvent)=>{if(!active()||isEditing(e.target)||e.target instanceof Element&&e.target.closest('dialog'))return;if(e.key==='Escape'){e.preventDefault();reset()}if(e.key==='Enter'){e.preventDefault();done=true;setPoints([...fixed])}if(e.key==='Backspace'){e.preventDefault();fixed.pop();setPoints([...fixed])}}
    const off=useEditorStore.subscribe((s,p)=>{if(s.activeTool!==p.activeTool)reset()}),offMap=useProjectStore.subscribe((s,p)=>{if(s.map!==p.map)reset()})
    el.addEventListener('pointerdown',down,true);el.addEventListener('pointermove',move,true);window.addEventListener('keydown',key,true)
    return()=>{off();offMap();el.removeEventListener('pointerdown',down,true);el.removeEventListener('pointermove',move,true);window.removeEventListener('keydown',key,true)}
  },[surface]);return points
}
