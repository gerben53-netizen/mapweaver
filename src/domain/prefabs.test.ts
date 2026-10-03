import { expect, it } from 'vitest'
import { captureSource, placePrefab, remapComposition, transformComposition, validatePrefab, prefabScale } from './prefabs'
import type { Prefab } from './prefabs'
import { createWall } from './walls'
import { deriveOpening } from './openings'
import { createArea, rectangleGeometry } from './areas'
import { createLabel } from './annotations'
import { DEFAULT_GRID } from './mapSettings'
import { mapWorkspace } from './geography'
import { parseProject } from '../projects/format'
import { projectObjects } from './projectView'
import { alphaBounds } from '../library/prefabRender'
import { useProjectStore } from '../store/projectStore'
import { history } from '../store/history'

export function composition() {
  const wall = createWall([{id:'n1',x:100,y:100,mode:'corner',junction:'wall'},{id:'n2',x:500,y:100,mode:'corner'}])
  wall.id='wall'; wall.pathKind='wall';wall.wall={unit:'px',pixelsPerUnit:1,flip:false,outline:{enabled:true,color:'#000000',width:2,opacity:1}}
  const door=deriveOpening({kind:'door',id:'door',wallId:'wall',position:.3,openingWidth:40,unit:'px',pixelsPerUnit:1,side:1,flip:false,rotation:0,scaleX:1,scaleY:1,x:0,y:0,width:1,height:1,opacity:1,doorType:'single',status:'closed'},wall)
  const window=deriveOpening({...door,id:'window',position:.7,kind:'window',windowType:'simple'},wall)
  delete (window as unknown as Record<string,unknown>).doorType;delete (window as unknown as Record<string,unknown>).status
  const floor=createArea(rectangleGeometry({x:100,y:120,width:400,height:300}));floor.id='floor';floor.roomSource={wallIds:['wall'],fingerprint:'abc',seed:{x:200,y:200}}
  const label=createLabel({x:0,y:0},'House',floor);label.id='label'
  const objects=[floor,wall,door,window,label]
  const map={width:1200,height:900,background:null,backgroundColor:'#ffffff',grid:{...DEFAULT_GRID},...mapWorkspace({})}
  const document=parseProject({formatVersion:12,id:'fixture',name:'House',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects,layers:[{id:'layer',name:'House',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[{id:'group',layerId:'layer',name:'Assembly',visible:true,locked:false,objectIds:['wall','door','window']}],layerTree:{roots:['parent'],groups:[{id:'parent',name:'Parent',visible:true,locked:false,children:['layer']}]},assets:[]})
  return document
}
function prefab():Prefab { const document=composition();return validatePrefab({formatVersion:1,mode:'editable',bounds:{x:0,y:0,width:600,height:500},visibleBounds:{x:0,y:0,width:600,height:500},anchor:{x:300,y:250},sourceMap:document.map,document,renderScale:1}) }
it('deduplicates descendants and counts hidden/locked content without selecting missing sources',()=>{
 const d=composition();d.layerTree!.groups.push({id:'outer',name:'Outer',visible:true,locked:true,children:['parent']});d.layerTree!.roots=['outer']
 const c=captureSource(d,{kind:'layerGroup',ids:['outer','parent']});expect(c.content.objects).toHaveLength(5);expect(c.locked).toBe(5)
 d.layers[0].visible=false;expect(()=>captureSource(d,{kind:'layer',ids:['layer']})).toThrow('no included');expect(captureSource(d,{kind:'layer',ids:['layer']},true).content.objects).toHaveLength(5)
 expect(()=>captureSource(d,{kind:'layer',ids:['missing']},true)).toThrow('no longer exists')
})
it('requires explicit finite dependency closure for doors, windows, rooms and labels',()=>{
 const d=composition();expect(captureSource(d,{kind:'selection',ids:['door']}).unresolved).toEqual(['wall'])
 expect(captureSource(d,{kind:'selection',ids:['label']},false,true).added).toEqual(['floor','wall'])
 const p=prefab();p.document.objects=p.document.objects.filter(o=>o.id!=='wall');expect(()=>validatePrefab(p)).toThrow()
})
it('detaches only optional external links after explicit choice, preserving independent poses',()=>{
 const d=composition(),source=JSON.stringify(d)
 const detached=captureSource(d,{kind:'selection',ids:['label','floor']},false,false,true)
 expect(detached.unresolved).toEqual([])
 expect(detached.content.objects.find(o=>o.kind==='area')).not.toHaveProperty('roomSource')
 const labelOnly=captureSource(d,{kind:'selection',ids:['label']},false,false,true)
 expect(labelOnly.content.objects[0]).not.toHaveProperty('ownerId')
 expect(labelOnly.content.objects[0]).toMatchObject({x:d.objects[4].x,y:d.objects[4].y,leader:false})
 expect(captureSource(d,{kind:'selection',ids:['door']},false,false,true).unresolved).toEqual(['wall'])
 expect(JSON.stringify(d)).toBe(source)
})
it('bakes inherited hidden and locked flags when placing on the active layer',()=>{
 const p=prefab();p.document.layerTree!.groups[0].visible=false;p.document.layerTree!.groups[0].locked=true
 const target=composition();target.objects=[];target.layers[0].objectIds=[];target.objectGroups=[]
 const placed=placePrefab(p,target,p.anchor,1,0,'active','layer')
 expect(placed.document.objects.every(o=>o.visible===false&&o.locked===true)).toBe(true)
 expect(projectObjects(placed.document,true)).toHaveLength(0)
})
it('keeps flattened crop offset and anchor independent of raster resolution',()=>{
 const p=prefab(),d=p.document
 d.objects=[{kind:'stamp',id:'image',assetId:'raster',x:-10,y:20,width:620,height:440,rotation:0,scaleX:1,scaleY:1,opacity:1}]
 d.assets=[{id:'raster',kind:'stamp',fileName:'render.png',mimeType:'image/png',width:1240,height:880,hash:'a'.repeat(64),path:`assets/${'a'.repeat(64)}.png`}]
 d.layers[0].objectIds=['image'];d.objectGroups=[]
 p.mode='flattened';p.renderScale=2;p.visibleBounds={x:-10,y:20,width:620,height:440}
 const native=prefabScale(p,{mode:'native',lockAspectRatio:true},p.sourceMap,[])
 const at=transformComposition(validatePrefab(p).document.objects,p.anchor,{x:1000,y:800},native.scale,0)[0]
 expect(at).toMatchObject({x:690,y:570,width:620,height:440})
})
it('normalizes baked group poses once and transforms labels, room seeds and wall widths around the anchor',()=>{
 const d=composition(),first=transformComposition(d.objects,{x:100,y:100},{x:0,y:0},2,90)
 const path=first.find(o=>o.kind==='path')!;expect(path.kind==='path'&&path.nodes[0].x).toBeCloseTo(0);expect(path.kind==='path'&&path.nodes[1].y).toBeCloseTo(800)
 expect(path.kind==='path'&&path.strokeWidth).toBe(d.objects.find(o=>o.kind==='path')!.strokeWidth*2)
 const back=transformComposition(first,{x:0,y:0},{x:100,y:100},.5,-90)
 for(let i=0;i<back.length;i++){expect(back[i].x).toBeCloseTo(d.objects[i].x);expect(back[i].y).toBeCloseTo(d.objects[i].y)}
 const floor=back.find(o=>o.kind==='area')!;expect(floor.kind==='area'&&floor.roomSource!.seed.x).toBeCloseTo(200)
})
it('remaps object, node, junction, group and tree identities together',()=>{
 const d=composition(),copy=remapComposition(d);expect(copy.objects.every(o=>!d.objects.some(s=>s.id===o.id))).toBe(true)
 const wall=copy.objects.find(o=>o.kind==='path')!;expect(copy.objects.find(o=>o.kind==='door')).toMatchObject({wallId:wall.id})
 expect(wall.kind==='path'&&wall.nodes[0].junction).toBe(wall.id)
 expect(copy.objectGroups![0].objectIds).toContain(wall.id)
 const floor=copy.objects.find(o=>o.kind==='area')!;expect(floor.kind==='area'&&floor.roomSource!.wallIds).toEqual([wall.id])
 expect(copy.objects.find(o=>o.kind==='label')).toMatchObject({ownerId:floor.id})
})
it('preserves paint order/visibility when flattening layers and places independent copies in one history entry',()=>{
 const p=prefab(),current=composition();current.objects=[];current.layers[0].objectIds=[];current.objectGroups=[]
 const active=placePrefab(p,current,p.anchor,1,0,'active','layer'),internal=placePrefab(p,current,p.anchor,1,0,'layers','layer')
 expect(active.document.layers).toHaveLength(1);expect(internal.document.layers).toHaveLength(2)
 expect(projectObjects(active.document).map(o=>o.kind)).toEqual(projectObjects(p.document).map(o=>o.kind))
 useProjectStore.setState({map:current.map,objects:[],layers:current.layers,objectGroups:[],layerTree:current.layerTree!});history.reset()
 const before=JSON.stringify(useProjectStore.getState().layers)
 history.run('Place prefab',()=>useProjectStore.setState({objects:internal.document.objects,layers:internal.document.layers,objectGroups:internal.document.objectGroups!,layerTree:internal.document.layerTree!}))
 expect(history.undo()).toBe(true);expect(useProjectStore.getState().objects).toHaveLength(0);expect(JSON.stringify(useProjectStore.getState().layers)).toBe(before)
 expect(history.redo()).toBe(true);expect(useProjectStore.getState().objects).toEqual(internal.document.objects)
})
it('uses native composition size, explicit grid/world conversion and refuses nonuniform scale',()=>{
 const p=prefab(),m=p.sourceMap
 expect(prefabScale(p,{mode:'native',lockAspectRatio:true},m,[]).scale).toBe(1)
 expect(prefabScale(p,{mode:'grid',width:12,unit:'cells',lockAspectRatio:true},{...m,grid:{...m.grid,cellSize:100}},[]).scale).toBe(2)
 expect(prefabScale(p,{mode:'world',width:12,unit:'m',lockAspectRatio:true},m,[]).reason).toContain('physical')
 expect(()=>prefabScale(p,{mode:'grid',width:12,height:1,unit:'cells',lockAspectRatio:false},m,[])).toThrow('uniform')
})
it('rejects unknown versions, cycles and oversized payloads',()=>{
 expect(()=>validatePrefab({...prefab(),formatVersion:2})).toThrow('version')
 const p=prefab();p.document.layerTree!.groups[0].children=['parent'];expect(()=>validatePrefab(p)).toThrow()
 expect(()=>validatePrefab({...prefab(),document:{...composition(),objects:Array.from({length:2001},()=>composition().objects[0])}})).toThrow()
})
it('alpha crops with safe padding, rejects empty pixels and reports render edges',()=>{
 const data=new Uint8ClampedArray(10*10*4);data[(4*10+5)*4+3]=1
 expect(alphaBounds(data,10,10)).toMatchObject({x:3,y:2,width:5,height:5,touchesEdge:false})
 expect(()=>alphaBounds(new Uint8ClampedArray(400),10,10)).toThrow('transparent')
 data[3]=255;expect(alphaBounds(data,10,10).touchesEdge).toBe(true)
})
