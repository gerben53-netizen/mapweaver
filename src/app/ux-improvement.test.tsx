import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ToolRail } from './ToolRail'
import { SelectionToolbar } from './SelectionToolbar'
import { MapSettingsPanel } from './MapSettingsPanel'
import { Tabs } from './Tabs'
import { canvasFromSquares, gameScaleText, mapSizeText, saveStateText } from './editorUx'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { history } from '../store/history'
import { handleEditorShortcut } from '../store/shortcuts'
import { fitEditorView } from '../canvas/viewActions'
beforeEach(()=>{project.setState({map:{width:2000,height:1000,background:null,...defaultMapStyle()},...createLayeredContent()});editor.setState({activeTool:'select',selectedObjectIds:[],workspace:'editor',focusMode:false,viewport:{zoom:2,pan:{x:30,y:40}}});history.reset()})
it('groups tools with accessible icons and exact active role; asset and marker remain distinct',()=>{
 render(<ToolRail/>);expect(screen.getByRole('group',{name:'Draw'})).toBeInTheDocument()
 fireEvent.click(screen.getByRole('button',{name:'Wall'}));expect(screen.getByRole('button',{name:'Wall'})).toHaveAttribute('aria-pressed','true')
 expect(screen.getByRole('button',{name:'Select'})).toHaveAttribute('title','Select, move or edit existing objects (V)')
 fireEvent.click(screen.getByRole('button',{name:'Place asset'}));expect(editor.getState()).toMatchObject({stampBrowserOpen:true,libraryKind:'stamp'})
 fireEvent.click(screen.getByRole('button',{name:'Place Marker'}));expect(editor.getState().markerWizard).toBe(true)
})
it('switches quick actions with tool context',()=>{
 editor.setState({selectedObjectIds:['one']});render(<SelectionToolbar/>);expect(screen.getByRole('button',{name:'Duplicate'})).toBeVisible()
 act(()=>editor.setState({activeTool:'wall'}));expect(screen.queryByRole('button',{name:'Duplicate'})).not.toBeInTheDocument();expect(screen.getByText('Wall')).toBeVisible()
})
it('derives battlemap cells without rounding partial squares or changing geographic units',()=>{
 expect(canvasFromSquares(40,20,50)).toEqual({width:2000,height:1000});expect(canvasFromSquares(2.5,2,50).width).toBe(125)
 expect(()=>canvasFromSquares(.333,2,50)).toThrow('whole pixels');expect(()=>canvasFromSquares(0,2,50)).toThrow()
 expect(mapSizeText(project.getState().map)).toBe('40 × 20 squares')
 expect(mapSizeText({...project.getState().map,mapType:'regional-map'})).toBe('2000 × 1000 px')
 expect(gameScaleText({...project.getState().map,grid:{...project.getState().map.grid,physicalScale:{unit:'ft',distancePerCell:5}}})).toBe('1 square = 5 ft')
})
it('updates safe grid settings live with undo while retaining a pending resize draft',()=>{
 render(<MapSettingsPanel/>);expect(screen.queryByRole('button',{name:'Apply map settings'})).not.toBeInTheDocument()
 const advanced=screen.getByText('Advanced grid settings').closest('details')!;expect(advanced.open).toBe(false)
 fireEvent.change(screen.getByLabelText('Columns (squares)'),{target:{value:'30'}})
 fireEvent.click(screen.getByLabelText('Show grid'));expect(project.getState().map.grid.visible).toBe(false)
 expect(screen.getByLabelText('Columns (squares)')).toHaveValue(30);expect(project.getState().map.width).toBe(2000)
 expect(editor.getState().viewport.zoom).toBe(2)
 act(()=>history.undo());expect(project.getState().map.grid.visible).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'Resize canvas'}));expect(project.getState().map.width).toBe(1500)
 act(()=>history.undo());expect(project.getState().map.width).toBe(2000)
 fireEvent.click(screen.getByText('Advanced grid settings'));fireEvent.change(screen.getByLabelText('Line opacity (%)'),{target:{value:'60'}});expect(project.getState().map.grid.opacity).toBe(.6)
 act(()=>history.undo());expect(project.getState().map.grid.opacity).toBe(.35)
})
it('retains clipping confirmation and accepts an explicit game scale',()=>{
 project.setState({objects:[{id:'one',assetId:'a',kind:'stamp',x:1900,y:0,width:100,height:100,rotation:0,scaleX:1,scaleY:1,opacity:1}]})
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);render(<MapSettingsPanel/>)
 fireEvent.change(screen.getByLabelText('Columns (squares)'),{target:{value:'10'}});fireEvent.click(screen.getByRole('button',{name:'Resize canvas'}));expect(confirm).toHaveBeenCalled();expect(project.getState().map.width).toBe(2000)
 fireEvent.change(screen.getByLabelText('1 square equals'),{target:{value:'5'}});fireEvent.click(screen.getByRole('button',{name:'Set game scale'}));expect(project.getState().map.grid.physicalScale).toEqual({unit:'ft',distancePerCell:5});confirm.mockRestore()
})
it('keeps keyboard tab navigation and descriptions',()=>{
 const change=vi.fn();render(<Tabs label="Inspector" value="layers" items={[["layers","Layers"],["objects","Objects"],["properties","Properties"],["map","Map"]]} onChange={change}/>);
 const layers=screen.getByRole('tab',{name:'Layers'});expect(layers).toHaveAttribute('aria-selected','true');fireEvent.keyDown(layers,{key:'ArrowRight'});expect(change).toHaveBeenCalledWith('objects');expect(screen.getByRole('tab',{name:'Objects'})).toHaveFocus()
})
it('guards new shortcuts in inputs and toggles transient focus state',()=>{
 render(<div data-mapweaver-editor><input aria-label="Name"/><div tabIndex={0} aria-label="Canvas test"/></div>);const input=screen.getByLabelText('Name'),surface=screen.getByLabelText('Canvas test')
 const key=(target:Element,value:string)=>{const e=new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true});Object.defineProperty(e,'target',{value:target});handleEditorShortcut(e)}
 key(input,'\\');expect(editor.getState().focusMode).toBe(false);key(surface,'\\');expect(editor.getState().focusMode).toBe(true);key(surface,'\\');expect(editor.getState().focusMode).toBe(false)
 editor.setState({selectedObjectIds:['one']});key(input,'Escape');expect(editor.getState().selectedObjectIds).toEqual(['one']);key(surface,'Escape');expect(editor.getState().selectedObjectIds).toEqual([])
})
it('fits a selected offset object without changing its pose',()=>{
 project.setState({objects:[{id:'one',assetId:'a',kind:'stamp',x:300,y:400,width:100,height:100,rotation:0,scaleX:1,scaleY:1,opacity:1}]});editor.setState({selectedObjectIds:['one']});render(<div aria-label="Map canvas"/>);vi.spyOn(screen.getByLabelText('Map canvas'),'getBoundingClientRect').mockReturnValue({width:800,height:600} as DOMRect)
 fitEditorView(true);const v=editor.getState().viewport;expect(350*v.zoom+v.pan.x).toBe(400);expect(450*v.zoom+v.pan.y).toBe(300);expect(project.getState().objects[0].x).toBe(300)
})
it('renders concise save states without losing conflict or recovery information',()=>{
 expect(saveStateText('saved',false,'2026-09-24')).toBe('Saved');expect(saveStateText('saving',false,null)).toBe('Saving…');expect(saveStateText('error',false,null)).toBe('Save failed');expect(saveStateText('conflict',false,null)).toBe('Save conflict');expect(saveStateText('saved',true,'date')).toBe('Unsaved changes')
})

it('keeps geographic tools distinct and regional dimensions in pixels',()=>{
 project.setState({map:{...project.getState().map,mapType:'regional-map'}});render(<><ToolRail/><MapSettingsPanel/></>)
 expect(screen.queryByRole('button',{name:'Wall'})).not.toBeInTheDocument()
 const land=screen.getByRole('button',{name:'Land / Water'}),terrain=screen.getByRole('button',{name:'Terrain Region'})
 expect(land.querySelector('path')!.getAttribute('d')).not.toBe(terrain.querySelector('path')!.getAttribute('d'))
 expect(screen.getByLabelText('Width (px)')).toHaveValue(2000);expect(screen.queryByLabelText('Columns (squares)')).not.toBeInTheDocument()
})
