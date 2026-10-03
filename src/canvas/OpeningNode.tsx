import { memo, useEffect, useRef } from 'react'
import { Group, Shape, Rect } from 'react-konva/lib/ReactKonvaCore'
import type Konva from 'konva'
import type { MapObject, OpeningObject, PathObject } from '../domain/models'
import { openingDistance, deriveOpening, openingCutout, snapOpeningDistance } from '../domain/openings'
import { pathGeometry } from '../domain/paths'
import { paintOpening } from './drawOpening'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useImage } from '../images/useImage'
import { history } from '../store/history'
import { ownObjectGesture, finishObjectGesture } from './interaction'

export const OpeningNode=memo(function OpeningNode({object,wall,locked}:{object:OpeningObject;wall:PathObject;locked:boolean}) {
  const {image}=useImage(object.assetId||'','asset','stamp'), selected=useEditorStore(s=>s.selectedObjectIds.includes(object.id)),zoom=useEditorStore(s=>s.viewport.zoom)
  const gesture=useRef<null|{release:()=>void;node:Konva.Group;objects:MapObject[];anchor:{x:number;y:number}}>(null), down=useRef({x:0,y:0})
  function finish(cancel=false){const g=gesture.current;if(!g)return;gesture.current=null;g.release();g.node.stopDrag();g.node.position({x:0,y:0});if(cancel)history.cancel();else history.commit()}
  useEffect(()=>()=>finish(true),[])
  const polygon=openingCutout(object,wall)
  return <Group draggable={!locked} onMouseDown={e=>{if(e.evt.button===0&&!locked){finishObjectGesture();e.cancelBubble=true;const editor=useEditorStore.getState();if(e.evt.shiftKey||!editor.selectedObjectIds.includes(object.id))editor.select(object.id,e.evt.shiftKey);const stage=e.target.getStage(),p=stage?.getPointerPosition();if(stage&&p)down.current=stage.getAbsoluteTransform().copy().invert().point(p)}}} onDragStart={e=>{e.cancelBubble=true;finishObjectGesture();history.begin('Move opening');const node=e.target as Konva.Group,ids=useEditorStore.getState().selectedObjectIds;gesture.current={node,objects:useProjectStore.getState().objects.filter(o=>ids.includes(o.id)),anchor:down.current,release:ownObjectGesture(()=>finish(),()=>finish(true))}}} onDragMove={e=>{
    e.cancelBubble=true;const node=e.target as Konva.Group, stage=node.getStage(), screen=stage?.getPointerPosition();if(!stage||!screen)return
    const p=stage.getAbsoluteTransform().copy().invert().point(screen), state=useProjectStore.getState(), editor=useEditorStore.getState();let distance=openingDistance(wall,p)
    if(gesture.current&&gesture.current.objects.length>1){state.translate(gesture.current.objects,{x:p.x-gesture.current.anchor.x,y:p.y-gesture.current.anchor.y});node.position({x:0,y:0});return}
    distance=snapOpeningDistance(wall,distance,object.openingWidth,state.objects,state.map.grid.snapEnabled?state.map.grid.cellSize:0,editor.viewport.zoom,e.evt.altKey,object.id)
    try{state.updateOpening(deriveOpening({...object,position:distance/pathGeometry(wall).length},wall));useEditorStore.setState({message:''})}catch(error){useEditorStore.setState({message:(error as Error).message})}
    node.position({x:0,y:0});if(editor.activeTool!=='select')finish(true)
  }} onDragEnd={e=>{e.cancelBubble=true;finish()}}>
    <Shape x={object.x} y={object.y} fill="#000" perfectDrawEnabled={false} sceneFunc={c=>paintOpening(c._context,object,wall,image)} hitFunc={(c,s)=>{c.beginPath();c.moveTo(polygon[0].x-object.x,polygon[0].y-object.y);for(const p of polygon.slice(1))c.lineTo(p.x-object.x,p.y-object.y);c.closePath();c.fillShape(s)}}/>
    {selected&&<Rect x={object.x+object.width/2-object.openingWidth/2} y={object.y+object.height/2-object.openingWidth/2} width={object.openingWidth} height={object.openingWidth} stroke="#8cd6aa" strokeWidth={1.5/zoom} dash={[4/zoom,3/zoom]} listening={false}/>}
  </Group>
})
