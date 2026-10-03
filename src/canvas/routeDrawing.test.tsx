import {useRef} from 'react'
import {act,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {usePathDrawing} from './usePathDrawing'
import {useCanvasNavigation} from './useCanvasNavigation'
import {useEditorStore as editor} from '../store/editorStore'
import {useProjectStore as project} from '../store/projectStore'
import {createLayeredContent} from '../domain/layers'
import {defaultMapStyle} from '../domain/mapSettings'
import {history,useHistoryStore} from '../store/history'
import {routePreset,routeStyle,routeWidth} from '../domain/routes'
import type {PathObject} from '../domain/models'
it.each(['river','road','border'] as const)('%s shares drawing, navigation, cancel, node editing and atomic extension',kind=>{
 function Harness(){const ref=useRef<HTMLDivElement>(null);useCanvasNavigation(ref);const nodes=usePathDrawing(ref);return <div ref={ref} tabIndex={0} aria-label="Route canvas" data-nodes={JSON.stringify(nodes)}/>}
 project.setState({map:{width:600,height:400,background:null,...defaultMapStyle()},...createLayeredContent()})
 editor.setState({activeTool:'route',routeStyle:routePreset(kind),pathMode:'curved',objectSnap:false,activeLayerId:'objects',viewport:{zoom:1,pan:{x:0,y:0}},selectedObjectIds:[],continueWall:null});history.reset()
 const view=render(<Harness/>),canvas=screen.getByLabelText('Route canvas');canvas.setPointerCapture=vi.fn();canvas.releasePointerCapture=vi.fn();canvas.hasPointerCapture=vi.fn(()=>false)
 const pointer=(type:string,init:MouseEventInit={})=>{const e=new MouseEvent(type,{bubbles:true,cancelable:true,...init});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'}});fireEvent(canvas,e)}
 const click=(x:number,y:number)=>{pointer('pointerdown',{clientX:x,clientY:y,button:0});pointer('pointerup',{clientX:x,clientY:y,button:0})}
 pointer('pointerdown',{clientX:50,clientY:100});pointer('pointermove',{clientX:80,clientY:60,buttons:1});pointer('pointerup')
 pointer('pointerdown',{button:1,clientX:100,clientY:100});pointer('pointermove',{buttons:4,clientX:120,clientY:120});pointer('pointerup',{button:1})
 expect(JSON.parse(canvas.dataset.nodes!)[0]).toMatchObject({x:50,y:100});fireEvent.wheel(canvas,{deltaY:-100,clientX:100,clientY:100});expect(editor.getState().viewport.zoom).not.toBe(1)
 act(()=>editor.setState({viewport:{zoom:1,pan:{x:0,y:0}}}));click(220,120);fireEvent.keyDown(canvas,{key:'Enter'})
 let p=project.getState().objects[0] as PathObject;expect(p.pathKind).toBe(kind);expect(p.nodes[0].out).toEqual({x:30,y:-40});expect(editor.getState().activeTool).toBe('route');expect(useHistoryStore.getState().undoCount).toBe(1)
 click(300,200);click(400,200);fireEvent.keyDown(canvas,{key:'Escape'});expect(project.getState().objects).toHaveLength(1)
 const original=p
 act(()=>editor.setState({pathMode:'straight',routeStyle:routeStyle(p),continueWall:{id:p.id,endpoint:'start'}}));click(20,40);fireEvent.keyDown(canvas,{key:'Enter'})
 p=project.getState().objects[0] as PathObject;expect(p.nodes).toHaveLength(3);expect(p.nodes[0].id).toBe(original.nodes.at(-1)!.id);expect(routeWidth(p,0)).toBe(routeWidth(original,1));expect(useHistoryStore.getState().undoCount).toBe(2)
 act(()=>{history.undo()});expect(project.getState().objects[0]).toEqual(original);act(()=>{history.redo()});expect((project.getState().objects[0] as PathObject).nodes).toHaveLength(3)
 click(400,300);fireEvent.blur(window);expect(JSON.parse(canvas.dataset.nodes!)).toEqual([]);view.unmount()
})
