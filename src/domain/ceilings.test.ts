import { beforeEach, expect, it } from 'vitest'
import { createCeiling, validateCeilings } from './ceilings'
import { createArea } from './areas'
import { materialTargets } from '../store/materialApplication'
import { sceneTree } from './sceneTree'
import { readFileSync } from 'node:fs'
import { defaultGeography } from './geography'
import { createLayeredContent } from './layers'
import { defaultMapStyle } from './mapSettings'
import { serializeCampfire } from '../campfire/serialize'
import { validateMapContract } from '../campfire/generated/index'
import { useProjectStore as store } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history } from '../store/history'
import { startAreaEdit, changeAreaPoint, endAreaEdit } from '../store/areaEditing'
import { applyPrepared, currentSnapshot } from '../projects/session'
import { parseProject } from '../projects/format'
import { gatherProject, encodeProject, decodeProject } from '../projects/archive'
import { newMapSnapshot } from '../projects/newMap'
import { exportScene } from '../export/scene'
import { createWall, SIMPLE_WALL } from './walls'
import { createOpening } from './openings'
import { newPointLight } from '../campfire/authoring'
const info={id:'00000000-0000-4000-8000-000000000001',name:'Ceiling map'}
const points=[{x:100,y:100},{x:500,y:100},{x:500,y:400},{x:100,y:400}]
function project(){return {map:{...defaultMapStyle(),width:800,height:600,background:null,mapType:'battlemap' as const,geography:defaultGeography(),grid:{...defaultMapStyle().grid,physicalScale:{unit:'ft' as const,distancePerCell:5}}},...createLayeredContent(),objectGroups:[],layerTree:{roots:['objects'],groups:[]}}}
function file(){const now=new Date().toISOString();return {...currentSnapshot(),...info,formatVersion:12,createdAt:now,modifiedAt:now,assets:[]}}
beforeEach(()=>{const now=new Date().toISOString();applyPrepared({document:parseProject({...project(),...info,formatVersion:12,createdAt:now,modifiedAt:now,assets:[]}),assets:new Map()},()=>true);editor.setState({activeTool:'select',activeLayerId:'objects',selectedObjectIds:[],ceilingsVisible:true})})
it('preserves legacy unknown, explicitly roofless new maps, and optional v3 semantics',()=>{
 const legacy=serializeCampfire(currentSnapshot(),info);expect(legacy.version).toBe(3);expect(legacy).not.toHaveProperty('ceilingRegions')
 const fresh=newMapSnapshot(800,600,'#ffffff','battlemap');fresh.map.grid.physicalScale={unit:'ft',distancePerCell:5};expect(serializeCampfire(fresh,info).ceilingRegions).toEqual([])
 for(const version of [1,2,3]){const value={...legacy,version};if(version===1)delete value.windows;expect(validateMapContract(value).valid).toBe(true)}
 for(const version of [1,2])expect(validateMapContract({...legacy,version,ceilingRegions:[]}).valid).toBe(false)
 expect(parseProject(file()).map).not.toHaveProperty('ceilingExposure')
})
it('creates, edits vertices, cancels, deletes and undoes/redoes with stable IDs and explicit intent',()=>{
 const c=createCeiling(points);store.getState().addArea(c);expect(store.getState().map.ceilingExposure).toBe('explicit');expect(serializeCampfire(currentSnapshot(),info).ceilingRegions).toEqual([{id:c.id,points}])
 startAreaEdit(c);editor.setState({editPoint:0});changeAreaPoint('move',{x:90,y:90});endAreaEdit();expect(store.getState().objects[0].id).toBe(c.id);history.undo();expect(store.getState().objects[0]).toEqual(c);history.redo()
 startAreaEdit(store.getState().objects[0] as typeof c);editor.setState({editPoint:0});changeAreaPoint('move',{x:80,y:80});endAreaEdit(true);expect((store.getState().objects[0] as typeof c).geometry.polygons[0].outer[0]).toEqual({x:90,y:90})
 editor.setState({selectedObjectIds:[c.id]});store.getState().deleteSelection();expect(serializeCampfire(currentSnapshot(),info).ceilingRegions).toEqual([]);history.undo();expect(store.getState().objects[0].id).toBe(c.id);history.redo();expect(store.getState().objects).toEqual([])
})
it('rejects out-of-bounds, nonfinite, self-crossing, duplicate closing points, holes and limits without changing state',()=>{
 const c=createCeiling(points);store.getState().addArea(c);const before=currentSnapshot();
 for(const ring of [[...points,{...points[0]}],points.map((p,i)=>i? p:{x:-1,y:100}),points.map((p,i)=>i? p:{x:NaN,y:100}),[points[0],points[2],points[1],points[3]]]){const bad={...c,geometry:{polygons:[{outer:ring,holes:[]}]}};expect(()=>validateCeilings([bad],before.map)).toThrow()}
 expect(()=>store.getState().updateArea({...c,geometry:{polygons:[{outer:points,holes:[points]}]}})).toThrow()
 expect(()=>store.getState().applyMapSettings({...before.map,width:200},()=>true)).toThrow();expect(currentSnapshot().objects).toEqual(before.objects)
 expect(()=>validateCeilings(Array.from({length:65},(_,i)=>({...c,id:'ceiling-'+i})),before.map)).toThrow()
 const repeated={...file(),objects:[{...c,geometry:{polygons:[{outer:[...points,points[0]],holes:[]}]}}]};expect(()=>parseProject(repeated)).toThrow()
})
it('roundtrips native ZIP, duplicates with fresh IDs, deterministically exports overlap and ignores viewport/overlay',async()=>{
 const c=createCeiling(points);store.getState().addArea(c);editor.setState({selectedObjectIds:[c.id]});store.getState().duplicate();const ids=store.getState().objects.map(o=>o.id);expect(new Set(ids).size).toBe(2)
 const payload=serializeCampfire(currentSnapshot(),info);expect(validateMapContract(payload).valid).toBe(true);expect(payload.ceilingRegions).toHaveLength(2)
 editor.setState({ceilingsVisible:false,viewport:{zoom:3,pan:{x:999,y:-400}}});expect(serializeCampfire(currentSnapshot(),info)).toEqual(payload)
 expect(exportScene(currentSnapshot(),{scale:1,includeGrid:false,transparent:false}).items.filter(i=>i.kind==='object')).toEqual([])
 const now=new Date().toISOString(),prepared=await gatherProject(currentSnapshot(),{...info,createdAt:now,modifiedAt:now}),decoded=await decodeProject(await encodeProject(prepared));applyPrepared(decoded,()=>true);expect(serializeCampfire(currentSnapshot(),info)).toEqual(payload);expect(store.getState().objects.map(o=>o.id)).toEqual(ids)
})
it('leaves wall/window/door and ambient/point-light semantics unchanged',()=>{
 const w=createWall([{id:'a',x:50,y:50,mode:'corner'},{id:'b',x:700,y:50,mode:'corner'}],false,{...SIMPLE_WALL,strokeWidth:10});store.getState().addPath(w);store.getState().addOpening(createOpening(w,.5,'door',40));store.getState().addOpening({...createOpening(w,.25,'window',40),kind:'window',windowType:'simple',exteriorLight:{transmitsExteriorLight:true,exteriorLightTransmission:.8}});store.getState().setLighting({ambient:{intensity:.4},lights:[newPointLight(300,300)]});const before=serializeCampfire(currentSnapshot(),info);store.getState().addArea(createCeiling(points));const after=serializeCampfire(currentSnapshot(),info);expect(after.walls).toEqual(before.walls);expect(after.doors).toEqual(before.doors);expect(after.windows).toEqual(before.windows);expect(after.lighting).toEqual(before.lighting)
})
it('admits concavity and 128 vertices, rejects 129, protects moves and supports ordinary Areas',()=>{
 const concave=[{x:0,y:0},{x:800,y:0},{x:800,y:600},{x:500,y:600},{x:500,y:300},{x:300,y:300},{x:300,y:600},{x:0,y:600}];expect(()=>validateCeilings([createCeiling(concave)],project().map)).not.toThrow()
 const circle=(n:number)=>Array.from({length:n},(_,i)=>({x:400+100*Math.cos(i*2*Math.PI/n),y:300+100*Math.sin(i*2*Math.PI/n)}));expect(()=>validateCeilings([createCeiling(circle(128))],project().map)).not.toThrow();expect(()=>validateCeilings([createCeiling(circle(129))],project().map)).toThrow()
 const c=createCeiling(points);store.getState().addArea(c);history.run('Move ceiling',()=>store.getState().translate([c],{x:20,y:20}));expect(store.getState().objects[0]).toMatchObject({id:c.id,x:120,y:120});history.undo();expect(store.getState().objects[0]).toEqual(c)
 history.run('Invalid move',()=>store.getState().translate([c],{x:1000,y:0}));expect(store.getState().objects[0]).toEqual(c)
 history.run('Invalid transform',()=>store.getState().updateTransform(c.id,{...c,x:1000}));expect(editor.getState().message).toContain('Invalid ceiling');expect(store.getState().objects[0]).toEqual(c)
 expect(materialTargets([c.id])).toEqual([]);expect(sceneTree(currentSnapshot(),new Map())[0].children[0].type).toBe('ceiling')
 const area=createArea({polygons:[{outer:points,holes:[]}]},{kind:'solid',color:'#cccccc'});store.getState().addArea(area);expect(materialTargets([area.id])).toHaveLength(1)
})
it('tracks ceiling changes when hidden, but never bumps revisions for the overlay switch',()=>{
 const c=createCeiling(points);store.getState().addArea(c);history.run('Hide ceiling',()=>store.setState({objects:[{...c,visible:false}]}));const hidden=store.getState().objects[0] as typeof c,revision=store.getState().map.campfireRevision;expect(serializeCampfire(currentSnapshot(),info).ceilingRegions).toHaveLength(1);editor.setState({ceilingsVisible:false});expect(store.getState().map.campfireRevision).toBe(revision)
 // A hidden object's authoring edit still changes exported ceiling data and revision dependencies.
 history.run('Rename hidden ceiling',()=>store.setState({objects:[{...hidden,name:'Covered'}]}));expect(store.getState().map.campfireRevision).toBe(revision!+1)
})
it.each(['outdoor','covered-room','courtyard','ruin','covered-window','cave'])('validates actual producer example %s against canonical v3',name=>{
 const example=JSON.parse(readFileSync(`docs/examples/ceiling-sky/${name}.json`,'utf8'));expect(example.version).toBe(3);expect(validateMapContract(example).valid).toBe(true);expect(example.ceilingRegions.length).toBe(name==='outdoor'?0:name==='courtyard'||name==='ruin'?4:1)
})
