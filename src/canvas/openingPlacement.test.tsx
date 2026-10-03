import { useRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useOpeningPlacement } from './useOpeningPlacement'
import { useCanvasNavigation } from './useCanvasNavigation'
import { createWall } from '../domain/walls'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { defaultMapStyle } from '../domain/mapSettings'
function Harness(){const ref=useRef<HTMLDivElement>(null);useCanvasNavigation(ref);const preview=useOpeningPlacement(ref);return <div ref={ref} tabIndex={0} aria-label="Opening canvas" data-preview={JSON.stringify(preview)}/>}
it('previews, repeats placement, rejects overlap/lock and cancels without a history entry',()=>{
  const wall=createWall([{id:'a',x:100,y:100,mode:'corner'},{id:'b',x:500,y:100,mode:'corner'}]),style=defaultMapStyle()
  project.setState({objects:[wall],objectGroups:[],layerTree:null,map:{width:600,height:400,...style,grid:{...style.grid,snapEnabled:true,cellSize:50},background:null},layers:[{id:'objects',name:'Objects',objectIds:[wall.id],visible:true,locked:false}]});editor.setState({activeTool:'opening',openingKind:'door',openingWidth:70,activeLayerId:'objects',selectedObjectIds:[],viewport:{zoom:1,pan:{x:0,y:0}},soloLayerId:null});history.reset()
  const view=render(<Harness/>),canvas=screen.getByLabelText('Opening canvas');canvas.setPointerCapture=vi.fn();canvas.releasePointerCapture=vi.fn();canvas.hasPointerCapture=()=>false
  const pointer=(type:string,x=250,options:MouseEventInit={})=>{const e=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:100,...options});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'}});fireEvent(canvas,e)}
  pointer('pointermove',243);expect(JSON.parse(canvas.dataset.preview!).opening.position).toBeCloseTo(.375)
  pointer('pointerdown',243);expect(project.getState().objects).toHaveLength(2);expect(useHistoryStore.getState().undoCount).toBe(1)
  pointer('pointerdown',243);expect(project.getState().objects).toHaveLength(2);expect(editor.getState().message).toMatch(/overlap/)
  pointer('pointerdown',367,{altKey:true});expect(project.getState().objects).toHaveLength(3)
  fireEvent.keyDown(canvas,{code:'Space',key:' '});pointer('pointerdown',400);pointer('pointermove',410,{buttons:1});pointer('pointerup',410);fireEvent.keyUp(canvas,{code:'Space',key:' '});expect(project.getState().objects).toHaveLength(3)
  pointer('pointerdown',410,{button:1});pointer('pointermove',420,{buttons:4});pointer('pointerup',420,{button:1});expect(project.getState().objects).toHaveLength(3)
  act(()=>{editor.setState({viewport:{zoom:1,pan:{x:0,y:0}}});project.setState({objects:project.getState().objects.map(o=>o.id===wall.id?{...o,locked:true}:o)})});pointer('pointermove',450);expect(JSON.parse(canvas.dataset.preview!).error).toMatch(/locked/)
  fireEvent.keyDown(canvas,{key:'Escape'});expect(editor.getState().activeTool).toBe('select');expect(canvas.dataset.preview).toBe('null');expect(useHistoryStore.getState().undoCount).toBe(2);view.unmount()
})
it('shows a safe invalid preview even when a segment is shorter than the minimum opening',()=>{
  const wall=createWall([{id:'a',x:100,y:100,mode:'corner'},{id:'b',x:102,y:100,mode:'corner'}]);project.setState({objects:[wall],objectGroups:[],layerTree:null,layers:[{id:'objects',name:'Objects',objectIds:[wall.id],visible:true,locked:false}]});editor.setState({activeTool:'opening',openingWidth:70,viewport:{zoom:1,pan:{x:0,y:0}}});const view=render(<Harness/>),canvas=screen.getByLabelText('Opening canvas');const event=new MouseEvent('pointermove',{bubbles:true,clientX:101,clientY:100});Object.defineProperty(event,'pointerId',{value:1});fireEvent(canvas,event);expect(JSON.parse(canvas.dataset.preview!).error).toMatch(/fit/);view.unmount()
})
