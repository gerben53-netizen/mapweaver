import {expect,it,vi} from 'vitest'
import {createScatter,generateScatter,remapScatter} from '../domain/scatter'
import {rectangleGeometry} from '../domain/areas'
import {defaultMapStyle} from '../domain/mapSettings'
import {preparedDocument} from './localSession'
import {applyPrepared,useProjectSession} from './session'
import {resolveAsset} from './assets'
import {useProjectStore} from '../store/projectStore'
import {exportPng} from '../export/render'
import {history,historyReferences} from '../store/history'
import {useEditorStore} from '../store/editorStore'
it('retains missing scatter images for repair, refuses incomplete PNG, and tracks every source in clipboard/history',async()=>{
  const sources=[{assetId:'missing',weight:1,width:10,height:12},{assetId:'available',weight:1,width:12,height:10}],o=generateScatter({...createScatter(sources),area:rectangleGeometry({x:10,y:10,width:300,height:300})}),now=new Date().toISOString()
  vi.stubGlobal('fetch',async(url:string)=>url.endsWith('/health')?Response.json({generation:'scatter-assets-test',instanceId:'test'}):url.includes('missing')?Response.json({code:'ASSET_UNREADABLE',message:'Missing file'},{status:409}):new Response(new Blob(['image'],{type:'image/png'})))
  try{
    const prepared=await preparedDocument({formatVersion:9,id:'scatter-repair',name:'Repair forest',createdAt:now,modifiedAt:now,map:{width:400,height:400,...defaultMapStyle(),background:null},objects:[o],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[o.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:sources.map(a=>({id:a.assetId,kind:'stamp',fileName:a.assetId+'.png',mimeType:'image/png',width:8,height:8,hash:'a'.repeat(64),path:'assets/'+a.assetId+'.png'}))})
    expect(prepared.assets.get('missing')?.unavailable).toBe(true);applyPrepared(prepared,()=>true);expect(useProjectSession.getState().warning).toContain('scatter');expect(useProjectStore.getState().objects).toEqual([o]);await expect(resolveAsset('missing')).rejects.toThrow(/replace/)
    const resolve=vi.fn(async()=>{throw Error('Restore or replace the missing stamp')});await expect(exportPng(useProjectStore.getState(),{scale:1,includeGrid:false,transparent:true},resolve)).rejects.toThrow(/missing stamp/);expect(resolve).toHaveBeenCalledTimes(2)
    // A same-dimension replacement keeps all instance transforms; no regeneration is required.
    const replacement=remapScatter({...o,sources:o.sources.slice(0,1),instances:o.instances.filter(i=>i.assetId==='missing')},new Map([['missing','available']]))
    const {withScatterBounds}=await import('../domain/scatter');useProjectStore.getState().commitScatter(withScatterBounds(replacement),o);expect(historyReferences('missing')).toBe(true);history.undo();expect(useProjectStore.getState().objects).toEqual([o])
    useEditorStore.setState({selectedObjectIds:[o.id]});useProjectStore.getState().copy();expect(useEditorStore.getState().clipboard[0]).toEqual(o)
  }finally{vi.unstubAllGlobals()}
})
