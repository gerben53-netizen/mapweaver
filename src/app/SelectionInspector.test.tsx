import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ObjectProperties } from './ObjectProperties'
import { ObjectsPanel } from './ObjectsPanel'
import { createLayeredContent } from '../domain/layers'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { createArea, rectangleGeometry } from '../domain/areas'
import { createLabel } from '../domain/annotations'
import { history, useHistoryStore } from '../store/history'
import type { StampObject } from '../domain/models'
vi.mock('../projects/assets', async original => ({ ...await original<typeof import('../projects/assets')>(), assetMetadataName: vi.fn(async () => 'Tree') }))
const objects: StampObject[] = ['a','b','c'].map((id,i)=>({id,kind:'stamp',assetId:'tree',x:i*100,y:20,width:100,height:200,rotation:0,opacity:1,scaleX:1,scaleY:1}))
beforeEach(()=>{
 project.setState(createLayeredContent(objects));editor.setState({selectedObjectIds:[],activeLayerId:'objects',activeTool:'select',inspector:'objects',collapsedGroups:[],editingGroupId:null,soloLayerId:null});history.reset()
})
it('shares duplicate identity and selection across browser and properties without duplicating editing actions',async()=>{
 render(<><ObjectsPanel/><ObjectProperties/></>)
 await waitFor(()=>expect(screen.getAllByText('Tree')).toHaveLength(3))
 const browser=screen.getByRole('region',{name:'Objects'}),properties=screen.getByRole('region',{name:'Object properties'})
 fireEvent.click(within(browser).getAllByRole('option').find(e=>e.getAttribute('aria-posinset')==='2')!)
 expect(editor.getState().selectedObjectIds).toEqual(['b'])
 const row=within(within(browser).getByRole('listbox')).getByRole('option',{selected:true})
 expect(row).toHaveTextContent('✓');expect(row).toHaveTextContent('Stamp · Objects · Item 2')
 expect(within(properties).getByRole('heading',{name:'Tree'})).toBeInTheDocument()
 expect(within(properties).getByText('Stamp · Objects · Item 2')).toBeInTheDocument()
 for(const name of ['Duplicate','Delete','Copy','Edit selection properties','Group selection'])expect(within(browser).queryByRole('button',{name})).toBeNull()
 expect(within(properties).getAllByRole('heading',{name:'Transform'})).toHaveLength(1)
 for(const name of ['Group','Align','Distribute'])expect(within(properties).queryByRole('heading',{name})).toBeNull()
 expect(within(properties).getByRole('button',{name:'Advanced'})).toHaveAttribute('aria-expanded','false')
 act(()=>editor.getState().select('c'))
 expect(within(within(browser).getByRole('listbox')).getByRole('option',{selected:true})).toHaveTextContent('Item 1')
 expect(within(properties).getByText('Stamp · Objects · Item 1')).toBeInTheDocument()
 act(()=>editor.getState().select(null))
 expect(within(properties).getByText('Select an object to edit its properties.')).toBeInTheDocument()
 expect(within(properties).queryByRole('button')).toBeNull()
})
it('exposes bulk controls only at useful selection counts and valid grouping contexts',async()=>{
 render(<ObjectProperties/>);act(()=>editor.setState({selectedObjectIds:['a','b']}))
 expect(screen.getByRole('heading',{name:'2 objects selected'})).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Group selection'})).toBeInTheDocument()
 expect(screen.getByRole('heading',{name:'Align'})).toBeInTheDocument()
 expect(screen.queryByRole('heading',{name:'Distribute'})).toBeNull()
 expect(screen.queryByRole('spinbutton',{name:'X'})).toBeNull()
 act(()=>editor.setState({selectedObjectIds:['a','b','c']}))
 expect(screen.getByRole('heading',{name:'Distribute'})).toBeInTheDocument()
 act(()=>{const layers=project.getState().layers;project.setState({layers:layers.map(l=>l.id==='objects'?{...l,objectIds:['a','c']}:l).concat({id:'other',name:'Other',visible:true,locked:false,objectIds:['b']})})})
 expect(screen.queryByRole('button',{name:'Group selection'})).toBeNull()
 expect(screen.getByRole('button',{name:'Reset selection to asset default size'})).toBeInTheDocument()
})
it('synchronizes dimensions, preserves proportions and center, and records one undo step',async()=>{
 editor.setState({selectedObjectIds:['a']});render(<ObjectProperties/>);await screen.findByText('Tree')
 const width=screen.getByRole('spinbutton',{name:'Width'})
 fireEvent.change(width,{target:{value:'200'}});fireEvent.keyDown(width,{key:'Enter'})
 expect(project.getState().objects[0]).toMatchObject({width:200,height:400,x:-50,y:-80})
 expect(screen.getByRole('spinbutton',{name:'Height'})).toHaveValue(400)
 expect(useHistoryStore.getState().undoCount).toBe(1)
 act(()=>history.undo());expect(width).toHaveValue(100)
 act(()=>project.setState({objects:project.getState().objects.map(o=>o.id==='a'&&o.kind==='stamp'?{...o,x:75,rotation:22.5}:o)}))
 expect(screen.getByRole('spinbutton',{name:'X'})).toHaveValue(75)
 expect(screen.getByRole('spinbutton',{name:'Rotation (degrees)'})).toHaveValue(22.5)
 fireEvent.change(width,{target:{value:'0'}});fireEvent.blur(width)
 expect(width).toHaveAttribute('aria-invalid','true');expect(project.getState().objects[0].width).toBe(100)
})
it('keeps keyboard focus distinct from selection and avoids multi-selection auto-scroll',async()=>{
 render(<ObjectsPanel/>);await waitFor(()=>expect(screen.getAllByText('Tree')).toHaveLength(3))
 const list=screen.getByRole('listbox');fireEvent.keyDown(list,{key:'Home'});fireEvent.keyDown(list,{key:'Enter'})
 const selected=within(list).getByRole('option',{selected:true});fireEvent.keyDown(list,{key:'ArrowDown'})
 expect(selected).toHaveAttribute('aria-selected','true')
 const focused=document.getElementById(list.getAttribute('aria-activedescendant')!)!
 expect(focused).not.toBe(selected);expect(focused).toHaveAttribute('aria-selected','false');expect(focused.className).not.toBe(selected.className)
 list.scrollTop=52;fireEvent.scroll(list);act(()=>editor.setState({selectedObjectIds:['a','c']}))
 expect(list.scrollTop).toBe(52);expect(within(list).getAllByRole('option',{selected:true})).toHaveLength(2)
})

