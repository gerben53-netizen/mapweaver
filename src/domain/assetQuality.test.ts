import { expect, it } from 'vitest'
import { assetAvailableForPlacement, validateAssetQuality } from './assetQuality'
import { createPlacedObject } from './placement'
it('validates quality and applies shadow defaults only when creating a new object',()=>{
 const base={classification:'FIX' as const,reason:'Metadata',semanticClass:'floor_decal',softShadowDefault:false}
 expect(validateAssetQuality(base)).toEqual(base);expect(()=>validateAssetQuality({...base,classification:'premium'})).toThrow();expect(()=>validateAssetQuality({...base,softShadowDefault:'yes'})).toThrow()
 expect(assetAvailableForPlacement()).toBe(true);expect(assetAvailableForPlacement({...base,classification:'REPLACE'})).toBe(false)
 const asset={id:'rug',name:'Tapijt',mimeType:'image/png',naturalWidth:20,naturalHeight:20,categoryId:'textiel',createdAt:'',contentHash:'hash',quality:base}
 const object=createPlacedObject(asset,{x:20,y:20},{width:400,height:300});expect(object.kind==='stamp'&&object.effects?.softShadow).toBe('off');expect(()=>createPlacedObject({...asset,quality:{...base,classification:'REJECT'}},{x:20,y:20},{width:400,height:300})).toThrow(/unavailable/)
})
