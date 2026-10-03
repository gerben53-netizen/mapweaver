import 'fake-indexeddb/auto'
import { beforeEach,expect,it,vi } from 'vitest'
import { createMapElement,metersPerPixel,panelLayout,scaleBarMeasure,scaleBarWidth } from './decorations'
import type { ScaleBarObject,TextPanelObject } from './decorations'
import { CARTOGRAPHIC_ELEMENT_PRESETS,defaultElementPreset,elementPreset,semanticLabelStyle } from './cartographicPresets'
import { createCompass,createLegend,createLabel,validateAnnotation,restyleLabel,transformAnnotation,annotationBudget } from './annotations'
import type { Annotation } from './annotations'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'
import { parseProject } from '../projects/format'
import { useProjectStore as project } from '../store/projectStore'
import { useEditorStore as editor } from '../store/editorStore'
import { history,useHistoryStore } from '../store/history'
import { exportScene } from '../export/scene'
import { paintAnnotation } from '../canvas/drawAnnotation'
const map={width:1200,height:800,...defaultMapStyle(),background:null,mapType:'regional-map' as const,geography:defaultGeography()}
const document=(objects:Annotation[])=>({formatVersion:12,id:'decorations',name:'Decorations',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map,objects,layers:[{id:'objects',name:'Map elements',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:{roots:['objects'],groups:[]},assets:[]})
const make=(kind:Parameters<typeof createMapElement>[0])=>createMapElement(kind,{x:600,y:400},map)
beforeEach(()=>{project.setState(document([]));editor.setState({activeLayerId:'objects',soloLayerId:null,selectedObjectIds:[],editingGroupId:null,clipboard:[],clipboardGroups:[]});history.reset()})
it('preserves legacy compass, legend and boxed label bytes through admission',()=>{
 const old=[createCompass({x:100,y:100}),createLegend({x:400,y:400}),createLabel({x:200,y:300},'Legacy')]
 expect(parseProject(document(old)).objects).toEqual(old)
 expect(old[0]).not.toHaveProperty('elementPreset');expect(old[1]).not.toHaveProperty('elementPreset')
})
it('has centralized creation defaults and deterministic saved-preset fallback',()=>{
 expect(['battlemap','regional-map','world-map'].map(t=>defaultElementPreset('compass',t as typeof map.mapType))).toEqual(['technical','classic','ornate'])
 expect(elementPreset('compass','invalid').id).toBe('technical');expect(elementPreset('legend','invalid').id).toBe('legacy')
 for(const [kind,presets] of Object.entries(CARTOGRAPHIC_ELEMENT_PRESETS))for(const p of presets){expect(p.mapTypes).toContain('battlemap');const o=createMapElement(kind as Parameters<typeof createMapElement>[0],{x:400,y:200},map,[],p.id);expect(validateAnnotation(o)).toEqual(o)}
 const unknown={...make('title'),elementPreset:'unknown'} as unknown as Annotation
 expect(validateAnnotation(unknown)).toMatchObject({elementPreset:'simple'})
})
it('serializes every type, editable content, rotation, mirror and scale deterministically',()=>{
 const objects=Object.keys(CARTOGRAPHIC_ELEMENT_PRESETS).map(kind=>{const o=make(kind as Parameters<typeof createMapElement>[0]);return transformAnnotation(o,{...o,rotation:35,scaleX:-1,width:o.width*2,height:o.height*2})})
 const parsed=parseProject(JSON.parse(JSON.stringify(document(objects))))
 expect(parsed.objects).toEqual(objects);expect(JSON.stringify(parseProject(parsed))).toBe(JSON.stringify(parsed))
 expect(()=>validateAnnotation({...make('scaleBar'),unit:'yards'} as never)).toThrow()
 expect(()=>validateAnnotation({...make('title'),elementVersion:2} as never)).toThrow()
 expect(()=>validateAnnotation({...make('infoPanel'),body:'a'.repeat(2049)} as never)).toThrow()
 expect(()=>validateAnnotation({...make('title'),assetId:'external'} as never)).toThrow()
})
it('computes exact real bar length in all four units and responds to scale and canvas dimensions',()=>{
 const o={...make('scaleBar'),width:120,unit:'km'} as ScaleBarObject
 expect(scaleBarMeasure(o,map)?.value).toBeCloseTo(100)
 expect(scaleBarMeasure({...o,unit:'mi'},map)?.value).toBeCloseTo(100/1.609344)
 expect(scaleBarMeasure({...o,unit:'m'},map)?.value).toBeCloseTo(100000)
 expect(scaleBarMeasure({...o,unit:'ft'},map)?.value).toBeCloseTo(100000/.3048)
 expect(scaleBarWidth(100,'km',map)).toBeCloseTo(120)
 expect(scaleBarMeasure(o,{...map,width:2400})?.value).toBeCloseTo(50)
 expect(scaleBarMeasure({...o,width:240},map)?.value).toBeCloseTo(200)
 const battle={...map,mapType:'battlemap' as const,grid:{...map.grid,cellSize:50,physicalScale:{unit:'ft' as const,distancePerCell:5}}}
 expect(scaleBarMeasure({...o,width:100,unit:'ft'},battle)?.value).toBeCloseTo(10)
})
it('does not invent scale, and blocks unavailable visible bars in export with an actionable message',()=>{
 const battle={...map,mapType:'battlemap' as const},o=make('scaleBar') as ScaleBarObject
 expect(metersPerPixel(battle)).toBeNull();expect(metersPerPixel({...map,geography:undefined})).toBeNull()
 expect(scaleBarMeasure(o,battle)).toBeNull();expect(()=>scaleBarWidth(3,'m',battle)).toThrow(/Configure/)
 const data={...document([o]),map:battle}
 expect(()=>exportScene(data,{scale:1,includeGrid:false,transparent:true})).toThrow(/Configure physical scale/)
 expect(exportScene({...data,objects:[{...o,visible:false}]},{scale:1,includeGrid:false,transparent:true}).items).toHaveLength(0)
})
it('adds, edits, transforms, duplicates and copies decorations using existing atomic history',()=>{
 const objects=[make('title'),make('infoPanel'),make('scaleBar')];project.getState().addAnnotations(objects);expect(useHistoryStore.getState().undoCount).toBe(1)
 project.getState().updateAnnotations([{...objects[0],title:'The Amber Coast',body:'A traveller’s map'} as TextPanelObject]);expect(project.getState().objects[0]).toMatchObject({title:'The Amber Coast'})
 history.undo();expect(project.getState().objects).toEqual(objects);history.redo()
 editor.setState({selectedObjectIds:objects.map(o=>o.id)});project.getState().copy();project.getState().paste();expect(project.getState().objects).toHaveLength(6)
 project.getState().transformSelected({scale:2,rotation:45});expect(project.getState().objects[3].rotation).toBe(45)
 const next=project.getState().objects as Annotation[];expect(parseProject(document(next)).objects).toEqual(next)
 project.getState().changeObject(next[3].id,{locked:true});expect(()=>project.getState().updateAnnotations([{...next[3],name:'Blocked'}])).toThrow(/editable/)
})
it('keeps labels as native text and text panels reflow without rasterizing content',()=>{
 const label=createLabel({x:200,y:200},'River'),styled=restyleLabel(label,semanticLabelStyle('Water',label.style));expect(styled.style.italic).toBe(true);expect(styled.style.backgroundOpacity).toBe(0);expect(label.style.italic).toBe(false)
 const panel=make('infoPanel') as TextPanelObject,a=panelLayout(panel),b=panelLayout({...panel,body:'North gate\nHarbor\nOld tower',contentMode:'list'})
 expect(b.body.lines[0]).toBe('1. North gate');expect(b.height).toBeGreaterThan(a.height)
})
function context(){return Object.fromEntries(['save','restore','scale','translate','rotate','beginPath','closePath','moveTo','lineTo','arc','ellipse','fill','stroke','rect','roundRect','fillRect','strokeRect','bezierCurveTo','quadraticCurveTo','fillText','strokeText','drawImage'].map(k=>[k,vi.fn()]).concat([['globalAlpha',1] as never])) as unknown as CanvasRenderingContext2D}
it('shared painter preserves legacy calls, distinct ornaments, transparent simple text and halos',()=>{
 vi.stubGlobal('Path2D',class {constructor(_path:string){void _path}})
 const old=createCompass({x:0,y:0}),legacy=context(),technical=context();paintAnnotation(legacy,old,new Map(),map);paintAnnotation(technical,{...old,elementPreset:'technical'},new Map(),map)
 expect(technical.fillText).toHaveBeenCalledTimes(1);expect(technical.arc).toHaveBeenCalledWith(40,46,24,0,Math.PI*2);expect(technical.moveTo).toHaveBeenCalledTimes(3)
 const title={...make('title'),elementPreset:'simple',frame:false} as TextPanelObject;title.style={...title.style,strokeWidth:2};const c=context();paintAnnotation(c,title,new Map(),map);expect(c.fillRect).not.toHaveBeenCalled();expect(c.strokeText).toHaveBeenCalled();expect(c.fillText).toHaveBeenCalled()
 const c2=context();paintAnnotation(c2,createMapElement('compass',{x:0,y:0},map,[],'ornate'),new Map(),map);expect(c2.bezierCurveTo).toHaveBeenCalled()
 for(const kind of Object.keys(CARTOGRAPHIC_ELEMENT_PRESETS))for(const preset of CARTOGRAPHIC_ELEMENT_PRESETS[kind as keyof typeof CARTOGRAPHIC_ELEMENT_PRESETS])expect(()=>paintAnnotation(context(),createMapElement(kind as Parameters<typeof createMapElement>[0],{x:0,y:0},map,[],preset.id),new Map(),map)).not.toThrow()
 const scene=exportScene(document([title]),{scale:2,transparent:true,includeGrid:false});expect(JSON.stringify(scene)).not.toMatch(/selectedObjectIds|Transformer|selectionBounds/)
})

it('shares text budgets and preserves element placement on map resize and type changes',()=>{
 const title=make('title'),bar=make('scaleBar');expect(()=>annotationBudget(Array.from({length:2001},()=>title))).toThrow(/2,000/)
 project.getState().addAnnotations([title,bar]);project.getState().applyMapSettings({...map,width:1400,mapType:'world-map'},()=>true)
 expect(project.getState().objects).toEqual([title,bar]);expect((title as TextPanelObject).elementPreset).toBe('ribbon')
 history.undo();expect(project.getState().map.width).toBe(1200)
})
