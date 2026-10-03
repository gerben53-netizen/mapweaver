import { beforeEach,expect,it } from 'vitest'
import { createScatter,DEFAULT_SCATTER,generateScatter,sampleStroke,validateScatter,withScatterBounds,instanceInArea,expandScatter,remapScatter,SCATTER_LIMITS,scatterDocumentCount } from './scatter'
import { transformSelection } from './selectionTransform'
import { offsetObject,rectangleGeometry } from './areas'
import { parseProject,referencedAssets } from '../projects/format'
import { defaultMapStyle } from './mapSettings'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history,useHistoryStore } from '../store/history'
import { installProjectAssets } from '../projects/assets'
import { beginObjectEdit } from '../store/objectEdits'
import { arrangeObjects } from './arrange'
import { scatterSource } from './scatterSizing'
const sources=[{assetId:'oak',weight:1,width:16,height:24},{assetId:'pine',weight:3,width:12,height:28}]
const stroke={mode:'paint' as const,diameter:200,points:[{x:200,y:200},{x:800,y:200}]}
const fixture=()=>generateScatter({...createScatter(sources,{...DEFAULT_SCATTER,density:20,collision:'allow'},91),strokes:[stroke]})
it('pins engine 1 output so algorithm changes require a deliberate version decision',()=>{
  expect(fixture().instances.slice(0,3).map(i=>({assetId:i.assetId,x:Number(i.x.toFixed(6)),y:Number(i.y.toFixed(6)),rotation:Number(i.rotation.toFixed(6))}))).toEqual([
    {assetId:'pine',x:524.122482,y:170.104792,rotation:38.907735},
    {assetId:'pine',x:648.960376,y:185.291436,rotation:46.094508},
    {assetId:'pine',x:279.913478,y:221.799977,rotation:321.924379},
  ])
})
const manifest=(id:string)=>({id,kind:'stamp' as const,fileName:id+'.png',mimeType:'image/png',width:32,height:32,hash:(id==='oak'?'a':'b').repeat(64),path:`assets/${id}.png`})
beforeEach(()=>{project.setState({map:{width:1200,height:900,...defaultMapStyle(),background:null},objects:[],layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:null});editor.setState({activeLayerId:'objects',selectedObjectIds:[],soloLayerId:null,editingGroupId:null,clipboard:[],clipboardGroups:[]});installProjectAssets(new Map(sources.map(s=>[s.assetId,{manifest:manifest(s.assetId),blob:new Blob(['x'])}])));history.reset()})
it('samples by distance, invariant to redundant pointer event frequency, and reproduces weighted instances',()=>{
  const sparse=[{x:0,y:0},{x:100,y:0},{x:100,y:100}],dense=Array.from({length:11},(_,i)=>({x:i*10,y:0})).concat(Array.from({length:10},(_,i)=>({x:100,y:(i+1)*10})))
  expect(sampleStroke(sparse,12)).toEqual(sampleStroke(dense,12))
  const a=fixture(),b=generateScatter(JSON.parse(JSON.stringify(a)));expect(b.instances).toEqual(a.instances)
  const more=generateScatter({...a,strokes:[{...stroke,points:Array.from({length:61},(_,i)=>({x:200+i*10,y:200}))}]});expect(more.instances).toEqual(a.instances)
  expect(a.instances.filter(i=>i.assetId==='pine').length/a.instances.length).toBeGreaterThan(.65)
  expect(generateScatter({...a,seed:92}).instances).not.toEqual(a.instances)
})
it('enforces center distance and conservative bounds collisions for both strategies',()=>{
  for(const strategy of ['random','even'] as const)for(const collision of ['distance','bounds'] as const){const o=generateScatter({...fixture(),settings:{...DEFAULT_SCATTER,strategy,collision,density:30,spacing:40}});expect(o.instances.length).toBeGreaterThan(5);for(let i=0;i<o.instances.length;i++)for(let j=0;j<i;j++)if(collision==='distance')expect(Math.hypot(o.instances[i].x-o.instances[j].x,o.instances[i].y-o.instances[j].y)).toBeGreaterThanOrEqual(40-1e-8)}
})
it('keeps rotated full stamp rectangles within concave area components and outside holes',()=>{
  const area={polygons:[{outer:rectangleGeometry({x:0,y:0,width:900,height:600}).polygons[0].outer,holes:[rectangleGeometry({x:300,y:200,width:180,height:160}).polygons[0].outer]}]}
  const o=generateScatter({...createScatter(sources,{...DEFAULT_SCATTER,density:15,collision:'allow'},78),area});expect(o.instances.length).toBeGreaterThan(300)
  expect(o.instances.every(i=>instanceInArea(i,area))).toBe(true)
  expect(instanceInArea({assetId:'oak',x:400,y:300,width:500,height:400,rotation:0,scaleX:1,scaleY:1,opacity:1},area)).toBe(false)
})
it('erases only recipe instances, remains erased on same-seed regeneration, and allows later additions',()=>{
  const a=fixture(),erased=generateScatter({...a,strokes:[...a.strokes,{mode:'erase',diameter:240,points:[{x:500,y:200}]}]})
  expect(erased.instances.length).toBeLessThan(a.instances.length);expect(erased.instances.every(i=>Math.hypot(i.x-500,i.y-200)>120)).toBe(true)
  expect(generateScatter(erased).instances).toEqual(erased.instances)
  expect(generateScatter({...erased,strokes:[...erased.strokes,{...stroke,points:[{x:500,y:200}]}]}).instances.length).toBeGreaterThan(erased.instances.length)
})
it('preserves frozen instances, seed and recipe through whole-object transforms and expansion',()=>{
  const a=fixture(),moved=offsetObject(a,42,27),scaled=transformSelection([moved],{scale:2,rotation:35,flipX:true})[0]
  if(scaled.kind!=='scatter')throw Error('scatter expected');expect(scaled.instances).toEqual(a.instances);expect(generateScatter(scaled).instances).toEqual(a.instances)
  const stamps=expandScatter(scaled);expect(stamps).toHaveLength(a.instances.length);expect(stamps[0].width).toBeCloseTo(a.instances[0].width*2);expect(stamps[0].assetId).toBe(a.instances[0].assetId)
  expect(()=>validateScatter({...a,matrix:[1,0,0,2,0,0]})).toThrow(/uniform/)
  const remapped=remapScatter(a,new Map([['oak','birch']]));expect(remapped.sources[0].assetId).toBe('birch');expect(remapped.instances.some(i=>i.assetId==='oak')).toBe(false)
})
it('rejects malformed fields, impossible ranges, source/sample/instance and document budgets',()=>{
  const a=fixture();for(const input of [{...a,seed:-1},{...a,engineVersion:2},{...a,sources:[...a.sources,a.sources[0]]},{...a,settings:{...a.settings,scaleMax:0}},{...a,instances:[{...a.instances[0],assetId:'missing'}]},{...a,x:NaN},{...a,surprise:true},{...a,strokes:[{...stroke,points:Array.from({length:4097},()=>({x:0,y:0}))}]}])expect(()=>validateScatter(input as typeof a)).toThrow()
  const huge={...createScatter(sources,{...DEFAULT_SCATTER,density:100},1),area:rectangleGeometry({x:0,y:0,width:100000,height:100000})};expect(()=>generateScatter(huge)).toThrow(/budget/)
  const full=withScatterBounds({...a,instances:Array.from({length:SCATTER_LIMITS.instances},()=>a.instances[0])});expect(()=>scatterDocumentCount([full,full,full])).toThrow(/10,000/)
})
it('validates multiple stamp references centrally and migrates old documents without changing pixels',()=>{
  const a=fixture(),now=new Date().toISOString(),input={formatVersion:9,id:'scatter-test',name:'Forest',createdAt:now,modifiedAt:now,map:project.getState().map,objects:[a],layers:[{...project.getState().layers[0],objectIds:[a.id]}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:sources.map(a=>manifest(a.assetId))}
  const parsed=parseProject(JSON.parse(JSON.stringify(input)));expect(parsed.objects).toEqual([a]);expect([...referencedAssets(parsed)]).toEqual(['oak','pine'])
  expect(()=>parseProject({...input,assets:input.assets.slice(0,1)})).toThrow(/asset/)
  expect(()=>parseProject({...input,assets:input.assets.map(a=>({...a,kind:'fillPattern'}))})).toThrow(/kind/)
  expect(()=>parseProject({...input,formatVersion:8})).toThrow(/v9/)
  expect(parseProject({...input,formatVersion:8,objects:[],assets:[],layers:[project.getState().layers[0]]})).toMatchObject({formatVersion:12,objects:[],map:input.map})
})
it('commits each stroke/erase/expand as one action with exact undo and group membership',()=>{
  const a=fixture();project.getState().commitScatter(a);expect(useHistoryStore.getState().undoCount).toBe(1)
  const b=generateScatter({...a,strokes:[...a.strokes,{mode:'erase',diameter:300,points:[{x:300,y:200}]}]});project.getState().commitScatter(b,a);expect(useHistoryStore.getState().undoCount).toBe(2)
  history.undo();expect(project.getState().objects).toEqual([a]);history.redo();expect(project.getState().objects).toEqual([b])
  project.getState().expandScatter(b.id);expect(project.getState().objects.every(o=>o.kind==='stamp')).toBe(true);history.undo();expect(project.getState().objects).toEqual([b])
  editor.setState({selectedObjectIds:[b.id]});project.getState().duplicate();expect(project.getState().objects).toHaveLength(2);project.getState().copy();project.getState().paste();expect(project.getState().objects).toHaveLength(3)
  project.setState({layers:project.getState().layers.map(l=>({...l,locked:true}))});expect(()=>project.getState().commitScatter(b,b)).toThrow(/locked/)
})
it('uses the original gesture snapshot for repeated rotation previews and cancels exactly',()=>{
  const a=fixture();project.getState().commitScatter(a);history.reset();const edit=beginObjectEdit(a.id)!
  edit.preview({...a,rotation:30});edit.preview({...a,rotation:60});edit.preview({...a,rotation:30});const once=project.getState().objects[0];edit.cancel();expect(project.getState().objects[0]).toEqual(a)
  const next=beginObjectEdit(a.id)!;next.preview({...a,rotation:30});expect(project.getState().objects[0]).toEqual(once);next.finish();expect(useHistoryStore.getState().undoCount).toBe(1);history.undo();expect(project.getState().objects[0]).toEqual(a)
})
it('refuses nonuniform arrangement and captures grid defaults only on explicit sizing',()=>{
  const o=fixture(),stamp={kind:'stamp' as const,id:'target',assetId:'oak',x:0,y:0,width:100,height:100,rotation:0,scaleX:1,scaleY:1,opacity:1}
  expect(()=>arrangeObjects([stamp,o],'same-size',project.getState().map)).toThrow(/uniform/)
  const sized=arrangeObjects([stamp,o],'same-width',project.getState().map)[1];expect(sized.width).toBeCloseTo(100);if(sized.kind==='scatter')expect(validateScatter(sized)).toBe(sized)
  const asset={kind:'stamp' as const,id:'tree',name:'Tree',mimeType:'image/png',naturalWidth:40,naturalHeight:80,categoryId:'trees',createdAt:'',contentHash:'a',sizing:{sizingMode:'grid' as const,defaultWidth:2,defaultHeight:5,sizingUnit:'cells' as const,sizingScope:'battlemap' as const,aspectRatioLocked:true}}
  const first=scatterSource(asset,project.getState().map);expect(first.width).toBe(project.getState().map.grid.cellSize*2);expect(first.height/first.width).toBe(2)
  expect(scatterSource({...asset,sizing:{...asset.sizing,defaultWidth:null,defaultHeight:6}},project.getState().map).width).toBe(project.getState().map.grid.cellSize*3)
  asset.sizing.defaultWidth=3;expect(first.width).not.toBe(scatterSource(asset,project.getState().map).width)
})
it('honors falloff, bounded rotation/opacity/flips, ordering and low density',()=>{
  const base={...createScatter([{assetId:'oak',weight:1,width:8,height:12}],{...DEFAULT_SCATTER,density:100,collision:'allow',rotationMin:20,rotationMax:40,opacityMin:.2,opacityMax:.6,flipX:true,flipY:true},228),strokes:[{mode:'paint' as const,diameter:300,points:[{x:500,y:500}]}]}
  const center=generateScatter({...base,settings:{...base.settings,falloff:'center'}}),edge=generateScatter({...base,settings:{...base.settings,falloff:'edge'}}),radius=(o:typeof center)=>o.instances.reduce((s,i)=>s+Math.hypot(i.x-500,i.y-500),0)/o.instances.length
  expect(radius(center)).toBeLessThan(radius(edge));expect(center.instances.every(i=>i.rotation>=20&&i.rotation<=40&&i.opacity>=.2&&i.opacity<=.6)).toBe(true);expect(center.instances.some(i=>i.scaleX===-1&&i.scaleY===-1)).toBe(true)
  const sorted=generateScatter({...base,settings:{...base.settings,order:'size'}});for(let i=1;i<sorted.instances.length;i++)expect(sorted.instances[i].width*sorted.instances[i].height).toBeLessThanOrEqual(sorted.instances[i-1].width*sorted.instances[i-1].height)
  const low=generateScatter({...base,settings:{...base.settings,density:.01}});expect(low.instances.length).toBeLessThan(2)
})

it('round-trips explicit rotation recipes and undoes/redoes a rotation edit exactly',()=>{
 const a=fixture();project.getState().commitScatter(a);history.reset()
 const b=generateScatter({...a,sources:a.sources.map((s,i)=>({...s,rotation:i?15:-10})),settings:{...a.settings,rotationMode:'range',rotationMin:-15,rotationMax:15}})
 project.getState().commitScatter(b,a);expect(useHistoryStore.getState().undoCount).toBe(1)
 history.undo();expect(project.getState().objects).toEqual([a]);history.redo();expect(project.getState().objects).toEqual([b])
 const now=new Date().toISOString(),doc={formatVersion:9,id:'rotation-test',name:'Rotation',createdAt:now,modifiedAt:now,map:project.getState().map,objects:[b],layers:project.getState().layers,objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:sources.map(s=>manifest(s.assetId))}
 expect(parseProject(JSON.parse(JSON.stringify(doc))).objects).toEqual([b])
})
