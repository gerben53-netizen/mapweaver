import { ownObjectGesture } from '../canvas/interaction'
// @vitest-environment node
import 'fake-indexeddb/auto'
import { createPath, reversePath } from '../domain/paths'
import { startPathEdit, changePath, endPathEdit } from '../store/pathEditing'
import { afterEach,beforeEach,expect,it,vi } from 'vitest'
import { newProject,useProjectSession,currentSnapshot } from './session'
import { saveLocalProject,pendingDatabase,startLocalAutosave,loadLocalProject,resumePending } from './localSession'
import { useProjectStore } from '../store/projectStore'
import { history,useHistoryStore } from '../store/history'
import { clientGeneration } from '../storage/api'
import { gatherProject } from './archive'
beforeEach(async()=>{vi.stubGlobal('fetch',async()=>Response.json({generation:'test-generation'}));await clientGeneration();newProject('Save test',600,400,'#ffffff',()=>true);useProjectSession.setState({revision:1,saveStatus:'clean',recoveryDirty:false});history.reset()})
afterEach(async()=>{vi.unstubAllGlobals();vi.useRealTimers();await pendingDatabase.pending.clear()})
it('saves a completed model and only then marks it clean, without a download',async()=>{
  useProjectStore.getState().addLayer()
  const fetch=vi.fn(async(_url,options)=>{const body=JSON.parse(options.body);return Response.json({id:body.document.id,document:body.document,revision:2,modifiedAt:new Date().toISOString()})});vi.stubGlobal('fetch',fetch)
  await saveLocalProject();expect(fetch).toHaveBeenCalledTimes(1);expect(useProjectSession.getState().saveStatus).toBe('saved');expect(useProjectSession.getState().revision).toBe(2);expect(useHistoryStore.getState().dirty).toBe(false);expect(await pendingDatabase.pending.count()).toBe(0)
})
it('a successful save cannot remove another tab’s unsynced buffer for the same project',async()=>{
  const prepared=await gatherProject(currentSnapshot(),useProjectSession.getState().info)
  await pendingDatabase.pending.put({id:`other-tab:${prepared.document.id}`,revision:1,prepared,updatedAt:new Date().toISOString()})
  vi.stubGlobal('fetch',async()=>Response.json({document:prepared.document,revision:2,modifiedAt:new Date().toISOString()}))
  await saveLocalProject();expect(await pendingDatabase.pending.count()).toBe(1);expect((await pendingDatabase.pending.toArray())[0].id).toContain('other-tab:')
})
it('resuming an older copy cannot delete newer recovery data from its still-open source tab',async()=>{
  const prepared=await gatherProject(currentSnapshot(),useProjectSession.getState().info),copy={generation:'test-generation',id:'other-tab-copy',revision:1,prepared,updatedAt:new Date().toISOString()}
  await pendingDatabase.pending.put(copy)
  vi.stubGlobal('window',{confirm:()=>true});let finish!:(r:Response)=>void
  vi.stubGlobal('fetch',()=>new Promise<Response>(resolve=>{finish=resolve}))
  const restoring=resumePending(copy);await vi.waitFor(()=>expect(finish).toBeTypeOf('function'))
  await pendingDatabase.pending.put({...copy,prepared:{...prepared,document:{...prepared.document,name:'Newer source edit'}}})
  finish(Response.json({revision:2,modifiedAt:new Date().toISOString()}));await restoring
  expect((await pendingDatabase.pending.get(copy.id))?.prepared.document.name).toBe('Newer source edit')
})
it.each([{status:409,code:'REVISION_CONFLICT',expected:'conflict'},{status:500,code:'STORAGE_ERROR',expected:'error'}])('retains edits and recovery on $expected',async({status,code,expected})=>{
  useProjectStore.getState().addLayer();const before=currentSnapshot();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({code,message:'Keep edits'},{status})))
  await saveLocalProject();expect(useProjectSession.getState().saveStatus).toBe(expected);expect(currentSnapshot()).toEqual(before);expect(useHistoryStore.getState().dirty).toBe(true);expect(await pendingDatabase.pending.count()).toBe(1)
})
it('service shutdown keeps recovery and reports failure, never Saved',async()=>{
  useProjectStore.getState().addLayer();vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline')}));await saveLocalProject();expect(useProjectSession.getState().saveStatus).toBe('error');expect(await pendingDatabase.pending.count()).toBe(1)
})
it('an older in-flight save cannot mark a newer edit saved',async()=>{
  let resolve!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r})));useProjectStore.getState().addLayer()
  const saving=saveLocalProject();await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));useProjectStore.getState().addLayer();resolve(Response.json({revision:2,modifiedAt:new Date().toISOString()}));await saving
  expect(useProjectSession.getState().saveStatus).toBe('dirty');expect(useHistoryStore.getState().dirty).toBe(true)
})
it('completed changes schedule autosave, previews do not',async()=>{
  vi.useFakeTimers();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const stop=startLocalAutosave()
  try{history.begin('Preview');useProjectStore.setState(s=>({map:{...s.map,width:500}}));expect(fetch).not.toHaveBeenCalled();history.cancel();expect(useProjectSession.getState().saveStatus).toBe('clean');useProjectStore.getState().addLayer();expect(useProjectSession.getState().saveStatus).toBe('dirty')}finally{stop()}
})
it('load cancellation keeps the current project and never requests a replacement',async()=>{
  useProjectStore.getState().addLayer();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(await loadLocalProject('other',()=>false)).toBe(false);expect(fetch).not.toHaveBeenCalled()
})
it('background removal is exactly one reversible model transaction',()=>{
  const background={id:'bg',name:'Background',width:600,height:400};useProjectStore.setState(s=>({map:{...s.map,background}}));history.reset();useProjectStore.getState().removeBackground();expect(useProjectStore.getState().map.background).toBeNull();expect(useHistoryStore.getState().undoCount).toBe(1);history.undo();expect(useProjectStore.getState().map.background).toEqual(background);history.redo();expect(useProjectStore.getState().map.background).toBeNull()
})

