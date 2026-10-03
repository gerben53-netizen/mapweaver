import { createArea, rectangleGeometry } from './areas'
import { defaultLandArea } from './landAreas'
import { terrainAppearance } from './terrainStyles'
import { expect,it } from 'vitest'
import { waterDepthStudy } from '../../tests/fixtures/waterDepthStudy'
import { automaticDepth,buildDepthField,depthColor,waterDepthPreset,waterStroke,defaultWaterDepthBrush,mixDepth,riverMouths,mouthInfluence,validateWaterDepth } from './waterDepth'
import { waterContains,waterGeometry } from './waterGeometry'
import { decodeMask,PAINT_SAMPLES } from './terrainPaint'
import { normalizeMapSettings } from './mapSettings'
const preset=waterDepthPreset()
const sample=(paint:ReturnType<ReturnType<typeof waterStroke>['finish']>,x:number,y:number,id:string)=>{const t=paint.tiles[Math.floor(x/128)+','+Math.floor(y/128)],m=t?.[id];return m?decodeMask(m)[(Math.floor(y/2)%PAINT_SAMPLES)*PAINT_SAMPLES+Math.floor(x/2)%PAINT_SAMPLES]:0}
it('increases smooth depth away from shore, with brighter shallow and theme-specific colors',()=>{
 const values=[0,5,20,60,140,300,800].map(d=>automaticDepth(d,140,.75));expect(values).toEqual([...values].sort((a,b)=>a-b));expect(values[0]).toBe(0);expect(values.at(-1)).toBeGreaterThan(.96)
 expect(depthColor(.05,preset).reduce((a,b)=>a+b)).toBeGreaterThan(depthColor(.95,preset).reduce((a,b)=>a+b));expect(waterDepthPreset('calm')).not.toEqual(waterDepthPreset('parchment'))
})
it('islands create shallows and no-land oceans remain deep',()=>{
 const mask=new Uint8Array(400);mask[10*20+10]=1;const d=buildDepthField(mask,20,20,10,{...preset,shelf:30});expect(d[10*20+11]).toBeLessThan(d[0]);expect(buildDepthField(new Uint8Array(400),20,20,10,preset)[0]).toBe(1)
})
it('recognizes coast, lake holes, islands and transformed land without using viewport coordinates',()=>{
 const {map,objects}=waterDepthStudy(),wet=waterContains(waterGeometry(map,objects));expect(wet({x:350,y:700})).toBe(true);expect(wet({x:1200,y:240})).toBe(false);expect(wet({x:1500,y:500})).toBe(true);expect(wet({x:200,y:200})).toBe(false);expect(wet({x:-1,y:0})).toBe(false)

})
it('shallow/deep layering, local reset, softness and water-only strokes preserve geometry',()=>{
 const {map,objects}=waterDepthStudy(),wet=waterContains(waterGeometry(map,objects)),original=JSON.stringify(objects)
 const stroke=waterStroke(undefined,{...defaultWaterDepthBrush,size:120,strength:1},map,wet);stroke.add({x:650,y:320});const paint=stroke.finish()
 expect(sample(paint,610,320,'shallow_1')).toBe(0);expect(sample(paint,660,320,'shallow_1')).toBeGreaterThan(0);expect(mixDepth(.8,200,0)).toBeLessThan(.8)
 const deep=waterStroke(paint,{...defaultWaterDepthBrush,mode:'deep',size:120,strength:1,softness:0},map,wet);deep.add({x:650,y:320});const result=deep.finish();expect(sample(result,660,320,'ocean_1')).toBe(255);expect(sample(result,660,320,'shallow_1')).toBe(0)
 const reset=waterStroke(result,{...defaultWaterDepthBrush,mode:'erase',size:120,strength:1,softness:0},map,wet);reset.add({x:650,y:320});expect(sample(reset.finish(),660,320,'ocean_1')).toBe(0)
 const soft=waterStroke(undefined,{...defaultWaterDepthBrush,size:120,softness:1,strength:1},map,()=>true);soft.add({x:400,y:400});const s=soft.finish();expect(sample(s,400,400,'shallow_1')).toBeGreaterThan(sample(s,448,400,'shallow_1'));expect(JSON.stringify(objects)).toBe(original)
})
it('blend softens an authored boundary while preserving the immutable pre-stroke masks',()=>{
 const {map}=waterDepthStudy(),a=waterStroke(undefined,{...defaultWaterDepthBrush,size:40,softness:0,strength:1},map,()=>true);a.add({x:400,y:400});const before=a.finish(),json=JSON.stringify(before)
 const b=waterStroke(before,{...defaultWaterDepthBrush,mode:'blend',size:100,strength:1},map,()=>true);b.add({x:400,y:400});const after=b.finish();expect(sample(after,420,400,'shallow_1')).toBeGreaterThan(0);expect(JSON.stringify(before)).toBe(json)
})
it('detects downstream coastal and lake mouths, scales by width and excludes inland ends',()=>{
 const {map,objects}=waterDepthStudy(),mouths=riverMouths(objects,waterContains(waterGeometry(map,objects)));expect(mouths).toHaveLength(2);expect(mouths[0].radius).toBeGreaterThan(mouths[1].radius);expect(mouthInfluence(mouths[0],mouths[0])).toBeGreaterThan(.8);expect(riverMouths(objects,()=>false)).toHaveLength(0);expect(riverMouths(objects,()=>true)).toHaveLength(0)
})
it('validates budgets/references, keeps old maps opt-out and roundtrips configured settings',()=>{
 const old=waterDepthStudy();expect(normalizeMapSettings(old.map).waterDepth).toBeUndefined();expect(validateWaterDepth(preset)).toEqual(preset)
 for(const v of [{...preset,shelf:0},{...preset,mid:'red'},{...preset,mouths:NaN},{...preset,version:2},{...preset,unknown:true}])expect(()=>validateWaterDepth(v)).toThrow()
 expect(()=>validateWaterDepth({...preset,paint:{...waterDepthStudy(true).map.waterDepth!.paint,materials:{bad:{style:'grassland',scale:1}}}})).toThrow()
})

it('explicit inland water Areas cut the semantic water mask without editing land',()=>{
 const land={...createArea(rectangleGeometry({x:0,y:0,width:500,height:500})),land:defaultLandArea('landmass')}
 const lake={...createArea(rectangleGeometry({x:100,y:100,width:150,height:150})),land:{...defaultLandArea('terrain-region'),appearance:terrainAppearance('ocean')}}
 const wet=waterContains(waterGeometry({width:600,height:600},[land,lake]));expect(wet({x:150,y:150})).toBe(true);expect(wet({x:300,y:150})).toBe(false);expect(wet({x:550,y:150})).toBe(true)
})

it('bounds derived mouth work even with many eligible rivers',()=>{
 const {map,objects}=waterDepthStudy(),river=objects[2],copies=Array.from({length:300},(_,i)=>({...river,id:'river-'+i}))
 expect(riverMouths(copies,waterContains(waterGeometry(map,objects)))).toHaveLength(256)
})
