import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { cancelObjectGesture } from '../canvas/interaction'
import { ObjectProperties } from './ObjectProperties'
import { createLayeredContent } from '../domain/layers'
import { defaultMapStyle } from '../domain/mapSettings'
import { createArea, rectangleGeometry } from '../domain/areas'
import { createLabel, createPlace } from '../domain/annotations'
import { createPath } from '../domain/paths'
import { createRoute, routePreset } from '../domain/routes'
import { markerDefaults } from '../domain/markerRegistry'
import { wallPreset } from '../domain/wallPresets'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { registerTestAssets } from '../test/assets'
import type { MapObject } from '../domain/models'

beforeEach(() => {
  cancelObjectGesture()
  history.cancel()
  const defaults=defaultMapStyle()
  project.setState({map:{...defaults,width:2000,height:2000,background:null,grid:{...defaults.grid,cellSize:50,physicalScale:{unit:'ft',distancePerCell:5}}},...createLayeredContent(),layerTree:null,objectGroups:[]})
  editor.setState({selectedObjectIds:[],activeTool:'select',activeLayerId:'objects',soloLayerId:null,editingGroupId:null})
  registerTestAssets({floor:'fillPattern'})
  history.reset()
})
function select(object:MapObject) { project.setState(createLayeredContent([object]));editor.setState({selectedObjectIds:[object.id]});render(<ObjectProperties/>) }
function enter(label:string,value:string) { const input=screen.getByLabelText(label);fireEvent.change(input,{target:{value}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input) }
it('puts floor appearance and world size first, separates actions and hides technical information until requested',()=>{
  const floor={...createArea(rectangleGeometry({x:100,y:100,width:400,height:300})),name:'Floor',fill:{kind:'pattern' as const,assetId:'floor',mode:'repeat' as const,scale:.25,rotation:0,offsetX:0,offsetY:0}}
  select(floor)
  expect(screen.getByLabelText('Area material')).toHaveValue('pattern')
  expect(screen.getByText('40 × 30 ft')).toBeInTheDocument()
  expect(screen.getByLabelText('Width (ft)')).toHaveValue(40)
  expect(screen.queryByText('Canvas dimensions')).toBeNull()
  expect(screen.queryByRole('button',{name:'Terrain'})).toBeNull()
  expect(screen.queryByRole('button',{name:'Edit shape'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Actions'}))
  const actions=screen.getByRole('region',{name:'Actions'})
  expect(within(actions).getByRole('button',{name:'Edit shape'})).toBeInTheDocument()
  expect(within(actions).getByRole('button',{name:/boundary walls/i})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Advanced'}))
  expect(screen.getByText('400.00 × 300.00 px')).toBeInTheDocument()
  fireEvent.click(within(actions).getByRole('button',{name:'Edit shape'}))
  expect(screen.getByRole('button',{name:'Geometry'})).toHaveAttribute('aria-expanded','true')
})
it('commits a relative transform exactly once on Enter followed by blur and restores geometry with undo/redo',()=>{
  const area=createArea(rectangleGeometry({x:100,y:100,width:400,height:300}));select(area)
  enter('Selection scale (%)','150')
  expect(project.getState().objects[0].width).toBe(600)
  expect(useHistoryStore.getState().undoCount).toBe(1)
  act(()=>history.undo());expect(project.getState().objects[0]).toEqual(area)
  act(()=>history.redo());expect(project.getState().objects[0].width).toBe(600)
})
it('edits generated wall thickness without changing room floor or opening width',()=>{
  const map=project.getState().map
  project.getState().generateRoom({name:'Bibliotheek',shape:'rectangle',width:40,height:30,floor:{kind:'solid',color:'#bbaa99'},walls:wallPreset('living-wood',map),doors:1,doorWidth:3,doorType:'single',seed:42},{x:900,y:900})
  const before=structuredClone(project.getState().objects),wall=before.find(o=>o.kind==='path')!
  editor.setState({selectedObjectIds:[wall.id]});history.reset();render(<ObjectProperties/>)
  expect(screen.getByLabelText('Wall preset')).toHaveValue('living-wood')
  enter('Thickness (ft)','3')
  expect(project.getState().objects.find(o=>o.id===wall.id)).toMatchObject({strokeWidth:30})
  expect(project.getState().objects.find(o=>o.kind==='area')).toEqual(before.find(o=>o.kind==='area'))
  expect(project.getState().objects.find(o=>o.kind==='door')).toMatchObject({openingWidth:30})
  expect(useHistoryStore.getState().undoCount).toBe(1)
  act(()=>history.undo());expect(project.getState().objects).toEqual(before)
})
it('prioritizes text editing and commits content with undo',()=>{
  const text=createLabel({x:100,y:100},'Library');select(text)
  expect(screen.getByLabelText('Font size')).toBeInTheDocument()
  expect(screen.getByLabelText('Text alignment')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Label text'),{target:{value:'New title'}});fireEvent.blur(screen.getByLabelText('Label text'))
  expect(project.getState().objects[0]).toMatchObject({text:'New title'})
  act(()=>history.undo());expect(project.getState().objects[0]).toEqual(text)
})
const nodes=[{id:'a',x:100,y:100,mode:'corner' as const},{id:'b',x:500,y:400,mode:'corner' as const}]
it('offers generic path style and physical width before geometry diagnostics',()=>{
  select(createPath(nodes));expect(screen.getByLabelText('Path stroke')).toBeInTheDocument();enter('Path width (ft)','2')
  expect(project.getState().objects[0]).toMatchObject({strokeWidth:20})
  expect(screen.queryByRole('button',{name:'Reverse direction'})).toBeNull()
})
it('offers compact river preset, width, smoothing and outline without halo diagnostics',()=>{
  select(createRoute(nodes,false,routePreset('river')))
  for(const label of ['River style preset','End width (px)','River smoothing','River outline'])expect(screen.getByLabelText(label)).toBeInTheDocument()
  expect(screen.queryByLabelText('River halo')).toBeNull()
})
it('prioritizes marker identity, visual style and prominence while retaining atomic Apply',()=>{
  const marker={...createPlace({x:100,y:100},'North gate','custom',project.getState().map),marker:markerDefaults('battlemap','custom').marker};select(marker)
  for(const label of ['Marker name','Marker type','Marker prominence','Marker visual mode'])expect(screen.getByLabelText(label)).toBeInTheDocument()
  expect(screen.queryByLabelText('Marker note')).toBeNull()
  fireEvent.change(screen.getByLabelText('Marker name'),{target:{value:'South gate'}})
  fireEvent.click(screen.getByRole('button',{name:'Apply properties'}))
  expect(project.getState().objects[0]).toMatchObject({name:'South gate'})
  act(()=>history.undo());expect(project.getState().objects[0]).toEqual(marker)
})

it('summarizes actual opening width rather than the technical selection box',()=>{
  project.getState().generateRoom({name:'Room',shape:'rectangle',width:40,height:30,floor:{kind:'solid',color:'#bbaa99'},walls:wallPreset('living-wood',project.getState().map),doors:1,doorWidth:3,doorType:'single',seed:42},{x:900,y:900})
  const door=project.getState().objects.find(o=>o.kind==='door')!
  editor.setState({selectedObjectIds:[door.id]});render(<ObjectProperties/>)
  expect(screen.getByText('3 ft opening')).toBeInTheDocument()
  expect(screen.getByLabelText('Opening width value')).toHaveValue(3)
  expect(screen.queryByText('10 × 10 ft')).toBeNull()
})
