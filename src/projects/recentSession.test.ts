// @vitest-environment node
import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'
import { api, request } from '../storage/api'
import { createLocalProject, importLocalProject, loadLocalProject } from './localSession'
import { currentSnapshot, useProjectSession } from './session'
import { useEditorStore } from '../store/editorStore'
import { history } from '../store/history'
vi.mock('../storage/api',()=>({api:vi.fn(),request:vi.fn(),assetBlob:vi.fn()}))
beforeEach(()=>{vi.resetAllMocks();history.reset();useProjectSession.setState({recoveryDirty:false,warning:''})})
async function create(){vi.mocked(api).mockImplementation(async(url,_method,body)=>url==='/projects'?{id:(body as {id:string}).id,document:body,revision:1,modifiedAt:new Date().toISOString()}:{});await createLocalProject('New map',800,600,'#ffffff',()=>true);return {...currentSnapshot(),...useProjectSession.getState().info,formatVersion:12,assets:[]}}
it('opens a newly created project immediately and remembers it only after applying it',async()=>{
 useEditorStore.setState({workspace:'library'});await create();expect(useEditorStore.getState().workspace).toBe('editor');expect(useProjectSession.getState().info.name).toBe('New map');expect(api).toHaveBeenLastCalledWith(`/projects/${useProjectSession.getState().info.id}/opened`,'POST')
})
it('switches manually and remembers only the successfully opened project',async()=>{
 const d=await create(),id=crypto.randomUUID();vi.mocked(api).mockReset().mockResolvedValueOnce({id,document:{...d,id,name:'Other map'},revision:2}).mockImplementation(async()=>{expect(useProjectSession.getState().info.id).toBe(id);return {}})
 await loadLocalProject(id,()=>true);expect(api).toHaveBeenLastCalledWith(`/projects/${id}/opened`,'POST');expect(useProjectSession.getState().info.name).toBe('Other map')
})
it('preserves the open document and recent reference when another document is invalid',async()=>{
 await create();const snapshot=currentSnapshot(),info=useProjectSession.getState().info;vi.mocked(api).mockReset().mockResolvedValue({id:'bad',document:{formatVersion:999}})
 await expect(loadLocalProject('bad',()=>true)).rejects.toThrow();expect(currentSnapshot()).toEqual(snapshot);expect(useProjectSession.getState().info).toEqual(info);expect(api).toHaveBeenCalledTimes(1)
})
it('opens imported documents through the same successful-open boundary',async()=>{
 const d=await create();vi.mocked(api).mockReset().mockResolvedValueOnce({id:d.id,document:d,revision:1}).mockResolvedValue({});vi.mocked(request).mockResolvedValue(Response.json({id:d.id}))
 expect(await importLocalProject(new File(['zip'],'map.mapweaver'),()=>true)).toBe(true);expect(api).toHaveBeenLastCalledWith(`/projects/${d.id}/opened`,'POST')
})
it('keeps a successfully opened map usable if remembering the preference fails',async()=>{
 const d=await create();vi.mocked(api).mockReset().mockResolvedValueOnce({id:d.id,document:d,revision:1}).mockRejectedValueOnce(Error('Offline'))
 expect(await loadLocalProject(d.id,()=>true)).toBe(true);expect(useProjectSession.getState().warning).toContain('startup preference')
})
