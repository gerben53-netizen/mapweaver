import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { OpeningObject, PathObject } from '../domain/models'
import { createOpening, openingDistance, reconcileOpenings, deriveOpening, snapOpeningDistance } from '../domain/openings'
import { nearestPathPoint, pathGeometry, pointAtDistance } from '../domain/paths'
import { editableProjectIds, projectObjects } from '../domain/projectView'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { screenToMap } from './viewport'
import { isEditing } from '../store/shortcuts'
import { outsideWall } from '../domain/wallAlignment'

export type OpeningPlacementPreview={opening:OpeningObject;wall:PathObject;error:string}
export function useOpeningPlacement(surface:RefObject<HTMLDivElement|null>) {
  const [preview,setPreview]=useState<OpeningPlacementPreview|null>(null)
  useEffect(()=>{
    const el=surface.current;if(!el)return
    let current:OpeningPlacementPreview|null=null,space=false
    const clear=()=>{current=null;setPreview(null)}
    const move=(e:PointerEvent)=>{
      const editor=useEditorStore.getState(),state=useProjectStore.getState()
      if(editor.activeTool!=='opening'||space||e.buttons===4){clear();return}
      const box=el.getBoundingClientRect(),p=screenToMap({x:e.clientX-box.left,y:e.clientY-box.top},editor.viewport)
      const walls=projectObjects(state,true,editor.soloLayerId).filter((o):o is PathObject=>o.kind==='path'&&o.pathKind==='wall')
      const nearest=walls.map(wall=>({wall,near:nearestPathPoint(wall,p)})).sort((a,b)=>a.near.distance-b.near.distance)[0]
      if(!nearest||nearest.near.distance>nearest.wall.strokeWidth*(outsideWall(nearest.wall)?1:.5)+20/editor.viewport.zoom){clear();return}
      const {wall}=nearest,g=pathGeometry(wall);let distance=openingDistance(wall,p)
      distance=snapOpeningDistance(wall,distance,editor.openingWidth,state.objects,state.map.grid.snapEnabled?state.map.grid.cellSize:0,editor.viewport.zoom,e.altKey)
      // Snap a center to the nearest usable segment edge, never across a corner.
      const segment=g.segments[nearest.near.segment],half=editor.openingWidth/2
      if(!e.altKey&&segment.length>=editor.openingWidth)distance=Math.max(segment.start+half,Math.min(segment.start+segment.length-half,distance))
      let opening:OpeningObject
      try{opening=createOpening(wall,distance/g.length,editor.openingKind==='passage'?'door':editor.openingKind,editor.openingWidth);if(editor.openingKind==='passage'&&opening.kind==='door')opening={...opening,name:'Open passage',doorType:'passage'}}catch(error){
        // An invalid preview still has a safe tangent anchor and visible red footprint.
        const center=pointAtDistance(wall,(segment.start+segment.length/2)).point,r=editor.openingWidth+wall.strokeWidth
        const base={id:'preview',wallId:wall.id,position:(segment.start+segment.length/2)/g.length,openingWidth:editor.openingWidth,unit:'px' as const,pixelsPerUnit:1,side:1 as const,flip:false,x:center.x-r,y:center.y-r,width:2*r,height:2*r,opacity:1,rotation:0 as const,scaleX:1 as const,scaleY:1 as const}
        const invalid:OpeningObject=editor.openingKind!=='window'?{...base,kind:'door',doorType:editor.openingKind==='passage'?'passage':'single',status:'closed'}:{...base,kind:'window',windowType:'simple'}
        current={opening:invalid,wall,error:(error as Error).message};setPreview(current);return
      }
      let error=''
      try{if(!editableProjectIds(state,editor.soloLayerId).has(wall.id))throw new Error('This wall is locked. Unlock its layer, group and object to place an opening.');reconcileOpenings([...state.objects,opening])}catch(cause){error=(cause as Error).message}
      current={opening,wall,error};setPreview(current)
    }
    const down=(e:PointerEvent)=>{if(e.button!==0||space||useEditorStore.getState().activeTool!=='opening')return;move(e);if(!current)return;e.preventDefault();if(current.error){useEditorStore.setState({message:current.error});return}try{useProjectStore.getState().addOpening(deriveOpening({...current.opening,id:crypto.randomUUID()},current.wall));move(e)}catch(error){useEditorStore.setState({message:(error as Error).message})}}
    const key=(e:KeyboardEvent)=>{if(isEditing(e.target))return;if(e.code==='Space'){space=e.type==='keydown';if(space)clear()}if(e.key==='Escape'&&useEditorStore.getState().activeTool==='opening'){clear();useEditorStore.setState({activeTool:'select',message:''})}}
    const blur=()=>{space=false;clear()};const unsubscribe=useEditorStore.subscribe((s,p)=>{if(s.activeTool!==p.activeTool)clear()}),unsubscribeProject=useProjectStore.subscribe((s,p)=>{if(s.objects!==p.objects)clear()})
    el.addEventListener('pointermove',move);el.addEventListener('pointerdown',down);el.addEventListener('pointerleave',clear);window.addEventListener('keydown',key);window.addEventListener('keyup',key);window.addEventListener('blur',blur)
    return()=>{unsubscribe();unsubscribeProject();el.removeEventListener('pointermove',move);el.removeEventListener('pointerdown',down);el.removeEventListener('pointerleave',clear);window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur)}
  },[surface])
  return preview
}
