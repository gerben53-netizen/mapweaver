import { createArea, rectangleGeometry } from './areas'
import { createLabel } from './annotations'
import { exportScene } from '../export/scene'
import { expect, it } from 'vitest'
import { TerrainStroke, defaultTerrainBrush, type TerrainBrush } from './terrainBrush'
import { decodeMask, emptyTexturePaint, remapTexturePaint, textureMaterialKey, texturePaintAssetIds, validateTerrainPaint, validateTexturePaint } from './terrainPaint'
import { textureBrushMaterial, textureBrushUnits, mergeTextureImages } from './textureBrush'
import { defaultMapStyle } from './mapSettings'
import { canCreateWithTool } from './mapCapabilities'
import { mapToScreen, screenToMap } from '../canvas/viewport'
import { pickerAssets } from '../library/chooseAsset'
import type { TypedAsset } from './models'
const map={...defaultMapStyle(),width:512,height:512,background:null}
const asset:TypedAsset={id:'wood',kind:'fillPattern',name:'Worn light planks',naturalWidth:2048,naturalHeight:2048,mimeType:'image/png',categoryId:'floors',contentHash:'a'.repeat(64),createdAt:'',patternScale:.75}
function draw(base=emptyTexturePaint(),patch:Partial<TerrainBrush>={},points=[{x:128,y:128}]){const stroke=new TerrainStroke(base,{...defaultTerrainBrush,assetId:'wood',size:100,softness:0,strength:1,textureScale:.75,...patch},map,undefined,undefined,undefined,true);points.forEach(p=>stroke.add(p));return stroke.finish()}
function alpha(p:ReturnType<typeof draw>,x:number,y:number,id=textureMaterialKey('wood',.75)){const mask=p.tiles[`${Math.floor(x/64)},${Math.floor(y/64)}`]?.[id];return mask?decodeMask(mask)[y%64*64+x%64]:0}
it('restricts creation to Battlemap and shares searchable category-filtered library materials',()=>{
 expect(canCreateWithTool('battlemap','textureBrush')).toBe(true);expect(canCreateWithTool('world-map','textureBrush')).toBe(false)
 expect(pickerAssets([asset,{...asset,id:'other',kind:'stamp'}],'fillPattern','planks','floors')).toEqual([asset])
 expect(pickerAssets([asset],'fillPattern','stone','floors')).toEqual([])
 expect(textureBrushMaterial(asset)).toMatchObject({assetId:'wood',textureScale:.75})
 expect(textureBrushMaterial({...asset,patternScale:null}).textureScale).toBe(1)
 expect(()=>textureBrushMaterial({...asset,kind:'stamp'})).toThrow();expect(()=>textureBrushMaterial({...asset,sizing:{applicableMapTypes:['world-map'],sizingMode:'native',defaultWidth:null,defaultHeight:null,sizingUnit:null,aspectRatioLocked:true,sizingScope:'world-map'}})).toThrow()
})
it('uses map scale in ft, m and cells without viewport dependencies',()=>{
 const m={...map,grid:{...map.grid,cellSize:50,physicalScale:{unit:'ft' as const,distancePerCell:5}}}
 expect(textureBrushUnits(m).value).toBeCloseTo(.1);expect(textureBrushUnits(m).unit).toBe('ft')
 expect(textureBrushUnits({...m,grid:{...m.grid,physicalScale:{unit:'m',distancePerCell:1.5}}})).toEqual({value:.03,unit:'m'})
 expect(textureBrushUnits({...m,grid:{...m.grid,physicalScale:undefined}})).toEqual({value:.02,unit:'cells'})
 for(const zoom of [.25,1,3]){const viewport={zoom,pan:{x:29,y:-80}},p=screenToMap(mapToScreen({x:128,y:128},viewport),viewport);expect(draw(undefined,{},[p])).toEqual(draw())}
})
it('keeps one-pixel masks, fractional scale, smooth softness and predictable repeated-stroke strength',()=>{
 const hard=draw(),soft=draw(undefined,{softness:1}),first=draw(undefined,{strength:.4}),second=draw(first,{strength:.4})
 expect(alpha(hard,175,128)).toBe(255);expect(alpha(soft,175,128)).toBeLessThan(10)
 expect(alpha(first,128,128)).toBe(102);expect(alpha(second,128,128)).toBe(163)
 expect(draw(undefined,{strength:.4},Array(5).fill({x:128,y:128}))).toEqual(first)
 expect(Object.values(hard.materials)[0]).toEqual({assetId:'wood',scale:.75});expect(validateTexturePaint(hard)).toBe(hard)
 expect(()=>validateTerrainPaint(hard)).toThrow()
})
it('erases only paint, releases fully erased material references and blends across tile boundaries',()=>{
 const painted=draw(),erased=draw(painted,{mode:'erase'})
 expect(erased.tiles).toEqual({});expect(texturePaintAssetIds(erased)).toEqual([]);expect(alpha(painted,128,128)).toBe(255)
 const blend=draw(painted,{mode:'blend',size:160})
 expect(alpha(blend,177,128)).toBeLessThan(alpha(painted,177,128));expect(alpha(blend,179,128)).toBeGreaterThan(0)
 expect(validateTexturePaint(blend)).toBe(blend)
 expect(()=>draw({...painted,locked:true})).toThrow();expect(()=>draw({...painted,visible:false})).toThrow()
})
it('clips mask writes to map bounds and remaps texture references for imported ZIPs',()=>{
 const p=draw(undefined,{},[{x:0,y:0},{x:512,y:0}]);expect(Object.keys(p.tiles).every(key=>key.split(',').every(n=>+n>=0&&+n<8))).toBe(true)
 const remapped=remapTexturePaint(p,new Map([['wood','imported']]));expect(texturePaintAssetIds(remapped)).toEqual(['imported']);expect(validateTexturePaint(remapped)).toBe(remapped)
 expect(Object.values(remapped.tiles).map(t=>Object.values(t))).toEqual(Object.values(p.tiles).map(t=>Object.values(t)))
 expect(()=>validateTexturePaint({...p,materials:{bad:{assetId:'../wood',scale:.75}}})).toThrow()
})

it('keeps a newly decoded choice when an older image effect settles afterwards',()=>{
 const latest=new Map([['wood','pixels-wood'],['moss','pixels-moss']]);expect([...mergeTextureImages(latest,[['wood','pixels-wood']],['wood','moss'])]).toEqual([...latest]);expect([...mergeTextureImages(latest,[],['moss'])]).toEqual([['moss','pixels-moss']])
})

it('opts into floor/paint/object passes while unpainted documents retain their order',()=>{
 const floor=createArea(rectangleGeometry({x:40,y:40,width:200,height:200})),label=createLabel({x:100,y:100},'Room'),objects=[label,floor],snapshot={map,objects,layers:[{id:'layer',name:'Objects',visible:true,locked:false,objectIds:objects.map(o=>o.id)}]}
 const plain=exportScene(snapshot,{scale:1,includeGrid:false,transparent:false});expect(plain.items.filter(i=>i.kind==='object').map(i=>i.object.id)).toEqual([label.id,floor.id]);expect(plain.items.some(i=>i.kind==='texturePaint')).toBe(false)
 const painted=exportScene({...snapshot,map:{...map,texturePaint:draw()}},{scale:2,includeGrid:false,transparent:false}),order=painted.items.filter(i=>i.kind==='object'||i.kind==='texturePaint').map(i=>i.kind==='object'?i.object.id:i.kind)
 expect(order).toEqual([floor.id,'texturePaint',label.id]);expect(painted.textureRestricted).toBe(true);expect(snapshot.objects).toEqual(objects)
})
