// @vitest-environment node
import { beforeEach,expect,it,vi } from 'vitest'
import { api } from '../storage/api'
import { loadLocalProject,saveLocalProject } from '../projects/localSession'
import { history } from '../store/history'
import { useProjectSession } from '../projects/session'
import { acceptCampaign,selectLocation,mapCreationQuery,useCampaignStore,openCampaignMap,enterCampaign,commandCampaign } from './session'
import type { CampaignSnapshot } from './model'
vi.mock('../storage/api',()=>({api:vi.fn()}))
vi.mock('../projects/localSession',()=>({loadLocalProject:vi.fn(),saveLocalProject:vi.fn()}))
const snapshot:CampaignSnapshot={campaign:{id:'c',name:'Campaign',revision:2,createdAt:'2026-09-24',modifiedAt:'2026-09-24',deletedAt:null},nodes:[{id:'f',campaignId:'c',parentId:null,mapId:null,name:'Folder',position:0,favorite:false,deletedAt:null,mapType:null,openedAt:null,modifiedAt:'2026-09-24'},{id:'m',campaignId:'c',parentId:'f',mapId:'map',name:'Map',position:0,favorite:true,deletedAt:null,mapType:'battlemap',openedAt:null,modifiedAt:'2026-09-24',mapRevision:1}],preferences:{selected:'f',expanded:['f'],view:'gallery'}}
beforeEach(()=>{vi.resetAllMocks();history.reset();useProjectSession.setState({recoveryDirty:false});useCampaignStore.setState({snapshot:null,expanded:[],selected:null,view:'list',browsing:false,error:''});vi.mocked(api).mockResolvedValue(snapshot)})
it('restores folder selection, view and expansion without opening a map',async()=>{await enterCampaign('c');expect(useCampaignStore.getState()).toMatchObject({selected:'f',view:'gallery',expanded:['f'],browsing:true});expect(loadLocalProject).not.toHaveBeenCalled()})
it('contextual map creation uses the selected folder or map’s parent',()=>{acceptCampaign(snapshot);selectLocation('f');expect(mapCreationQuery()).toContain('parentId=f');acceptCampaign(snapshot,'map');expect(mapCreationQuery()).toContain('parentId=f');selectLocation(null);expect(mapCreationQuery()).toBe('?campaignId=c')})
it('all explorer entry points can reuse the successful local map loader',async()=>{acceptCampaign(snapshot);vi.mocked(loadLocalProject).mockResolvedValue(true);expect(await openCampaignMap('map')).toBe(true);expect(loadLocalProject).toHaveBeenCalledTimes(1);expect(loadLocalProject).toHaveBeenCalledWith('map',expect.any(Function));expect(useCampaignStore.getState().browsing).toBe(false)})
it('a failed map open preserves campaign selection',async()=>{acceptCampaign(snapshot);vi.mocked(loadLocalProject).mockRejectedValue(Error('Bad map'));await expect(openCampaignMap('map')).rejects.toThrow('Bad map');expect(useCampaignStore.getState().selected).toBe('f')})
it('unsaved changes that cannot be saved prevent switching',async()=>{acceptCampaign(snapshot);useProjectSession.setState({recoveryDirty:true});vi.mocked(saveLocalProject).mockResolvedValue();await expect(openCampaignMap('map')).rejects.toThrow('resolve');expect(loadLocalProject).not.toHaveBeenCalled();useProjectSession.setState({recoveryDirty:false})})
it('a conflicting hierarchy mutation does not optimistically alter the local tree',async()=>{acceptCampaign(snapshot);vi.mocked(api).mockRejectedValueOnce(Error('Conflict'));await expect(commandCampaign({op:'move',id:'m',parentId:null})).rejects.toThrow('Conflict');expect(useCampaignStore.getState().snapshot).toEqual(snapshot)})