it('does not save a recovery copy from a replaced dataset into the current dataset',async()=>{
 const prepared=await gatherProject(currentSnapshot(),useProjectSession.getState().info);vi.stubGlobal('window',{confirm:()=>true});const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
 await resumePending({id:'old-dataset',generation:'old',revision:1,prepared,updatedAt:new Date().toISOString()})
 expect(useProjectSession.getState().saveStatus).toBe('conflict');expect(fetch).not.toHaveBeenCalled()
})

it('autosaves completed path sessions and preserves previews outside the save stream',async()=>{
 const stop=startLocalAutosave(),path=createPath([{id:'a',x:50,y:50,mode:'corner'},{id:'b',x:200,y:100,mode:'corner'}])
 try{useProjectStore.getState().addPath(path);history.reset();useProjectSession.setState({saveStatus:'clean'});startPathEdit(path);changePath(reversePath);expect(useProjectSession.getState().saveStatus).toBe('clean');endPathEdit();expect(useProjectSession.getState().saveStatus).toBe('dirty');const fetch=vi.fn(async(_url,options)=>{const {document}=JSON.parse(options.body);expect(document.formatVersion).toBe(12);expect(document.objects[0].nodes[0].id).toBe('b');return Response.json({revision:3,modifiedAt:new Date().toISOString()})});vi.stubGlobal('fetch',fetch);await saveLocalProject();expect(fetch).toHaveBeenCalledTimes(1)}finally{endPathEdit(true);stop()}
})

it('defers an already scheduled autosave through a new path gesture, including cancellation',async()=>{
 const path=createPath([{id:'a',x:50,y:50,mode:'corner'},{id:'b',x:200,y:100,mode:'corner'}]);useProjectStore.getState().addPath(path);history.reset();useProjectSession.setState({saveStatus:'clean'});vi.useFakeTimers();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const stop=startLocalAutosave()
 try{useProjectStore.getState().addLayer();expect(vi.getTimerCount()).toBe(1);startPathEdit(path);changePath(reversePath);await vi.advanceTimersByTimeAsync(1000);expect(useHistoryStore.getState().busy).toBe(true);expect(fetch).not.toHaveBeenCalled();endPathEdit(true);expect(vi.getTimerCount()).toBe(1);expect(useProjectSession.getState().saveStatus).toBe('dirty')}finally{endPathEdit(true);stop()}
})

it('does not mark an in-flight save clean during a newer transient brush gesture',async()=>{
 let finish!:(r:Response)=>void
 useProjectStore.getState().addLayer();vi.stubGlobal('fetch',()=>new Promise<Response>(resolve=>{finish=resolve}))
 const saving=saveLocalProject();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'))
 const release=ownObjectGesture(()=>{})
 try{finish(Response.json({revision:2,modifiedAt:new Date().toISOString()}));await saving;expect(useProjectSession.getState().saveStatus).toBe('dirty');expect(useProjectSession.getState().error).toBe('')}finally{release()}
})
it('scheduled autosave never finishes a transient brush gesture',async()=>{
 vi.useFakeTimers();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const stop=startLocalAutosave();useProjectStore.getState().addLayer();const finish=vi.fn(),release=ownObjectGesture(finish)
 try{await vi.advanceTimersByTimeAsync(1500);expect(fetch).not.toHaveBeenCalled();expect(finish).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(1)}finally{release();stop()}
})
