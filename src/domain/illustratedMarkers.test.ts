import {beforeEach,expect,it,vi} from 'vitest'
import {markerCandidates,validateMarkerAssetTags,illustratedWidthKm,illustrateMarker,symbolizeMarker} from './illustratedMarkers'
import type {IllustratedCandidate} from './illustratedMarkers'
import {markerDefaults} from './markerRegistry'
import {createMarkerBundle} from './markers'
import {validateAnnotation} from './annotations'
import type {PlaceObject,LabelObject} from './annotations'
import {defaultMapStyle} from './mapSettings'
import {defaultGeography} from './geography'
import {installProjectAssets} from '../projects/assets'
import {useProjectStore as project} from '../store/projectStore'
import {useEditorStore as editor} from '../store/editorStore'
import {history} from '../store/history'
import {parseProject} from '../projects/format'
import {paintAnnotation} from '../canvas/drawAnnotation'
import {generateAutomaticLabels,AUTO_LABEL_DEFAULTS} from './automaticLabels'
import {parseAssetManifest} from './assetManifest'
const map={...defaultMapStyle(),background:null,width:2000,height:1200,mapType:'world-map' as const,geography:{...defaultGeography('world-map'),widthKm:10000}}
const resource={id:'art',kind:'stamp' as const,fileName:'City.png',mimeType:'image/png',width:400,height:300,hash:'a'.repeat(64),path:'assets/city.png'}
const snapshot=(objects:ReturnType<typeof createMarkerBundle>)=>({map,objects,layers:[{id:'places',name:'Places',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['places'],groups:[]}})
const bundle=()=>createMarkerBundle({x:600,y:500},{...markerDefaults('world-map','city'),illustration:{assetId:'art',aspect:4/3,widthKm:300}},map)
beforeEach(()=>{installProjectAssets(new Map([['art',{manifest:resource,blob:new Blob(['image'])}]]));project.setState(snapshot([]));editor.setState({...editor.getInitialState(),activeLayerId:'places'});history.reset()})
it('preserves absent visual metadata and rejects mixed or missing representations',()=>{
 const old=createMarkerBundle({x:600,y:500},markerDefaults('world-map'),map)[0] as PlaceObject
 expect(validateAnnotation(structuredClone(old))).toEqual(old);expect(old).not.toHaveProperty('visualMode')
 expect(()=>validateAnnotation({...old,assetId:'art'})).toThrow(/Symbol/)
 expect(()=>validateAnnotation({...old,visualMode:'illustrated'})).toThrow(/missing/)
 expect(()=>validateAnnotation({...old,visualMode:'bad'} as never)).toThrow()
})
it('roundtrips one illustrated Place and one linked name with an ordinary shared asset reference',()=>{
 const objects=bundle(),document={...snapshot(objects),formatVersion:12,id:'example',name:'Example',createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z',assets:[resource]}
 expect(parseProject(JSON.parse(JSON.stringify(document))).objects).toEqual(objects)
 expect(objects[0]).toMatchObject({kind:'place',visualMode:'illustrated',assetId:'art',sizeMode:'world',width:60,height:45,pixelsPerKm:.2})
 expect(objects[1]).toMatchObject({ownerId:objects[0].id,markerName:true})
 expect(generateAutomaticLabels(snapshot(objects),AUTO_LABEL_DEFAULTS).labels).toHaveLength(0)
 expect(()=>parseProject({...document,assets:[]})).toThrow()
})
it('keeps semantic identity and anchor when switching; physical size is independent of viewport',()=>{
 const p={...bundle()[0],note:'A city',tags:['trade']} as PlaceObject,center={x:p.x+p.width*.5,y:p.y+p.height*.5}
 const symbol=symbolizeMarker(p,map),again=illustrateMarker(symbol,{assetId:'art',widthKm:300,aspect:4/3},map)
 expect(symbol.assetId).toBeUndefined();expect(symbol.visualMode).toBe('symbol')
 expect(again).toMatchObject({id:p.id,name:p.name,note:p.note,tags:p.tags,importance:p.importance,width:60,height:45})
 expect({x:again.x+again.width*.5,y:again.y+again.height*.5}).toEqual(center)
 expect(()=>illustrateMarker(p,{assetId:'art',widthKm:NaN,aspect:1},map)).toThrow()
})
it('orders capital, city, town and village defaults, with explicit prominence scaling',()=>{
 const widths=['capital','city','town','village'].map(type=>{const c=markerDefaults('world-map',type as 'capital');return illustratedWidthKm(map,type,c.marker.prominence)})
 expect(widths.every((n,i)=>!i||n<widths[i-1])).toBe(true)
 expect(illustratedWidthKm(map,'city','primary')/illustratedWidthKm(map,'city','normal')).toBeCloseTo(1.65)
})
it('filters explicit semantic/type/theme/map/family metadata; override retains map compatibility',()=>{
 const asset:IllustratedCandidate={id:'a',name:'A',tags:['marker:city','style:painterly','theme:painterly-fantasy'],applicableMapTypes:['world-map'],width:400,height:300,source:'library'}
 const assets=[asset,{...asset,id:'b',tags:['marker:fort','style:engraved'],applicableMapTypes:[]},{...asset,id:'c',applicableMapTypes:['battlemap'] as const} as IllustratedCandidate]
 expect(markerCandidates(assets,'city','world-map').map(a=>a.id)).toEqual(['a'])
 expect(markerCandidates(assets,'city','world-map',{override:true}).map(a=>a.id)).toEqual(['a','b'])
 expect(markerCandidates(assets,'city','world-map',{family:'engraved'})).toEqual([])
 expect(markerCandidates(assets,'city','world-map',{theme:'painterly-fantasy'})).toHaveLength(1)
 expect(()=>validateMarkerAssetTags(['marker:unknown'])).toThrow()
 expect(()=>validateMarkerAssetTags(['style:Unrelated old tag'])).not.toThrow()
 expect(()=>validateMarkerAssetTags(['marker:city','style:Bad family'])).toThrow()
 expect(()=>parseAssetManifest({schemaVersion:3,assets:[{file:'city.png',type:'stamp',tags:['marker:bad']}]})).toThrow()
})
it('selects the semantic owner, edits atomically, and restores image/link/layer through undo',()=>{
 const [p,l]=bundle() as [PlaceObject,LabelObject];project.getState().addAnnotations([p,l])
 expect(editor.getState().selectedObjectIds).toEqual([p.id]);expect(project.getState().layers[0].objectIds).toEqual([p.id,l.id])
 project.getState().editMarker(symbolizeMarker(p,map),l,true);expect(project.getState().objects[0]).not.toHaveProperty('assetId','art')
 history.undo();expect(project.getState().objects[0]).toEqual({...p,marker:{...p.marker!,labelEnabled:true}});history.redo()
 project.setState({layers:[{...project.getState().layers[0],locked:true}]});expect(()=>project.getState().editMarker(p,l,true)).toThrow(/editable/)
})
it('uses the same image painter for both editor and export, without drawing a vector badge',()=>{
 const p=bundle()[0],image={} as CanvasImageSource,ctx={save:vi.fn(),restore:vi.fn(),drawImage:vi.fn(),globalAlpha:1} as unknown as CanvasRenderingContext2D
 paintAnnotation(ctx,p,new Map([['art',image]]));expect(ctx.drawImage).toHaveBeenCalledExactlyOnceWith(image,0,0,60,45)
})
it('refuses missing image resources on edit, without changing the document',()=>{
 const [p,l]=bundle() as [PlaceObject,LabelObject];project.getState().addAnnotations([p,l]);const before=project.getState().objects
 expect(()=>project.getState().editMarker({...p,assetId:'missing'},l,true)).toThrow(/available/);expect(project.getState().objects).toEqual(before)
})
