import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { mapCapabilities, canCreateWithTool, assetAppliesToMap } from '../domain/mapCapabilities'
import type { MapType } from '../domain/geography'
import { ToolRail } from './ToolRail'
import { RoomTools } from './RoomTools'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { watchMapToolContext } from '../store/mapToolContext'
import { createLabel } from '../domain/annotations'
import { createRoute, routePreset } from '../domain/routes'
import { createLayeredContent } from '../domain/layers'
import { history } from '../store/history'
import { handleEditorShortcut } from '../store/shortcuts'
let stop:()=>void
beforeEach(()=>{project.setState({...createLayeredContent([]),map:{...project.getState().map,mapType:'battlemap'}});editor.setState({activeTool:'select',continueWall:null,areaRole:'area',roomDialog:false,workspace:'editor',selectedObjectIds:[]});history.reset();stop=watchMapToolContext()})
afterEach(()=>stop())
it.each(['battlemap','regional-map','world-map'] as MapType[])('shows only appropriate creation tools and room actions for %s',type=>{
 project.setState({map:{...project.getState().map,mapType:type}});render(<><ToolRail/><RoomTools/></>)
 for(const name of ['Select','Place asset','Map Elements','Scatter','Path','Area'])expect(screen.getByRole('button',{name})).toBeInTheDocument()
 const structure=type==='battlemap'
 for(const name of ['Wall','Opening','Detect rooms'])expect(!!screen.queryByRole('button',{name})).toBe(structure)
 for(const name of ['Land / Water','Terrain Region','Terrain Brush','Water Depth','Measure'])expect(!!screen.queryByRole('button',{name})).toBe(!structure)
 expect(canCreateWithTool(type,'route')).toBe(!structure);expect(mapCapabilities(type).rooms).toBe(structure)
 for(const group of screen.getAllByRole('group'))expect(group.querySelectorAll('button').length).toBeGreaterThan(0)
})
it('falls back safely on map-type change without touching saved objects or label appearance',()=>{
 const route=createRoute([{id:'a',x:20,y:20,mode:'corner'},{id:'b',x:200,y:200,mode:'corner'}],false,routePreset('road'))
 const label=createLabel({x:200,y:200},'Old place',undefined,'below','regional-map'),objects=[route,label]
 project.setState({...createLayeredContent(objects),map:{...project.getState().map,mapType:'regional-map'}});editor.setState({activeTool:'route'});history.reset()
 project.getState().applyMapSettings({...project.getState().map,mapType:'battlemap'},()=>true)
 expect(editor.getState().activeTool).toBe('select');expect(project.getState().objects).toEqual(objects)
 editor.getState().select(route.id);expect(editor.getState().selectedObjectIds).toEqual([route.id])
 editor.setState({activeTool:'editPath'});expect(editor.getState().activeTool).toBe('editPath')
 editor.setState({activeTool:'route',continueWall:{id:route.id,endpoint:'end'}});expect(editor.getState().activeTool).toBe('route')
 history.undo();expect(project.getState().map.mapType).toBe('regional-map');expect(project.getState().objects).toEqual(objects)
})
it('blocks unsupported activations and shortcuts while allowing the neutral selection shortcut',()=>{
 render(<div data-mapweaver-editor onKeyDown={e=>handleEditorShortcut(e.nativeEvent)}><button>Canvas</button></div>)
 act(()=>editor.setState({activeTool:'route'}));expect(editor.getState().activeTool).toBe('select')
 fireEvent.keyDown(screen.getByRole('button'),{key:'r'});expect(editor.getState().activeTool).toBe('select')
 act(()=>editor.setState({activeTool:'label'}));fireEvent.keyDown(screen.getByRole('button'),{key:'v'});expect(editor.getState().activeTool).toBe('select')
 act(()=>project.setState({map:{...project.getState().map,mapType:'world-map'}}));act(()=>editor.setState({activeTool:'opening'}));expect(editor.getState().activeTool).toBe('select')
})
it('treats unclassified assets as universal and explicit incompatible assets as out of scope',()=>{
 expect(assetAppliesToMap([], 'world-map')).toBe(true);expect(assetAppliesToMap(undefined)).toBe(true)
 expect(assetAppliesToMap(['battlemap'],'world-map')).toBe(false);expect(assetAppliesToMap(['world-map'],'world-map')).toBe(true)
})
