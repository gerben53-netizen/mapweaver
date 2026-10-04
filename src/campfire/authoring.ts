import { validateMapContract } from './generated/index'
import type { MapLightingV1, MapPointLightV1 } from './generated/index'
import type { ProjectSnapshot } from '../store/history'
import { isCeiling } from '../domain/ceilings'
import { projectObjects } from '../domain/projectView'
export type { MapLightingV1, MapPointLightV1 } from './generated/index'
export const defaultLighting = (): MapLightingV1 => ({ambient:{intensity:1},lights:[]})
export function validateLighting(value: unknown): MapLightingV1 {
 const checked=validateMapContract({format:'CAMPFIRE_MAPWEAVER',version:1,mapId:'validation',revision:1,name:'Validation',dimensions:{pixelWidth:8192,pixelHeight:8192},grid:{type:'NONE',sizePx:50,feetPerCell:5},image:{path:'map.png',mimeType:'image/png'},walls:[],doors:[],lighting:value})
 if(!checked.valid)throw Error('Invalid lighting: '+checked.errors.join('; '))
 return structuredClone(checked.value.lighting!)
}
export function newPointLight(x:number,y:number):MapPointLightV1{return {id:crypto.randomUUID(),type:'point',position:{x,y},radiusFt:20,intensity:.8,color:'#ffcc88',affectsVision:true,enabled:true}}
/** Conservative baked-artwork dependency signature, excluding viewport and authoring-only controls. */
export function campfireContentSignature(state:ProjectSnapshot,name='') {
 const {campfireRevision:_revision,lighting,grid,...map}=state.map
 void _revision
 const objects=projectObjects(state,true).filter(o=>!isCeiling(o)).map(o=>{const {locked:_locked,...rest}=o;void _locked;return o.kind==='door'?{...rest,status:'closed'}:rest})
 return JSON.stringify({name,map,grid:{type:grid.type||'square',cellSize:grid.cellSize,physicalScale:grid.physicalScale,visible:grid.visible,offsetX:grid.offsetX,offsetY:grid.offsetY},lighting:lighting||defaultLighting(),objects,ceilings:state.objects.filter(isCeiling).map(o=>{const {locked:_locked,visible:_visible,...ceiling}=o;void _locked;void _visible;return ceiling})})
}
export function nextCampfireRevision(current:number,changed:boolean){if(changed&&current===Number.MAX_SAFE_INTEGER)throw Error('Campfire revision limit reached.');return current+(changed?1:0)}
