import { expect,it,afterEach } from 'vitest'
import { render,fireEvent,screen,cleanup } from '@testing-library/react'
import { RiverProperties } from './RiverProperties'
import { createRoute,routePreset } from '../domain/routes'
import { createPath } from '../domain/paths'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history,useHistoryStore } from '../store/history'
import { cancelObjectGesture } from '../canvas/interaction'
const nodes=[{id:'a',x:10,y:10,mode:'corner' as const},{id:'b',x:200,y:150,mode:'corner' as const}]
afterEach(()=>{cancelObjectGesture();cleanup()})
function setup(){const p=createRoute(nodes,false,routePreset('river'));store.setState({objects:[p],layers:[{id:'layer',name:'Rivers',objectIds:[p.id],locked:false,visible:true}],objectGroups:[],layerTree:null});editor.setState({activeTool:'select',selectedObjectIds:[p.id],soloLayerId:null});history.reset();function View(){const o=store(s=>s.objects[0]);return o.kind==='path'?<RiverProperties object={o}/>:null}render(<View/>);return p}
it('conditionally offers river presets and commits live numeric edits as one undo step',()=>{
 setup();fireEvent.change(screen.getByLabelText('River style preset'),{target:{value:'fantasyRiver'}});expect(useHistoryStore.getState().undoCount).toBe(1)
 const input=screen.getByLabelText('End width (px)');fireEvent.change(input,{target:{value:'20'}});fireEvent.change(input,{target:{value:'24'}});expect(store.getState().objects[0].kind==='path'&&(store.getState().objects[0] as ReturnType<typeof createRoute>).route).toMatchObject({endWidth:24,startWidth:6});fireEvent.blur(input);expect(useHistoryStore.getState().undoCount).toBe(2);history.undo();expect((store.getState().objects[0] as ReturnType<typeof createRoute>).route).toMatchObject({endWidth:18});history.redo();expect((store.getState().objects[0] as ReturnType<typeof createRoute>).route).toMatchObject({endWidth:24})
})
it('cancels a live edit with Escape and rejects invalid widths atomically',()=>{
 const p=setup(),before=JSON.stringify(p);fireEvent.change(screen.getByLabelText('End width (px)'),{target:{value:'40'}});fireEvent.keyDown(screen.getByLabelText('End width (px)'),{key:'Escape'});expect(JSON.stringify(store.getState().objects[0])).toBe(before);expect(useHistoryStore.getState().undoCount).toBe(0)
 fireEvent.change(screen.getByLabelText('End width (px)'),{target:{value:'-2'}});expect(screen.getByRole('alert')).toBeVisible();fireEvent.blur(screen.getByLabelText('End width (px)'));expect(JSON.stringify(store.getState().objects[0])).toBe(before)
})
it('exposes outline/halo controls, disables style during node editing, and hides river UI for generic paths',()=>{
 const p=setup();fireEvent.click(screen.getByLabelText('River halo'));expect(screen.getByLabelText('River halo softness')).toBeVisible();fireEvent.click(screen.getByLabelText('River outline'));expect(screen.queryByLabelText('River outline color')).toBeNull();cleanup();render(<RiverProperties object={createPath(nodes)}/>);expect(screen.queryByLabelText('River style preset')).toBeNull();cleanup();editor.setState({activeTool:'editPath'});render(<RiverProperties object={p}/>);expect(screen.getByLabelText('River style preset')).toBeDisabled()
})
