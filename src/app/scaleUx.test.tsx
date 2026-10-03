import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { WorldDimensions } from './WorldDimensions'
import { AreaPatternScale } from './AreaPatternScale'
import { createArea, rectangleGeometry, validateArea } from '../domain/areas'
import { defaultMapStyle } from '../domain/mapSettings'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { installProjectAssets } from '../projects/assets'
import { cancelObjectGesture } from '../canvas/interaction'
import { parseProject } from '../projects/format'
import { mapWorkspace } from '../domain/geography'
import { formatSize, worldDimension } from '../domain/mapScale'
import { resolvePlacementSize } from '../domain/placement'
const area = createArea(rectangleGeometry({x:20,y:30,width:200,height:100}), {kind:'pattern',assetId:'floor',mode:'repeat',scale:1,rotation:12,offsetX:7,offsetY:9})
const manifest = {id:'floor',kind:'fillPattern' as const,fileName:'floor.png',mimeType:'image/png',width:40,height:40,hash:'a'.repeat(64),path:'assets/floor.png'}
beforeEach(() => {
  cancelObjectGesture()
  const style=defaultMapStyle()
  project.setState({map:{width:800,height:600,...style,background:null,grid:{...style.grid,physicalScale:{distancePerCell:5,unit:'ft'}}},objects:[structuredClone(area)],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[area.id]}],objectGroups:[],layerTree:null})
  editor.setState({activeTool:'select',selectedObjectIds:[area.id],activeLayerId:'objects',soloLayerId:null,editingGroupId:null})
  installProjectAssets(new Map([['floor',{manifest,blob:new Blob(['image'])}]]));history.reset()
})
afterEach(() => cancelObjectGesture())
it.each([[50,5,5],[100,5,10],[200,5,20],[25,5,2.5],[100,10,20]])('converts %s px on %s ft/cell to %s ft using placement scale', (pixels,distance,value) => {
  const map=project.getState().map;map.grid.physicalScale={distancePerCell:distance,unit:'ft'}
  expect(worldDimension(pixels,map)?.value).toBeCloseTo(value)
  expect(resolvePlacementSize({naturalWidth:100,naturalHeight:50,sizing:{sizingMode:'world',defaultWidth:value,defaultHeight:null,sizingUnit:'ft',sizingScope:'any',aspectRatioLocked:true}},map).width).toBeCloseTo(pixels)
})
it('updates world dimensions with geometry/map changes, never zoom; missing scale only shows pixels', () => {
  const v=render(<WorldDimensions width={200} height={92.22}/>);expect(screen.getByText('20 ft')).toBeVisible();expect(screen.getByText('9.22 ft')).toBeVisible()
  v.rerender(<WorldDimensions width={100} height={50}/>);expect(screen.getByText('10 ft')).toBeVisible()
  act(()=>editor.setState({viewport:{zoom:4,pan:{x:0,y:0}}}));expect(screen.getByText('10 ft')).toBeVisible()
  act(()=>project.setState(s=>({map:{...s.map,grid:{...s.map.grid,physicalScale:{distancePerCell:1.5,unit:'m'}}}})));expect(screen.getByText('3 m')).toBeVisible()
  act(()=>project.setState(s=>({map:{...s.map,grid:{...s.map.grid,physicalScale:undefined}}})));expect(screen.queryByText('3 m')).toBeNull();expect(screen.getByText('100 px')).toBeVisible()
  expect(formatSize(9.222222)).toBe('9.22');expect(formatSize(.0001)).toBe('0.0001')
})
it.each([.01,.1,.25,.5,.75,1,2,100])('preserves scale %s and pattern origin through project serialization', scale => {
  const object={...area,fill:{...area.fill,scale}},map=project.getState().map,now='2026-09-24T00:00:00.000Z'
  const document={...project.getState(),formatVersion:12,id:'test',name:'Test',createdAt:now,modifiedAt:now,map:{...map,...mapWorkspace(map)},objects:[object],assets:[manifest]}
  const plain={formatVersion:document.formatVersion,id:document.id,name:document.name,createdAt:now,modifiedAt:now,map:document.map,objects:document.objects,layers:document.layers,objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[manifest]}
  const result=parseProject(JSON.parse(JSON.stringify(plain)))
  expect(result.objects[0]).toMatchObject({fill:{scale,offsetX:7,offsetY:9,rotation:12},patternFrame:area.patternFrame})
  const missing=JSON.parse(JSON.stringify(plain));delete missing.objects[0].fill.scale;expect(parseProject(missing).objects[0]).toMatchObject({fill:{scale:1}})
})
it.each([0,-1,.009,101,NaN])('rejects invalid scale %s', scale => {
  expect(()=>validateArea({...area,fill:{kind:'pattern',assetId:'floor',mode:'repeat',scale,offsetX:0,offsetY:0,rotation:0}})).toThrow()
})
it('previews immediately, keeps origin, commits one undo, and cancels invalid input/Escape', () => {
  function Harness(){const object=project(s=>s.objects[0]);return object.kind==='area'?<AreaPatternScale object={object}/>:null}
  render(<Harness/>);const field=screen.getByLabelText('Pattern scale')
  fireEvent.change(field,{target:{value:'0.5'}});expect(project.getState().objects[0]).toMatchObject({fill:{scale:.5},patternFrame:area.patternFrame})
  fireEvent.change(field,{target:{value:'0.25'}});expect(useHistoryStore.getState().undoCount).toBe(0)
  fireEvent.blur(field);expect(useHistoryStore.getState().undoCount).toBe(1)
  act(()=>{history.undo()});expect(project.getState().objects[0]).toMatchObject({fill:{scale:1}});expect(field).toHaveValue(1)
  act(()=>{history.redo()});expect(field).toHaveValue(.25)
  fireEvent.change(field,{target:{value:'0'}});expect(screen.getByRole('alert')).toBeVisible();expect(project.getState().objects[0]).toMatchObject({fill:{scale:.25}})
  fireEvent.keyDown(field,{key:'Escape'});expect(field).toHaveValue(.25)
  fireEvent.change(field,{target:{value:'0.5'}});fireEvent.keyDown(field,{key:'Escape'});expect(field).toHaveValue(.25);expect(useHistoryStore.getState().undoCount).toBe(1)
})

it('defaults an omitted legacy pattern scale to one without accepting zero', async () => {
 const {fixture}=await import('../projects/fixtures.test-support')
 const original=(await fixture()).document, missing=JSON.parse(JSON.stringify(original));delete missing.objects[1].patternScale
 expect(parseProject(missing).objects[1]).toMatchObject({kind:'area',fill:{scale:1}})
 missing.objects[1].patternScale=0;expect(()=>parseProject(missing)).toThrow()
})
