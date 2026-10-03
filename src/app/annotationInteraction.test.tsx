import {useRef} from 'react'
import {act,fireEvent,render,screen} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {AnnotationTools} from './AnnotationTools'
import {useCanvasNavigation} from '../canvas/useCanvasNavigation'
import {useEditorStore as editor} from '../store/editorStore'
import {useProjectStore as project} from '../store/projectStore'
import {createLayeredContent} from '../domain/layers'
import {defaultMapStyle} from '../domain/mapSettings'
import {history,useHistoryStore} from '../store/history'
vi.mock('./MarkerFields',()=>({MarkerPreview:()=>null,MarkerFields:()=>null,ProminenceField:()=>null}))
it('wizard placement is focus-safe, cancels cleanly, preserves Space pan and atomic undo',()=>{
 HTMLDialogElement.prototype.showModal=vi.fn();HTMLDialogElement.prototype.close=vi.fn()
 function Harness(){const ref=useRef<HTMLDivElement>(null);useCanvasNavigation(ref);return <main data-mapweaver-editor><div ref={ref} tabIndex={0} aria-label="Canvas"/><AnnotationTools surface={ref}/></main>}
 project.setState({map:{width:600,height:400,background:null,...defaultMapStyle()},...createLayeredContent(),objectGroups:[],layerTree:null});editor.setState({activeTool:'select',markerWizard:true,markerChoice:null,markerChoiceMapType:null,placeType:'city',symbolAsset:null,activeLayerId:'objects',viewport:{zoom:1,pan:{x:0,y:0}},selectedObjectIds:[],soloLayerId:null});history.reset()
 const view=render(<Harness/>),canvas=screen.getByLabelText('Canvas');canvas.setPointerCapture=vi.fn();canvas.releasePointerCapture=vi.fn();canvas.hasPointerCapture=vi.fn(()=>false)
 const pointer=(type:string,x=100,y=100,buttons=0)=>{const e=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons});Object.defineProperties(e,{pointerId:{value:1},pointerType:{value:'mouse'}});fireEvent(canvas,e)}
 const input=screen.getByLabelText('Marker name');expect(document.activeElement).toBe(input);fireEvent.change(input,{target:{value:'A place'}});fireEvent.click(screen.getByLabelText('Show label'));fireEvent.keyDown(input,{key:'Delete'});expect(project.getState().objects).toHaveLength(0);fireEvent.submit(input.closest('form')!);expect(editor.getState().activeTool).toBe('place')
 pointer('pointerdown');pointer('pointerup');expect(project.getState().objects).toHaveLength(2);expect(editor.getState().activeTool).toBe('select');expect(useHistoryStore.getState().undoCount).toBe(1)
 act(()=>editor.setState({markerWizard:true}));fireEvent.keyDown(screen.getByLabelText('Marker name'),{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();expect(project.getState().objects).toHaveLength(2)
 fireEvent.keyDown(canvas,{key:' ',code:'Space'});pointer('pointerdown');pointer('pointermove',140,120,1);pointer('pointerup',140,120);fireEvent.keyUp(canvas,{key:' ',code:'Space'});expect(screen.queryByRole('dialog')).toBeNull();expect(editor.getState().viewport.pan.x).toBe(40)
 act(()=>{history.undo()});expect(project.getState().objects).toHaveLength(0);view.unmount()
})
