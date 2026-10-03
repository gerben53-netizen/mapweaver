import { beforeEach, expect, it } from 'vitest'
import { validateMapContract, mapContractSchemaV2 } from './generated/index'
import schema from './generated/canonical-schema-v2.json'
import fixture from './generated/canonical-fixture.json'
import { serializeCampfire } from './serialize'
import { validateWindowLight, windowLightPreview } from './windowLights'
import { createWall, SIMPLE_WALL } from '../domain/walls'
import { createOpening, validateOpening } from '../domain/openings'
import { defaultGeography } from '../domain/geography'
import { defaultMapStyle } from '../domain/mapSettings'
import { createLayeredContent } from '../domain/layers'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { useWindowLightPreview } from '../store/windowLightPreview'
import { history } from '../store/history'
import { applyPrepared, currentSnapshot } from '../projects/session'
import { gatherProject, encodeProject, decodeProject } from '../projects/archive'
import { parseProject } from '../projects/format'
import type { WindowObject } from '../domain/models'
const info={id:'window-light-map',name:'Window Light benchmark'}
const wall=()=>createWall([{id:'a',x:50,y:150,mode:'corner'},{id:'b',x:350,y:150,mode:'corner'}],false,{...SIMPLE_WALL,strokeWidth:10})
const project=()=>({map:{...defaultMapStyle(),width:400,height:300,background:null,mapType:'battlemap' as const,geography:defaultGeography(),campfireRevision:1,grid:{...defaultMapStyle().grid,physicalScale:{unit:'ft' as const,distancePerCell:5}}},...createLayeredContent(),objectGroups:[],layerTree:{roots:['objects'],groups:[]}})
beforeEach(()=>{const now=new Date().toISOString();applyPrepared({document:parseProject({...project(),...info,createdAt:now,modifiedAt:now,formatVersion:12,assets:[]}),assets:new Map()},()=>true);editor.setState({activeLayerId:'objects',selectedObjectIds:[],soloLayerId:null});history.reset()})
it('uses canonical v2 schema, preserves v1 admission and rejects missing revision',()=>{
 expect(mapContractSchemaV2).toEqual(schema);expect(validateMapContract(fixture).valid).toBe(true)
 expect(validateMapContract({...fixture,revision:undefined}).valid).toBe(false)
 const v2={...fixture,version:2,windows:[{id:'window',wallId:'wall-1',geometry:{start:{x:400,y:30},end:{x:400,y:90}},transmitsExteriorLight:true}]}
 expect(validateMapContract(v2).valid).toBe(true);expect(validateMapContract({...v2,version:1}).valid).toBe(false)
 expect(validateMapContract({...v2,windows:[{...v2.windows[0],wallId:'missing'}]}).valid).toBe(false)
})
it('admits only contract inputs and preserves absent/zero/default transmission semantics',()=>{
 expect(validateWindowLight({transmitsExteriorLight:true})).toEqual({transmitsExteriorLight:true})
 expect(validateWindowLight({transmitsExteriorLight:true,exteriorLightTransmission:0}).exteriorLightTransmission).toBe(0)
 for(const value of [{},{transmitsExteriorLight:true,exteriorLightTransmission:2},{transmitsExteriorLight:'yes'},{transmitsExteriorLight:true,color:'#ffffff'}])expect(()=>validateWindowLight(value)).toThrow()
 const w=wall(),window=createOpening(w,.5,'window',40) as WindowObject
 expect(validateOpening(window)).toBe(window);expect(windowLightPreview(window,w).enabled).toBe(false)
 expect(windowLightPreview({...window,exteriorLight:{transmitsExteriorLight:true}},w)).toMatchObject({enabled:true,transmission:1,point:{x:200,y:150},width:40})
})
it('exports stable references, pixel coordinates, deterministic v2 and no renderer/runtime fields',()=>{
 const w=wall(),window={...createOpening(w,.5,'window',40),exteriorLight:{transmitsExteriorLight:true,exteriorLightTransmission:.65}} as WindowObject
 store.getState().addPath(w);store.getState().addOpening(window)
 const snapshot=currentSnapshot(),a=serializeCampfire(snapshot,info),light=a.windows![0]
 expect(light).toMatchObject({id:window.id,wallId:w.id+':window:'+window.id,transmitsExteriorLight:true,exteriorLightTransmission:.65});expect(light.geometry.start.x).toBeCloseTo(180);expect(light.geometry.start.y).toBeCloseTo(150);expect(light.geometry.end.x).toBeCloseTo(220);expect(light.geometry.end.y).toBeCloseTo(150)
 expect(a.walls.find(wall=>wall.id===light.wallId)).toMatchObject({...light.geometry,blocksVision:true})
 expect(validateMapContract(a).valid).toBe(true);expect(serializeCampfire(snapshot,info)).toEqual(a)
 editor.setState({viewport:{zoom:4,pan:{x:300,y:-50}}});expect(serializeCampfire(snapshot,info)).toEqual(a)
 expect(JSON.stringify(a)).not.toMatch(/preview|Pixi|DAYLIGHT|environment|guideDepth/)
 const broken={...snapshot,objects:snapshot.objects.filter(o=>o.id!==w.id)};expect(()=>serializeCampfire(broken,info)).toThrow('no exported wall')
})
it('keeps window chords valid on curved native walls and rejects unsupported input without weakening references',()=>{
 const w=createWall([{id:'a',x:50,y:150,mode:'corner',out:{x:80,y:-80}},{id:'b',x:350,y:150,mode:'corner',in:{x:-80,y:80}}],false),window=createOpening(w,.5,'window',40)
 store.getState().addPath(w);store.getState().addOpening(window)
 const a=serializeCampfire(currentSnapshot(),info);expect(validateMapContract(a).valid).toBe(true)
 const changed={...a,windows:a.windows!.map(w=>({...w,geometry:{...w.geometry,start:{x:0,y:0}}}))};expect(validateMapContract(changed).valid).toBe(false)
})
it('persists settings through archive roundtrip; old windows remain unchanged; delete/cascade and undo/redo retain identity',async()=>{
 const w=wall(),window=createOpening(w,.5,'window',40) as WindowObject;store.getState().addPath(w);store.getState().addOpening(window);history.reset()
 history.run('Enable Window Light',()=>store.getState().updateOpening({...window,exteriorLight:{transmitsExteriorLight:true,exteriorLightTransmission:.5}}))
 expect(serializeCampfire(currentSnapshot(),info).windows![0].exteriorLightTransmission).toBe(.5)
 history.undo();expect(store.getState().objects.find(o=>o.id===window.id)).toEqual(window);history.redo()
 const now=new Date().toISOString(),before=serializeCampfire(currentSnapshot(),info),prepared=await gatherProject(currentSnapshot(),{...info,createdAt:now,modifiedAt:now}),decoded=await decodeProject(await encodeProject(prepared));useWindowLightPreview.setState({enabled:true});applyPrepared(decoded,()=>true);expect(useWindowLightPreview.getState().enabled).toBe(false)
 expect(serializeCampfire(currentSnapshot(),info)).toEqual(before)
 editor.setState({selectedObjectIds:[window.id]});store.getState().deleteSelection([window.id]);expect(serializeCampfire(currentSnapshot(),info).windows).toEqual([]);history.undo();expect(store.getState().objects.some(o=>o.id===window.id)).toBe(true)
 store.getState().deleteSelection([w.id]);expect(store.getState().objects).toEqual([]);history.undo();expect(serializeCampfire(currentSnapshot(),info).windows![0].id).toBe(window.id)
})
