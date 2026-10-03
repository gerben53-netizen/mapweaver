import 'fake-indexeddb/auto'
import { beforeEach,expect,it } from 'vitest'
import { createPlace,createLabel,createLegend,createCompass,DEFAULT_TEXT,validateAnnotation,reconcileLabels,restyleLabel,textLayout,textWidth,avoidOverlaps,legendEntries,annotationBudget } from './annotations'
import type { LabelObject,PlaceObject } from './annotations'
import type { MapObject } from './models'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { transformSelection } from './selectionTransform'
import { parseProject } from '../projects/format'
import { objectAssetIds } from './areas'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history,useHistoryStore } from '../store/history'
import { gatherProject } from '../projects/archive'
import { RecoveryRepository } from '../projects/recoveryRepository'
import { LibraryDatabase } from '../storage/database'
const map={width:1200,height:800,...defaultMapStyle(),background:null,mapType:'regional-map' as const,geography:defaultGeography('regional-map')}
const pair=()=>{const p=createPlace({x:300,y:300},'Harbor','city',map);return [p,createLabel({x:0,y:0},p.name,p)] as const}
const document=(objects:MapObject[])=>({formatVersion:12,id:'annotations',name:'Annotations',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects,layers:[{id:'objects',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
beforeEach(()=>{project.setState({...document([])});editor.setState({activeTool:'select',activeLayerId:'objects',soloLayerId:null,selectedObjectIds:[],editingGroupId:null,clipboard:[],clipboardGroups:[]});history.reset()})
it('strictly validates every type, links and format without accepting arbitrary fonts or HTML',()=>{
  const [p,l]=pair(),objects=[p,l,createLegend({x:500,y:500},legendEntries([p])),createCompass({x:800,y:200})]
  expect(parseProject(document(objects)).objects).toEqual(objects)
  expect(()=>parseProject({...document(objects),formatVersion:11})).toThrow(/12/)
  expect(()=>validateAnnotation({...p,note:'a'.repeat(1025)})).toThrow()
  expect(()=>validateAnnotation({...l,style:{...l.style,font:'remote-url'} as never})).toThrow(/font/)
  expect(()=>validateAnnotation({...l,text:'a'.repeat(2049)})).toThrow()
  expect(()=>reconcileLabels([l])).toThrow(/owner/)
  expect(()=>reconcileLabels([p,{...l,ownerId:l.id}])).toThrow(/owner/)
  expect(()=>parseProject(document([p,{...l,x:l.x+1}]))).toThrow(/offset/)
  expect(createLabel({x:0,y:0},'<script>alert(1)</script>').text).toContain('<script>') // Plain text, never markup.
  expect(()=>annotationBudget(Array.from({length:2001},()=>({...l})))).toThrow(/2,000/)
})
it('wraps words, multiline and long tokens deterministically using bundled metrics and style-aware cache',()=>{
  const style={...DEFAULT_TEXT,maxWidth:70},text='Harbor city\nAveryverylongword'
  const layout=textLayout(text,style);expect(layout.lines.length).toBeGreaterThan(3)
  expect(layout.lines.every(line=>textWidth(line,style)<=70)).toBe(true)
  expect(textLayout(text,style)).toBe(layout)
  expect(textLayout(text,{...style,bold:true})).not.toBe(layout)
  expect(textWidth('🗺',style)).toBe(textWidth('?',style))
  expect(validateAnnotation(restyleLabel(createLabel({x:0,y:0},text),style))).toBeTruthy()
})
it('places both objects as one transaction, follows owners, independently drags and restores exact offsets',()=>{
  const [p,l]=pair();project.getState().addAnnotations([p,l]);expect(useHistoryStore.getState().undoCount).toBe(1)
  history.run('Move',()=>project.getState().translate([p],{x:40,y:20}));const moved=project.getState().objects[1] as LabelObject
  expect(moved.x).toBe(l.x+40);expect(moved.offset).toEqual(l.offset)
  history.run('Drag label',()=>{project.getState().translate([moved],{x:12,y:10});project.getState().translate([moved],{x:12,y:10})});expect((project.getState().objects[1] as LabelObject).offset.x).toBe(l.offset.x+12)
  history.undo();history.undo();expect(project.getState().objects).toEqual([p,l]);history.undo();expect(project.getState().objects).toEqual([]);history.redo();expect(project.getState().objects).toEqual([p,l])
})
it('copies complete owner relations, detaches label-only copies and remaps duplicate IDs',()=>{
  const [p,l]=pair();project.getState().addAnnotations([p,l]);editor.setState({selectedObjectIds:[p.id]});project.getState().copy();expect(editor.getState().clipboard).toHaveLength(2);project.getState().paste()
  const pasted=project.getState().objects.slice(2);expect((pasted[1] as LabelObject).ownerId).toBe(pasted[0].id);expect(pasted[1].x).toBe(l.x+24)
  editor.setState({selectedObjectIds:[l.id]});project.getState().copy();project.getState().paste();expect((project.getState().objects.at(-1) as LabelObject).ownerId).toBeUndefined()
  editor.setState({selectedObjectIds:[p.id]});project.getState().duplicate();expect((project.getState().objects.at(-1) as LabelObject).ownerId).toBe(project.getState().objects.at(-2)?.id)
})
it('blocks locked linked moves and confirms relation deletion with undo',()=>{
  const [p,l]=pair();project.getState().addAnnotations([p,{...l,locked:true}]);history.run('Move',()=>project.getState().translate([p],{x:10,y:10}));expect(project.getState().objects[0]).toEqual(p)
  project.getState().changeObject(l.id,{locked:false});editor.setState({selectedObjectIds:[p.id]});project.getState().deleteSelection();expect(editor.getState().deleteOpeningIds).toHaveLength(2);expect(project.getState().objects).toHaveLength(2)
  project.getState().deleteSelection(editor.getState().deleteOpeningIds!);expect(project.getState().objects).toHaveLength(0);history.undo();expect(project.getState().objects).toHaveLength(2)
})
it('group transforms scale real label layout and preserve relationship offsets through save',()=>{
  const [p,l]=pair();project.getState().addAnnotations([p,l]);editor.setState({selectedObjectIds:[p.id]});project.getState().transformSelected({scale:2,rotation:90,dx:40})
  const next=project.getState().objects;expect((next[1] as LabelObject).layoutScale).toBe(2);expect(parseProject(document(next)).objects).toEqual(next);history.undo();expect(project.getState().objects).toEqual([p,l])
  expect((transformSelection([l],{scale:2})[0] as LabelObject).width).toBe(l.width*2)
})
it('world sizing reuses asset defaults while cartographic size ignores physical distance',()=>{
  const asset={id:'a',kind:'stamp' as const,name:'Town',mimeType:'image/png',naturalWidth:80,naturalHeight:40,categoryId:'',createdAt:'',contentHash:'',sizing:{sizingMode:'world' as const,defaultWidth:10000,defaultHeight:null,sizingUnit:'m' as const,sizingScope:'any' as const,aspectRatioLocked:true}}
  const world=createPlace({x:0,y:0},'A','town',map,asset,'world'),fixed=createPlace({x:0,y:0},'A','town',map,asset)
  expect(world.width).toBeCloseTo(12);expect(fixed.width).toBe(28);expect(world.height).toBeCloseTo(6)
  expect(createPlace({x:0,y:0},'A','town',{...map,geography:{...map.geography,widthKm:2000}},asset).width).toBe(fixed.width)
})
it('bounded overlap preview is deterministic and does not mutate or silently commit',()=>{
  const labels=Array.from({length:20},(_,i)=>({...createLabel({x:100,y:100},'City'),id:'label-'+i}));const before=structuredClone(labels)
  const preview=avoidOverlaps(labels,labels.map(o=>o.id));expect(labels).toEqual(before);expect(preview).toEqual(avoidOverlaps(labels,labels.map(o=>o.id)));expect(preview.some(o=>o.x!==100-o.width/2)).toBe(true)
  expect(()=>avoidOverlaps(Array.from({length:101},(_,i)=>({...labels[0],id:String(i)})),Array.from({length:101},(_,i)=>String(i)))).toThrow(/100/)
})
it('legend refresh snapshots symbols and never mutates prior entries; compass is ordinary artwork',()=>{
  const [p]=pair(),entries=legendEntries([p,{...p,id:'b'},{...p,id:'c',placeType:'village'}]),legend=createLegend({x:0,y:0},entries)
  expect(entries).toHaveLength(2);legendEntries([{...p,placeType:'ruin'}]);expect(legend.entries).toEqual(entries)
  expect(objectAssetIds({...legend,entries:[{...entries[0],assetId:'symbol'}]})).toEqual(['symbol'])
  expect(validateAnnotation({...createCompass({x:40,y:80}),rotation:90,opacity:.5})).toMatchObject({rotation:90})
})
it('moves a selected linked label together with its owner and supports groups and arrangement',()=>{
 const [p,l]=pair();project.getState().addAnnotations([p,l]);project.getState().addLayer();const target=project.getState().layers[0].id
 editor.setState({selectedObjectIds:[l.id]});project.getState().moveSelection(target);expect(project.getState().layers[0].objectIds).toEqual([p.id,l.id])
 editor.setState({selectedObjectIds:[p.id,l.id]});project.getState().groupSelected();expect(project.getState().objectGroups[0].objectIds).toEqual([p.id,l.id]);project.getState().arrange('map-x');expect(parseProject(document(project.getState().objects)).objects).toHaveLength(2)
})
it('supports bulk style as one reversible command and storage gathering refuses missing symbols',async()=>{
  const [p,l]=pair(),other=createLabel({x:20,y:20},'Region');project.getState().addAnnotations([p,l,other]);project.getState().updateAnnotations([l,other].map(o=>restyleLabel(o,{...o.style,bold:true,maxWidth:90})));expect((project.getState().objects[1] as LabelObject).style.bold).toBe(true);history.undo();expect(project.getState().objects).toEqual([p,l,other])
  const doc=document([{...p,assetId:'missing'} as PlaceObject]);await expect(gatherProject(doc,doc)).rejects.toThrow(/required assets/)
})

it('roundtrips editable text and owner links through the recovery buffer',async()=>{
 const db=new LibraryDatabase('annotations-'+crypto.randomUUID()),repository=new RecoveryRepository(db),[p,l]=pair(),doc=parseProject(document([p,l]))
 try{await repository.save({document:doc,assets:new Map()},null);expect((await repository.read(doc.id)).document).toEqual(doc)}finally{await db.delete()}
})