it('keeps asset actions exclusive to stamps and guards an unavailable selection',async()=>{
 const label=createLabel({x:0,y:0},'Note');project.setState(createLayeredContent([label]));editor.setState({selectedObjectIds:[label.id]});render(<ObjectProperties/>)
 expect(screen.queryByText('Asset settings')).toBeNull();expect(screen.getByRole('textbox',{name:'Label text'})).toBeInTheDocument()
 act(()=>{project.setState(createLayeredContent([{...objects[0],locked:true}]));editor.setState({selectedObjectIds:['a']})})
 await screen.findByText('Tree');expect(screen.getByRole('spinbutton',{name:'Width'})).toBeDisabled()
 expect(screen.getByText('Selection is hidden or locked. Show and unlock it before editing.')).toBeInTheDocument()
})

it('retains one uniform transform for geometry objects without stamp asset actions',()=>{
 const area=createArea(rectangleGeometry({x:0,y:0,width:100,height:100}));project.setState(createLayeredContent([area]));editor.setState({selectedObjectIds:[area.id]});render(<ObjectProperties/>)
 expect(screen.getAllByRole('heading',{name:'Transform'})).toHaveLength(1);expect(screen.queryByText('Asset settings')).toBeNull()
 fireEvent.change(screen.getByRole('spinbutton',{name:'Selection scale (%)'}),{target:{value:'200'}});fireEvent.keyDown(screen.getByRole('spinbutton',{name:'Selection scale (%)'}),{key:'Enter'})
 expect(project.getState().objects[0].width).toBe(200);act(()=>history.undo());expect(project.getState().objects[0].width).toBe(100)
})
