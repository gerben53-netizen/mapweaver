// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '../storage/api'
import { loadLocalProject } from './localSession'
import { initializeProjects, openStartupProject } from './startup'
import type { RemoteProject } from '../storage/api'
import { inventory } from '../storage/migration'
vi.mock('../storage/api',()=>({api:vi.fn()}))
vi.mock('./localSession',()=>({loadLocalProject:vi.fn(),pendingDatabase:{pending:{toArray:async()=>[]}}}))
vi.mock('../storage/migration',()=>({inventory:vi.fn(),migrationState:async()=>({completed:true})}))
const rows=[{id:'a',name:'Map A'}] as RemoteProject[]
beforeEach(()=>{vi.resetAllMocks();vi.mocked(inventory).mockResolvedValue({assets:[],projects:[],blobs:[],embedded:[],categories:[],bytes:0,backgrounds:0})})
it('opens a valid recent project exactly once after consuming the automatic attempt',async()=>{
 vi.mocked(api).mockResolvedValueOnce({id:'a'}).mockResolvedValueOnce({claimed:true});vi.mocked(loadLocalProject).mockResolvedValue(true)
 expect(await openStartupProject(rows)).toEqual({opened:true,error:''})
 expect(api).toHaveBeenNthCalledWith(2,'/startup-project','POST',{id:'a'});expect(loadLocalProject).toHaveBeenCalledTimes(1)
 expect(vi.mocked(loadLocalProject).mock.calls[0][1]()).toBe(false)
})
it.each([[],rows])('keeps the picker/first-use decision when no recent project exists (%j)',async(list)=>{
 vi.mocked(api).mockResolvedValueOnce(list).mockResolvedValueOnce({id:null})
 expect(await initializeProjects()).toMatchObject({rows:list,opened:false,error:'',migrationRequired:false});expect(loadLocalProject).not.toHaveBeenCalled()
})
it('invalidates missing or trashed targets without loading them',async()=>{
 vi.mocked(api).mockResolvedValueOnce({id:'missing'}).mockResolvedValueOnce({claimed:true})
 expect((await openStartupProject(rows)).error).toContain('missing or in Trash');expect(loadLocalProject).not.toHaveBeenCalled()
})
it('handles a corrupt project without retrying its consumed reference',async()=>{
 vi.mocked(api).mockResolvedValueOnce({id:'a'}).mockResolvedValueOnce({claimed:true}).mockResolvedValueOnce({id:null});vi.mocked(loadLocalProject).mockRejectedValue(Error('Invalid project'))
 expect((await openStartupProject(rows)).error).toContain('Invalid project');expect(await openStartupProject(rows)).toEqual({opened:false,error:''});expect(loadLocalProject).toHaveBeenCalledTimes(1)
})
it('does not load a reference already consumed by another tab',async()=>{
 vi.mocked(api).mockResolvedValueOnce({id:'a'}).mockResolvedValueOnce({claimed:false});expect((await openStartupProject(rows)).opened).toBe(false);expect(loadLocalProject).not.toHaveBeenCalled()
})
it('returns a usable fallback when storage is unavailable',async()=>{
 vi.mocked(api).mockRejectedValue(Error('Offline'));expect(await initializeProjects()).toMatchObject({opened:false,rows:[],error:expect.stringContaining('Offline')})
})
it('handles browser migration discovery failures without replacing the project',async()=>{
 vi.mocked(api).mockResolvedValueOnce(rows);vi.mocked(inventory).mockRejectedValueOnce(Error('Recovery storage unavailable'))
 expect(await initializeProjects()).toMatchObject({rows,opened:false,migrationRequired:true,error:expect.stringContaining('Recovery storage unavailable')});expect(loadLocalProject).not.toHaveBeenCalled()
})
