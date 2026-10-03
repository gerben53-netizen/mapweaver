import {beforeEach,expect,it} from 'vitest'
import {defaultGeography,pixelsToDistance,distanceToPixels,measurePoints,mapWorkspace,scaleBar,validateGeography,localExtent,landLayers} from './geography'
import {defaultMapStyle,interactionGrid} from './mapSettings'
import {createArea,rectangleGeometry,allRings,withGeometry,normalizeGeometry} from './areas'
import {defaultLandArea,editContour,coastlineGeometry,landBudget,LAND_LIMITS} from './landAreas'
import {combineGeometry} from './areaBoolean'
import {parseProject} from '../projects/format'
import {useProjectStore as store} from '../store/projectStore'
import {useEditorStore as editor} from '../store/editorStore'
import {history} from '../store/history'
import {placementSize} from './placement'
import {exportScene} from '../export/scene'
import {gatherProject,encodeProject,decodeProject} from '../projects/archive'
import {flatLayerTree} from './grouping'
import type {MapDocument} from './models'
const map:MapDocument={width:1000,height:600,background:null,...defaultMapStyle(),mapType:'regional-map',geography:defaultGeography()}
const area=()=>({...createArea(rectangleGeometry({x:10,y:20,width:600,height:400})),land:defaultLandArea('landmass')})
const info={id:'map20',name:'Regional test',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z'}
const content=()=>{const a=area(),layers=[{id:'land',name:'Land',visible:true,locked:false,objectIds:[a.id]}];return{map:structuredClone(map),objects:[a],layers,objectGroups:[],layerTree:flatLayerTree(layers)}}
beforeEach(()=>{store.setState(content());editor.setState({activeLayerId:'land',selectedObjectIds:[],soloLayerId:null});history.reset()})
it('migrates v9 maps to battlemap without changing grid, geometry, backgrounds or layers',()=>{
 const d=content();delete d.map.mapType;delete d.map.geography;const {land:removed,...plain}=d.objects[0];expect(removed.role).toBe('landmass');d.objects=[plain as ReturnType<typeof area>]
 const migrated=parseProject({...info,...d,formatVersion:9,assets:[]})
 expect(migrated.formatVersion).toBe(12);expect(migrated.map.mapType).toBe('battlemap');expect(migrated.objects).toEqual(d.objects);expect(migrated.map.grid).toEqual(d.map.grid);expect(migrated.layers).toEqual(d.layers);expect(parseProject(migrated)).toEqual(migrated)
})
it('converts km/miles and multi-point distance independently of viewport',()=>{
 expect(pixelsToDistance(100,map)).toBe(100);expect(distanceToPixels(1,'mi',map)).toBeCloseTo(1.609344)
 const miles={...map,geography:{...map.geography!,unit:'mi' as const}}
 expect(pixelsToDistance(1.609344,miles)).toBeCloseTo(1)
 expect(measurePoints([{x:0,y:0},{x:3,y:4},{x:3,y:14}],map)).toEqual({segments:[5,10],total:15})
 for(const zoom of [.01,.25,1,4]){const b=scaleBar(miles,zoom);expect(b.pixels).toBeLessThanOrEqual(160);expect(b.pixels).toBeGreaterThan(30)}
 expect(localExtent({...map,geography:{...map.geography!,origin:{xKm:-20,yKm:50}}})).toEqual({minXKm:-20,minYKm:50,maxXKm:980,maxYKm:650})
})
it('refuses malformed scale, orientation, types and fictional coordinates',()=>{
 for(const patch of [{widthKm:0},{widthKm:Infinity},{northDegrees:360},{projection:'mercator'},{unit:'m'},{origin:{xKm:0,yKm:NaN}},{ruler:1},{extra:1}])expect(()=>validateGeography({...defaultGeography(),...patch} as never)).toThrow()
 expect(()=>mapWorkspace({mapType:'earth' as never})).toThrow()
 expect(()=>parseProject({...info,...content(),formatVersion:10,map:{...map,geography:null},assets:[]})).toThrow()
})
it('changes type and distance in one undo step without changing any object or grid setting',()=>{
 const before=store.getState(),objects=structuredClone(before.objects)
 store.getState().applyMapSettings({...before.map,mapType:'world-map',geography:{...defaultGeography('world-map'),widthKm:20000}},()=>true)
 expect(store.getState().objects).toEqual(objects);expect(store.getState().map.grid).toEqual(before.map.grid);history.undo();expect(store.getState().map).toEqual(before.map);history.redo();expect(store.getState().map.mapType).toBe('world-map')
 expect(interactionGrid({...map,grid:{...map.grid,snapEnabled:true}}).snapEnabled).toBe(false)
})
it('applies physical asset defaults to new instances and preserves aspect and scope',()=>{
 const asset={naturalWidth:100,naturalHeight:200,sizing:{sizingMode:'world' as const,defaultWidth:10000,defaultHeight:null,sizingUnit:'m' as const,aspectRatioLocked:true,sizingScope:'any' as const}}
 expect(placementSize(asset,map)).toEqual({width:10,height:20});expect(placementSize({...asset,sizing:{...asset.sizing,sizingUnit:'ft'}},map).width).toBeCloseTo(3.048)
 expect(placementSize({...asset,sizing:{...asset.sizing,sizingScope:'battlemap'}},map)).toEqual({width:75,height:150})
})
it('keeps coastline deterministic and bounded without mutating canonical holes or geometry',()=>{
 const a=area();a.geometry.polygons[0].holes=[rectangleGeometry({x:100,y:100,width:80,height:80}).polygons[0].outer];const o=withGeometry({...a,land:{...a.land,coastline:{seed:42,roughness:8,step:2}}},a.geometry),before=structuredClone(o.geometry)
 expect(coastlineGeometry(o)).toEqual(coastlineGeometry(structuredClone(o)));expect(coastlineGeometry(o)).not.toEqual(coastlineGeometry({...o,land:{...o.land!,coastline:{...o.land!.coastline,seed:43}}}));expect(o.geometry).toEqual(before)
 expect(allRings(coastlineGeometry(o)).reduce((n,r)=>n+r.length,0)).toBeLessThanOrEqual(LAND_LIMITS.coastSamples)
})
it('clips terrain to multipolygon land with holes and supports safe contour previews',()=>{
 const outer=rectangleGeometry({x:0,y:0,width:600,height:400}),hole=rectangleGeometry({x:200,y:100,width:80,height:80}).polygons[0].outer
 outer.polygons[0].holes=[hole]
 const clipped=combineGeometry('intersect',[rectangleGeometry({x:20,y:20,width:400,height:300}),outer])!
 expect(clipped.polygons[0].holes).toHaveLength(1);expect(outer.polygons[0].holes[0]).toEqual(hole)
 expect(editContour(outer,'smooth',5).polygons[0].holes).toHaveLength(1)
 expect(editContour(outer,'simplify',2)).toEqual(normalizeGeometry(outer))
 expect(()=>editContour(outer,'smooth',NaN)).toThrow()
})
it('converts roles with one undo, retains layer/group order and enforces global budgets',()=>{
 const a=store.getState().objects[0];if(a.kind!=='area')throw Error('fixture')
 const layers=structuredClone(store.getState().layers)
 history.run('Convert role',()=>store.getState().updateArea({...a,land:{...defaultLandArea('terrain-region'),terrain:'forest'}}));expect(store.getState().objects[0]).toMatchObject({land:{role:'terrain-region',terrain:'forest'}});expect(store.getState().layers).toEqual(layers);history.undo();expect(store.getState().objects[0]).toEqual(a)
 expect(()=>landBudget(Array.from({length:257},()=>area()))).toThrow(/256/)
 const big=withGeometry(area(),{polygons:[{outer:Array.from({length:500},(_,i)=>({x:300+200*Math.cos(i/500*2*Math.PI),y:300+200*Math.sin(i/500*2*Math.PI)})),holes:[]}]})
 expect(()=>landBudget(Array.from({length:21},()=>big))).toThrow(/10,000/)
 expect(landLayers().map(l=>l.name)).toEqual(['Labels','Places','Borders','Routes','Terrain','Landmasses','Background'])
})
it('roundtrips map scale and all role fields through the portable file and export options',async()=>{
 const c=content(),prepared=await gatherProject(c,info),file=await encodeProject(prepared),decoded=await decodeProject(file)
 expect(decoded.document.map).toEqual(c.map);expect(decoded.document.objects).toEqual(c.objects)
 expect(exportScene(c,{scale:1,includeGrid:false,transparent:false,includeScaleBar:true}).items.at(-1)).toEqual({kind:'scaleBar'})
 expect(exportScene(c,{scale:1,includeGrid:false,transparent:false,includeScaleBar:false}).items.some(i=>i.kind==='scaleBar')).toBe(false)
})
