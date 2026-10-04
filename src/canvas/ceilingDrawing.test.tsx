import { useRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useAreaDrawing } from './useAreaDrawing'
import { useCanvasNavigation } from './useCanvasNavigation'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createLayeredContent } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
it('draws ceilings with zoom/pan and snap/Alt, closes on Enter, cancels with Escape and never paints during pan',()=>{
 function Harness(){const surface=useRef<HTMLDivElement>(null);useCanvasNavigation(surface);const preview=useAreaDrawing(surface);return <div ref={surface} tabIndex={0} aria-label="Ceiling canvas" data-points={preview.length}/>}
 project.setState({map:{...defaultMapStyle(),width:800,height:600,background:null,grid:{...defaultMapStyle().grid,snapEnabled:true}},...createLayeredContent()})
 editor.setState({activeTool:'ceiling',areaShape:'polygon',activeLayerId:'objects',selectedObjectIds:[],viewport:{zoom:2,pan:{x:20,y:40}}})
 const view=render(<Harness/>),canvas=screen.getByLabelText('Ceiling canvas');canvas.setPointerCapture=vi.fn();canvas.hasPointerCapture=vi.fn(()=>false);canvas.releasePointerCapture=vi.fn()
 const pointer=(type:string,x:number,y:number,init:MouseEventInit={})=>{const e=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x*2+20,clientY:y*2+40,...init});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'}});fireEvent(canvas,e)}
 for(const [x,y]of [[101,101],[301,101],[301,301],[101,301]])pointer('pointerdown',x,y)
 fireEvent.keyDown(canvas,{key:'Enter'});expect(project.getState().objects).toHaveLength(1);const ceiling=project.getState().objects[0];expect(ceiling).toMatchObject({ceiling:true,geometry:{polygons:[{outer:[{x:100,y:100},{x:300,y:100},{x:300,y:300},{x:100,y:300}],holes:[]}]}})
 for(const [x,y]of [[411,111],[611,111],[611,311]])pointer('pointerdown',x,y,{altKey:true})
 fireEvent.keyDown(canvas,{key:'Enter'});expect(project.getState().objects[1]).toMatchObject({ceiling:true,x:411,y:111})
 pointer('pointerdown',100,100);fireEvent.keyDown(canvas,{key:'Escape'});expect(canvas.getAttribute('data-points')).toBe('0')
 fireEvent.keyDown(canvas,{key:' ',code:'Space'});pointer('pointerdown',100,100);pointer('pointermove',120,120,{buttons:1});pointer('pointerup',120,120);fireEvent.keyUp(canvas,{key:' ',code:'Space'});expect(project.getState().objects).toHaveLength(2)
 pointer('pointerdown',100,100,{button:1});pointer('pointermove',120,120,{buttons:4});pointer('pointerup',120,120,{button:1});expect(project.getState().objects).toHaveLength(2);view.unmount()
})
