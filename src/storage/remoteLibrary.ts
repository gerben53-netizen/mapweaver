import { validateFamily } from '../domain/stampFamilies'
import { api, assetBlob, uploadAsset } from './api'
import type { RemoteAsset } from './api'
import type { AssetKind, StampAsset, StampCategory, TypedAsset } from '../domain/models'
export const toAsset=(a:RemoteAsset):TypedAsset => ({family:a.family?validateFamily(typeof a.family==='string'?JSON.parse(a.family):a.family):undefined,quality:typeof a.quality==='string'?JSON.parse(a.quality):a.quality,patternScale:a.patternScale,sizing:{...(a.applicableMapTypes ? { applicableMapTypes: typeof a.applicableMapTypes === 'string' ? JSON.parse(a.applicableMapTypes) : a.applicableMapTypes } : {}),sizingMode:a.sizingMode,defaultWidth:a.defaultWidth,defaultHeight:a.defaultHeight,sizingUnit:a.sizingUnit,aspectRatioLocked:a.aspectRatioLocked,sizingScope:a.sizingScope},id:a.id,kind:a.type === 'fill-pattern' ? 'fillPattern' : 'stamp',name:a.name,mimeType:a.mimeType,naturalWidth:a.width,naturalHeight:a.height,categoryId:a.categoryId,contentHash:a.sha256,createdAt:a.createdAt})
export class RemoteLibrary {
  async initialize() { await api('/categories') }
  category(name:string) { return api<StampCategory>('/categories','POST',{name}) }
  async snapshot() {
    const assets:RemoteAsset[]=[]
    for(let offset=0;;offset+=500) { const page=await api<RemoteAsset[]>(`/assets?limit=500&offset=${offset}`);assets.push(...page);if(page.length<500)break }
    return {assets:assets.filter(a=>a.type!=='background'&&a.type!=='prefab').map(toAsset),categories:await api<StampCategory[]>('/categories')}
  }
  async getAsset(id:string):Promise<StampAsset | undefined> { return toAsset(await api<RemoteAsset>(`/assets/${id}`)) }
  getBlob(id:string) { return assetBlob(id) }
  getThumbnail(id:string) { return assetBlob(id,true) }
  async add(asset:StampAsset,blob:Blob,_thumbnail?:Blob,originalName?:string) { return (await uploadAsset(blob,asset.kind==='fillPattern'?'fill-pattern':'stamp',asset.name,originalName || asset.name+'.'+(blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png'),asset.categoryId)).added }
  observe(next:(snapshot:Awaited<ReturnType<RemoteLibrary['snapshot']>>)=>void,error:(error:unknown)=>void) {
    let stopped=false,active=false
    const refresh=async()=>{if(active||stopped)return;active=true;try{const value=await this.snapshot();if(!stopped)next(value)}catch(e){if(!stopped)error(e)}finally{active=false}}
    void refresh();const timer=setInterval(()=>void refresh(),1500)
    return {unsubscribe(){stopped=true;clearInterval(timer)}}
  }
  async update(id:string,name:string,categoryId:string) { await api(`/assets/${id}`,'PATCH',{name,categoryId}) }
  async copyAs(id:string,kind:AssetKind) { const asset=await this.getAsset(id);if(!asset)throw new Error('Asset unavailable.');return this.add({...asset,kind},await this.getBlob(id)) }
  async usage(id:string) { return (await api<{name:string}[]>(`/assets/${id}/usage`)).map(p=>p.name) }
  async remove(id:string,inUse:()=>string[]) { const used=inUse();if(used.length)throw new Error(`Asset is still used by ${used.join(', ')}.`);await api(`/assets/${id}`,'DELETE') }
}
