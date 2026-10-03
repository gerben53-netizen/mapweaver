import { wallDrawingStyle, wallStyle } from './walls'
import { generatedWallStyle } from './generatedWalls'
import { continuousDefinition } from './continuousWall.fixture'
import { materialStyle } from './wallSets'
import { beforeEach, expect, it } from 'vitest'
import { createWall, SIMPLE_WALL, STONE_WALL, wallUnits, wallConnections } from './walls'
import { wallRibbon } from './wallGeometry'
import { createPath, insertPathNode, removePathNode, reversePath, pathGeometry, validatePath, withPathGeometry, transformPath } from './paths'
import { transformSelection } from './selectionTransform'
import { snapPathPoint } from './objectSnapping'
import { defaultMapStyle } from './mapSettings'
import { parseProject, referencedAssets } from '../projects/format'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history, useHistoryStore } from '../store/history'
import { startPathEdit, changePath, endPathEdit } from '../store/pathEditing'
import { createObjectListSelector, filterObjectRows } from './objectList'
import type { PathNode } from './models'
import { installProjectAssets, resolveAsset } from '../projects/assets'
const nodes=():PathNode[]=>[{id:'a',x:100,y:100,mode:'corner'},{id:'b',x:300,y:100,mode:'corner'},{id:'c',x:300,y:300,mode:'corner'}]
const layer=(ids:string[])=>({id:'objects',name:'Objects',objectIds:ids,visible:true,locked:false})
const map={width:800,height:600,background:null,...defaultMapStyle()}
const doc=(objects=[createWall(nodes())])=>({formatVersion:6,id:'walls',name:'Walls',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects,layers:[layer(objects.map(o=>o.id))],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
beforeEach(()=>{endPathEdit(true);project.setState({...doc([])});editor.setState({activeLayerId:'objects',selectedObjectIds:[],soloLayerId:null,activeTool:'select',groupSelection:true});history.reset()})
it('stores concrete independent presets, canonical pixels and an explicit scale reference',()=>{const a=createWall(nodes()),b=createWall(nodes(),false,STONE_WALL);a.wall!.outline.width=5;expect(SIMPLE_WALL.wall.outline.width).toBe(2);expect(b.strokeWidth).toBe(48);expect(wallUnits(2,'cells',70)).toBe(140);expect(wallUnits(.5,'ft',70)).toBe(35);expect(wallUnits(12,'px',10)).toBe(12)})
it('rejects corrupt style, unsupported combinations, nodes, lengths and derived bounds',()=>{const p=createWall(nodes());for(const next of [{...p,wall:undefined},{...p,strokeWidth:0},{...p,strokeWidth:1025},{...p,wall:{...p.wall!,pixelsPerUnit:NaN}},{...p,wall:{...p.wall!,outline:{...p.wall!.outline,width:129}}},{...p,pathKind:'generic'},{...p,x:p.x+1},{...p,stroke:{kind:'dashed',color:'#123456',dash:2,gap:2}}])expect(()=>validatePath(next as typeof p)).toThrow();expect(()=>createWall([{...nodes()[0],x:0},{...nodes()[1],x:1000001}])).toThrow();expect(()=>createWall(Array.from({length:257},(_,i)=>({id:'n'+i,x:i,y:10,mode:'corner'})))).toThrow()})
it('derives cached bounded contours for all joins/caps, sharp reversals, curves and closed self crossings',()=>{for(const join of ['miter','round','bevel'] as const)for(const cap of ['butt','round','square'] as const){const p=createWall(nodes(),false,{...SIMPLE_WALL,join,cap}),r=wallRibbon(p);expect(r.strips.length).toBe(2);expect(wallRibbon(p)).toBe(r);for(const polygon of r.polygons)for(const v of polygon){expect(v.x).toBeGreaterThanOrEqual(p.x);expect(v.x).toBeLessThanOrEqual(p.x+p.width);expect(v.y).toBeGreaterThanOrEqual(p.y);expect(v.y).toBeLessThanOrEqual(p.y+p.height)}}const curve=createWall([{...nodes()[0],out:{x:0,y:100}}, {...nodes()[1],in:{x:0,y:100}}]);expect(wallRibbon(curve).strips.length).toBeGreaterThan(8);expect(wallRibbon(createWall([...nodes(),{id:'d',x:150,y:50,mode:'corner'}],true)).strips.length).toBe(4)})
it('outline expands bounds and uniform selection transforms scale outline and thickness together',()=>{const p=createWall(nodes()),scaled=transformSelection([p],{scale:2,rotation:30})[0];expect(scaled.kind).toBe('path');if(scaled.kind==='path'){expect(scaled.strokeWidth).toBe(48);expect(scaled.wall!.outline.width).toBe(4);expect(pathGeometry(scaled).length).toBeCloseTo(800)}const moved=transformPath(p,{...p,x:p.x+50,y:p.y+20});expect(moved.nodes[0].x).toBeCloseTo(150);expect(moved.wall).toEqual(p.wall)})
it('snaps endpoints, interior nodes and T segments at screen tolerance; excludes hidden/locked and honors Alt',()=>{const p=createWall(nodes()),layers=[layer([p.id])],grid={...map.grid,snapEnabled:false};for(const zoom of [.25,1,4]){expect(snapPathPoint({x:100+7/zoom,y:100},[p],layers,map,grid,zoom,true,false).kind).toBe('endpoint');expect(snapPathPoint({x:200,y:100+7/zoom},[p],layers,map,grid,zoom,true,false).kind).toBe('segment')}expect(snapPathPoint({x:301,y:101},[p],layers,map,grid,1,true,false).kind).toBe('node');expect(snapPathPoint({x:101,y:101},[p],layers,map,grid,1,true,true).kind).toBe(null);expect(snapPathPoint({x:101,y:101},[{...p,locked:true}],layers,map,grid,1,true,false).kind).toBe(null);expect(snapPathPoint({x:101,y:101},[p],[{...layers[0],visible:false}],map,grid,1,true,false).kind).toBe(null)})
it('only compatible separate endpoint walls receive visual patches, without mutating nodes',()=>{const a=createWall(nodes()),b=createWall([{id:'d',x:300,y:300,mode:'corner'},{id:'e',x:400,y:250,mode:'corner'}]);expect(wallConnections([a,b]).get(a.id)).toEqual([a.nodes[2]]);expect(wallConnections([a,{...b,strokeWidth:25}]).size).toBe(0);expect(a.nodes).toEqual(nodes())})
it('node edits/reverse/extension retain walls and use one undoable edit session',()=>{const p=createWall(nodes());project.getState().addPath(p);startPathEdit(p);changePath(o=>insertPathNode(o,0,.5));changePath(o=>reversePath(o));endPathEdit();expect(useHistoryStore.getState().undoCount).toBe(2);expect(project.getState().objects[0].kind).toBe('path');history.undo();expect(project.getState().objects[0]).toEqual(p);history.redo();startPathEdit(project.getState().objects[0] as typeof p);changePath(o=>removePathNode(o,1));endPathEdit(true);expect((project.getState().objects[0] as typeof p).nodes).toHaveLength(4);history.run('Extend wall',()=>project.getState().updatePath(withPathGeometry(p,[...p.nodes,{id:'d',x:400,y:300,mode:'corner'}])));history.undo();expect((project.getState().objects[0] as typeof p).nodes).toHaveLength(4)})
it('bulk styles are atomic, limited and preserve geometry through undo/redo and lock refusal',()=>{const a=createWall(nodes()),b=createWall(nodes());project.setState({...doc([a,b])});history.reset();project.getState().updateWallStyles([a.id,b.id],STONE_WALL);expect(useHistoryStore.getState().undoCount).toBe(1);expect((project.getState().objects[1] as typeof b).strokeWidth).toBe(48);history.undo();expect(project.getState().objects).toEqual([a,b]);history.redo();const before=project.getState().objects;expect(()=>project.getState().updateWallStyles([a.id,'missing'],SIMPLE_WALL)).toThrow();expect(project.getState().objects).toEqual(before);expect(()=>project.getState().updateWallStyles([a.id],{...SIMPLE_WALL,strokeWidth:0})).toThrow();expect(project.getState().objects).toEqual(before)})
it('format v6 roundtrips walls and generic paths and rejects walls disguised as v5',()=>{const d=doc([createWall(nodes()),createPath(nodes())]);expect(parseProject(d).objects).toEqual(d.objects);expect(()=>parseProject({...d,formatVersion:5})).toThrow(/wall requires/);const bad=structuredClone(d);bad.objects[0].wall!.outline.width=NaN;expect(()=>parseProject(bad)).toThrow();const textured=createWall(nodes(),false,{...SIMPLE_WALL,stroke:{kind:'texture',assetId:'texture',scale:1,spacing:16,offset:7}});expect(referencedAssets({...d,objects:[textured]})).toEqual(new Set(['texture']))})
it('object list exposes wall type without geometry-driven metadata rerenders',()=>{const p=createWall(nodes()),d=doc([p]),selector=createObjectListSelector(),rows=selector(d);expect(rows[0].kind).toBe('wall');expect(filterObjectRows(rows,{scope:'active',activeLayerId:'objects',type:'wall',query:''},new Map())).toHaveLength(1);expect(selector({...d,objects:[withPathGeometry(p,p.nodes.map(n=>({...n,x:n.x+10})))]})).toBe(rows)})
it('cross-project wall clipboard retains texture bytes, remaps conflicts, and keeps concrete style',async()=>{
  const asset=(hash:string,bytes:string)=>({blob:new Blob([bytes],{type:'image/png'}),manifest:{id:'texture',kind:'fillPattern' as const,fileName:'stone.png',mimeType:'image/png',width:1,height:1,hash:hash.repeat(64),path:'assets/texture.png'}})
  installProjectAssets(new Map([['texture',asset('a','source')]]))
  const wall=createWall(nodes(),false,{...SIMPLE_WALL,stroke:{kind:'texture',assetId:'texture',scale:2,spacing:16,offset:17}})
  project.getState().addPath(wall);editor.setState({selectedObjectIds:[wall.id]});project.getState().copy()
  project.setState({...doc([])});editor.setState({selectedObjectIds:[]});history.reset();installProjectAssets(new Map([['texture',asset('b','destination')]]))
  project.getState().paste();const copy=project.getState().objects[0]
  expect(copy.kind).toBe('path');if(copy.kind!=='path'||copy.stroke.kind!=='texture')throw new Error('Expected textured wall')
  expect(copy.pathKind).toBe('wall');expect(copy.wall).toEqual(wall.wall);expect(copy.stroke.assetId).not.toBe('texture');expect(copy.stroke.offset).toBe(17)
  expect(await(await resolveAsset(copy.stroke.assetId)).blob.text()).toBe('source');expect(await(await resolveAsset('texture')).blob.text()).toBe('destination')
  installProjectAssets(new Map())
})

it.each(['simple','continuous','generated'] as const)('%s separates freehand centerlines from genuine outside boundary admission',kind=>{
 const base=kind==='generated'?generatedWallStyle(SIMPLE_WALL,map):kind==='continuous'?materialStyle({definition:continuousDefinition(),assetId:'atlas'},SIMPLE_WALL):structuredClone(SIMPLE_WALL)
 const outside={...base,strokeWidth:10,wall:{...base.wall,alignment:'outside' as const}},snapshot=JSON.stringify(outside)
 const original=createWall(nodes(),true,outside),drawing=wallDrawingStyle(wallStyle(original))
 expect(drawing.strokeWidth).toBe(10);expect(drawing.wall.alignment).toBeUndefined()
 for(const closed of [false,true]){const normal=createWall(nodes(),closed,drawing);expect(normal.closed).toBe(closed);expect(normal.strokeWidth).toBe(10);expect(validatePath(JSON.parse(JSON.stringify(normal)))).toEqual(JSON.parse(JSON.stringify(normal)))}
 expect(()=>createWall(nodes(),false,outside)).toThrow('Outside walls must be closed')
 for(const width of [.4,513])expect(()=>createWall(nodes(),true,{...outside,strokeWidth:width})).toThrow('Outside walls must be closed')
 expect(JSON.stringify(outside)).toBe(snapshot);expect(validatePath(original)).toEqual(original);expect(original.wall?.alignment).toBe('outside')
})
