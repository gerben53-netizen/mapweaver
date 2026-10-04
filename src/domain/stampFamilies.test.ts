import { defaultStampEffects } from './mapEffects'
import { mapWorkspace } from './geography'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { installProjectAssets } from '../projects/assets'
import { parseProject } from '../projects/format'
import { defaultMapStyle } from './mapSettings'
import { expect, it } from 'vitest'
import { chooseVariant, switchVariant, validateFamily, validateFamilySelection, remapFamilyObject } from './stampFamilies'
import { createPlacedObject } from './placement'
import type { StampAsset, StampObject } from './models'
const family = validateFamily({id:'shelf',revision:1,displayName:'Shelf',anchor:'center',coverVariantId:'a',variants:[{id:'a',assetId:'image-a',weight:1},{id:'b',assetId:'image-b',weight:3},{id:'old',assetId:'old-image',weight:100,deprecated:true}]})
const asset:StampAsset={id:'image-a',name:'Shelf',categoryId:'bookcases',mimeType:'image/png',naturalWidth:120,naturalHeight:60,createdAt:'',contentHash:'',family}
it('weights active choices and excludes the current image for Andere variant',()=>{
  expect(chooseVariant(family,undefined,()=>0).id).toBe('a');expect(chooseVariant(family,undefined,()=>.25).id).toBe('b');expect(chooseVariant(family,'b',()=>.999).id).toBe('a')
})
it('persists concrete selection once and switches only image identity, keeping transforms and shadow overrides',()=>{
  const object={...createPlacedObject(asset,{x:100,y:100},{width:1000,height:1000}),rotation:30,scaleX:-1,opacity:.5,effects:{...defaultStampEffects(),softShadow:'off' as const}} as StampObject
  expect(validateFamilySelection(object.family,object.assetId)).toEqual(object.family)
  const next=switchVariant(object,object.family!.variantId==='a'?'b':'a');expect({...next,assetId:object.assetId,family:object.family}).toEqual(object)
  expect(remapFamilyObject(next,new Map([['image-b','portable-b']])).family!.family.variants[1].assetId).toBe('portable-b')
})
it('keeps legacy single-stamp placement unchanged and rejects mismatched persisted selections',()=>{
  expect(createPlacedObject({...asset,family:undefined},{x:100,y:100},{width:1000,height:1000})).not.toHaveProperty('family');expect(()=>validateFamilySelection({family,variantId:'a'},'image-b')).toThrow()
})

it('variant edits undo/redo once, copy exact identity and survive validated document reload',()=>{
  const assets = new Map(family.variants.map((v,i)=>[v.assetId,{blob:new Blob(['fixture'+i],{type:'image/png'}),manifest:{id:v.assetId,kind:'stamp' as const,fileName:v.id,mimeType:'image/png',width:120,height:60,hash:String(i).repeat(64),path:'assets/'+v.assetId+'.png'}}]))
  installProjectAssets(assets)
  const object = createPlacedObject(asset,{x:100,y:100},{width:1000,height:700}) as StampObject
  const layers=[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[object.id]}]
  const map={width:1000,height:700,background:null,...defaultMapStyle(),...mapWorkspace({})}
  store.setState({map,objects:[object],layers,objectGroups:[],layerTree:{roots:['objects'],groups:[]}});editor.setState({activeLayerId:'objects',selectedObjectIds:[object.id],soloLayerId:null,editingGroupId:null});history.reset()
  const next=object.family!.variantId==='a'?'b':'a';store.getState().changeStampVariant(object.id,next);const after=store.getState().objects[0];expect(useHistoryStore.getState().undoCount).toBe(1);history.undo();expect(store.getState().objects[0]).toEqual(object);history.redo();expect(store.getState().objects[0]).toEqual(after)
  store.getState().duplicate();expect((store.getState().objects.at(-1) as StampObject).family).toEqual((after as StampObject).family)
  store.getState().copy();store.getState().paste();expect((store.getState().objects.at(-1) as StampObject).family).toEqual((after as StampObject).family)
  const state=store.getState(),document={formatVersion:12,id:'test',name:'Family test',createdAt:'2026-10-04T00:00:00.000Z',modifiedAt:'2026-10-04T00:00:00.000Z',map:state.map,objects:state.objects,layers:state.layers,objectGroups:[],layerTree:state.layerTree,assets:[...assets.values()].map(a=>a.manifest)}
  expect(parseProject(JSON.parse(JSON.stringify(document))).objects).toEqual(state.objects)
})
