import {beforeEach,expect,it,vi} from 'vitest'
import {markerDefaults,markerIcons,markerWidth,prioritizedMarkerTypes,PROMINENCE,validateMarker} from './markerRegistry'
import {createMarkerBundle} from './markers'
import {createPlace,createLabel,validateAnnotation} from './annotations'
import type {PlaceObject,LabelObject} from './annotations'
import {defaultMapStyle} from './mapSettings'
import {defaultGeography} from './geography'
import type {MapType} from './geography'
import {parseProject} from '../projects/format'
import {useProjectStore as project} from '../store/projectStore'
import {useEditorStore as editor} from '../store/editorStore'
import {history} from '../store/history'
import {paintAnnotation} from '../canvas/drawAnnotation'
const map={width:1200,height:800,background:null,...defaultMapStyle(),mapType:'regional-map' as const,geography:defaultGeography()}
const doc=(objects:ReturnType<typeof createMarkerBundle>)=>({formatVersion:12,id:'markers',name:'Markers',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects,layers:[{id:'objects',name:'Markers',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
beforeEach(()=>{project.setState(doc([]));editor.setState({...editor.getInitialState(),activeLayerId:'objects'});history.reset()})
it.each(['battlemap','regional-map','world-map'] as MapType[])('uses prioritized semantic, label, style and scale defaults for %s',type=>{
 const choice=markerDefaults(type),objects=createMarkerBundle({x:100,y:100},choice,{...map,mapType:type})
 expect(choice.type).toBe(prioritizedMarkerTypes(type)[0][0]);expect(choice.label).toBe(type!=='battlemap')
 expect(choice.marker.style).toBe(type==='battlemap'?'minimal':type==='regional-map'?'classic':'ornate')
 expect(objects[0].width).toBe(markerWidth(type,choice.marker.prominence));expect(objects[0]).toHaveProperty('pixelsPerKm');expect(markerIcons(choice.type).some(i=>i.id===choice.marker.iconId)).toBe(true)
})
it('roundtrips new markers and linked labels without storing wizard state; rejects bad registry data',()=>{
 const bundle=createMarkerBundle({x:100,y:100},markerDefaults('regional-map'),map)
 expect(parseProject(JSON.parse(JSON.stringify(doc(bundle)))).objects).toEqual(bundle)
 expect(bundle[1]).toMatchObject({ownerId:bundle[0].id,markerName:true,style:{backgroundOpacity:0}})
 expect(()=>validateAnnotation({...bundle[0],marker:null} as never)).toThrow()
 const m=markerDefaults().marker;expect(()=>validateMarker({...m,version:2} as never,'poi')).toThrow();expect(()=>validateMarker({...m,iconId:'remote.svg'},'poi')).toThrow();expect(()=>validateMarker({...m,ink:'url(http://example.com)'},'poi')).toThrow()
 expect(Object.values(PROMINENCE).map(p=>p.importance)).toEqual([0,1,3,5])
})
it('preserves legacy arbitrary types, exact size, metadata and custom assets without adding defaults',()=>{
 const old={...createPlace({x:100,y:100},'Legacy','bespoke',map),width:73,height:41,note:'Old note',tags:['old'],importance:2,assetId:'custom'}
 expect(validateAnnotation(JSON.parse(JSON.stringify(old)))).toEqual(old)
 const ctx={save:vi.fn(),restore:vi.fn(),drawImage:vi.fn(),globalAlpha:1} as unknown as CanvasRenderingContext2D,image={} as CanvasImageSource
 paintAnnotation(ctx,old,new Map([['custom',image]]));expect(ctx.drawImage).toHaveBeenCalledWith(image,0,0,73,41)
})
it('edits name, style and label visibility atomically, follows movement and preserves undo/redo and z-order',()=>{
 const [p,l]=createMarkerBundle({x:300,y:300},markerDefaults('regional-map'),map) as [PlaceObject,LabelObject]
 const unrelated=createLabel({x:700,y:400},'Independent');project.getState().addAnnotations([p,l,unrelated]);const order=project.getState().layers[1]?.objectIds??project.getState().layers[0].objectIds
 project.getState().editMarker({...p,name:'New city'},l,true)
 expect(project.getState().objects.find(o=>o.id===l.id)).toMatchObject({text:'New city',ownerId:p.id});expect(project.getState().layers[0].objectIds).toEqual(order)
 history.undo();expect(project.getState().objects).toEqual([p,l,unrelated]);history.redo()
 const next=project.getState().objects.find(o=>o.id===p.id) as PlaceObject
 project.getState().editMarker(next,null,false);expect(project.getState().objects.some(o=>o.id===l.id)).toBe(false);history.undo();expect(project.getState().objects.some(o=>o.id===l.id)).toBe(true)
 history.run('Move',()=>project.getState().translate([next],{x:20,y:10}));expect(project.getState().objects.find(o=>o.id===l.id)?.x).toBe(l.x+20)
})
it('preserves manually overridden and legacy linked label text when owner is renamed',()=>{
 const p=createPlace({x:200,y:200},'Owner','city',map),l=createLabel({x:0,y:0},'Custom words',p)
 project.getState().addAnnotations([p,l]);project.getState().updateAnnotations([{...p,name:'Renamed'}]);expect(project.getState().objects[1]).toMatchObject({text:'Custom words'})
})

it('keeps the symbol-to-label gap when automatic names wrap or prominence resizes the symbol',()=>{
 const [p,l]=createMarkerBundle({x:300,y:300},markerDefaults('regional-map'),map) as [PlaceObject,LabelObject]
 project.getState().addAnnotations([p,l]);const name='A very long city name that wraps across several lines'
 project.getState().updateAnnotations([{...p,name}]);let label=project.getState().objects[1] as LabelObject
 expect(label.height).toBeGreaterThan(l.height);expect(label.y).toBeCloseTo(p.y+p.height+8)
 project.getState().editMarker({...p,name,width:p.width*2,height:p.height*2},label,true);label=project.getState().objects[1] as LabelObject
 expect(label.y).toBeCloseTo(p.y+p.height*2+8)
 history.undo();expect(project.getState().objects[1].y).toBeCloseTo(p.y+p.height+8)
})
