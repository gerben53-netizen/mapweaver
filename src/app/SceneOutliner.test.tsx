import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { SceneOutliner } from './SceneOutliner'
import { sceneFixture } from '../domain/scene.fixture'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history,useHistoryStore } from '../store/history'
import { defaultMapStyle } from '../domain/mapSettings'
vi.mock('./useObjectBrowserData',()=>({useObjectBrowserData:()=>({names:new Map()})}))
vi.mock('./SceneThumbnail',()=>({SceneThumbnail:({id}:{id:string})=><span aria-label={`Thumbnail ${id}`}/>}))
vi.stubGlobal('ResizeObserver',class{observe(){} disconnect(){}})
beforeEach(()=>{project.setState({...sceneFixture(),map:{width:800,height:600,background:null,...defaultMapStyle()}});editor.setState({inspector:'layers',activeLayerId:'library',soloLayerId:null,selectedObjectIds:[],collapsedLayers:[],collapsedGroups:[],editingGroupId:null,activeTool:'select'});history.reset();Element.prototype.scrollIntoView=vi.fn()})
it('reveals a selected grouped object through collapsed ancestors without switching away from Scene',async()=>{
  render(<SceneOutliner/>);fireEvent.click(screen.getByRole('button',{name:'Collapse all'}));expect(screen.queryByRole('treeitem',{name:'Archiefkast'})).toBeNull()
  act(()=>editor.setState({selectedObjectIds:['a']}));expect(editor.getState().inspector).toBe('layers')
  fireEvent.click(screen.getByRole('button',{name:'Reveal selected'}));await waitFor(()=>expect(screen.getByRole('treeitem',{name:'Archiefkast'})).toHaveAttribute('aria-selected','true'))
  await waitFor(()=>expect(Element.prototype.scrollIntoView).toHaveBeenCalled())
})
it('clicks individual members, toggles multiselect and selects groups without chevron selection',()=>{
  render(<SceneOutliner/>);fireEvent.click(screen.getByRole('treeitem',{name:'Archiefkast'}));expect(editor.getState().selectedObjectIds).toEqual(['a'])
  fireEvent.click(screen.getByRole('treeitem',{name:'c'}),{ctrlKey:true});expect(editor.getState().selectedObjectIds).toEqual(['a','c'])
  fireEvent.click(screen.getByRole('button',{name:'Collapse Boekenkasten'}));expect(editor.getState().selectedObjectIds).toEqual(['a','c'])
  fireEvent.click(screen.getByRole('treeitem',{name:'Hall'}));expect(editor.getState().activeLayerId).toBe('hall');expect(editor.getState().selectedObjectIds).toEqual(['a','c'])
})
it('search retains exact Layer/Group context and keyboard expands, selects and renames',async()=>{
  render(<SceneOutliner/>);fireEvent.change(screen.getByRole('searchbox'),{target:{value:'archiefkast'}})
  expect(screen.getAllByRole('treeitem').map(n=>n.getAttribute('aria-label'))).toEqual(['Bibliotheek','Boekenkasten','Archiefkast'])
  const row=screen.getByRole('treeitem',{name:'Archiefkast'});fireEvent.keyDown(row,{key:'Enter'});expect(editor.getState().selectedObjectIds).toEqual(['a'])
  fireEvent.keyDown(row,{key:'F2'});const input=screen.getByRole('textbox',{name:'Rename Archiefkast'});fireEvent.change(input,{target:{value:'Royal archive'}});fireEvent.keyDown(input,{key:'Enter'})
  expect(project.getState().objects.find(o=>o.id==='a')?.name).toBe('Royal archive')
  act(()=>history.undo());expect(project.getState().objects.find(o=>o.id==='a')?.name).toBe('Archiefkast')
})
it('moves between parents in one undo step and restores exact relationships with redo',()=>{
  const before=project.getState();project.getState().moveSceneObjects(['a'],{layerId:'hall'})
  expect(useHistoryStore.getState().undoCount).toBe(1);expect(project.getState().layers[1].objectIds).toContain('a')
  history.undo();expect(project.getState().layers).toEqual(before.layers);expect(project.getState().objectGroups).toEqual(before.objectGroups)
  history.redo();expect(project.getState().layers[1].objectIds).toContain('a')
})
it('shows inherited locks as disabled compact controls rather than an override',()=>{
  project.setState(s=>({layers:s.layers.map(l=>({...l,locked:true}))}));render(<SceneOutliner/>);
  expect(screen.getByRole('button',{name:'Lock Archiefkast'})).toBeDisabled();expect(screen.getByRole('button',{name:'Lock Archiefkast'})).toHaveAttribute('title','Locked by parent layer/group')
})
it('navigates into children and back to the parent without selecting on chevrons',async()=>{
  render(<SceneOutliner/>);const layer=screen.getByRole('treeitem',{name:'Bibliotheek'})
  fireEvent.keyDown(layer,{key:'ArrowLeft'});expect(layer).toHaveAttribute('aria-expanded','false')
  fireEvent.keyDown(layer,{key:'ArrowRight'});expect(layer).toHaveAttribute('aria-expanded','true')
  fireEvent.keyDown(layer,{key:'ArrowRight'});await waitFor(()=>expect(screen.getByRole('treeitem',{name:'Boekenkasten'})).toHaveFocus())
  fireEvent.keyDown(screen.getByRole('treeitem',{name:'Boekenkasten'}),{key:'ArrowRight'});await waitFor(()=>expect(screen.getByRole('treeitem',{name:'c'})).toHaveFocus())
  fireEvent.keyDown(screen.getByRole('treeitem',{name:'c'}),{key:'ArrowLeft'});await waitFor(()=>expect(screen.getByRole('treeitem',{name:'Boekenkasten'})).toHaveFocus())
  expect(editor.getState().selectedObjectIds).toEqual([])
})
it('bounds large scenes and reveals distant items without losing keyboard navigation',async()=>{
  project.setState(s=>{const extra=Array.from({length:1000},(_,i)=>({...s.objects[0],id:`extra-${i}`,name:`Extra ${i}`}));return{objects:[...s.objects,...extra],layers:s.layers.map(l=>l.id==='hall'?{...l,objectIds:[...l.objectIds,...extra.map(o=>o.id)]}:l)}})
  render(<SceneOutliner/>);expect(screen.getAllByRole('treeitem').length).toBeLessThan(50)
  act(()=>editor.setState({selectedObjectIds:['d']}));fireEvent.click(screen.getByRole('button',{name:'Reveal selected'}))
  await waitFor(()=>expect(screen.getByRole('treeitem',{name:'d'})).toHaveAttribute('aria-selected','true'))
  const row=screen.getByRole('treeitem',{name:'d'});fireEvent.keyDown(row,{key:'Home'})
  await waitFor(()=>expect(screen.getByRole('treeitem',{name:'Bibliotheek'})).toHaveFocus())
  fireEvent.keyDown(screen.getByRole('treeitem',{name:'Bibliotheek'}),{key:'F10',shiftKey:true})
  expect(screen.getByRole('dialog',{name:'Scene actions for Bibliotheek'})).toBeInTheDocument()
})
