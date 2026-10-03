import { expect,it } from 'vitest'
import { finishPreset,validateGeographyFinish,coastDepth,distanceField,reliefLight,transitionAlpha,transitionPair } from './geographyFinish'
import { normalizeMapSettings,defaultMapStyle } from './mapSettings'
import { generateWorld } from '../world/generate'
import { WORLD_DEFAULTS } from '../world/model'
import { applyWorldTheme } from './applyWorldTheme'
import { emptyTerrainPaint } from './terrainPaint'
it('validates optional settings and leaves old maps opt-out',()=>{
 const map={width:800,height:600,...defaultMapStyle()};expect(normalizeMapSettings(map).geographyFinish).toBeUndefined()
 const f=finishPreset();expect(validateGeographyFinish(f)).toEqual(f)
 for(const patch of [{strength:NaN},{light:361},{softness:-1},{contrast:5}])expect(()=>validateGeographyFinish({...f,relief:{...f.relief,...patch}})).toThrow()
 expect(()=>validateGeographyFinish({...f,ocean:'invented'})).toThrow()
})
it('uses theme presets without overwriting manual paint or semantic boundaries',()=>{
 const world=generateWorld({...WORLD_DEFAULTS,rivers:0}),paint=emptyTerrainPaint();world.map.terrainPaint=paint
 const result=applyWorldTheme(world,'world.painterlyFantasy',{reset:true,elements:false,assets:false}).snapshot
 expect(result.map.geographyFinish?.relief.enabled).toBe(true);expect(result.map.terrainPaint).toEqual(paint)
 expect(result.objects.filter(o=>o.kind==='area').map(o=>o.geometry)).toEqual(world.objects.filter(o=>o.kind==='area').map(o=>o.geometry))
 expect(finishPreset('world.minimalPolitical').relief.enabled).toBe(false);expect(finishPreset('world.classicParchment').relief.strength).toBeLessThan(finishPreset().relief.strength)
})
it('responds to light direction/strength and provides irregular pair-specific edges',()=>{
 expect(reliefLight(.3,.2,315,0,1)).toBe(0);expect(reliefLight(.3,.2,315,.4,1)*reliefLight(.3,.2,135,.4,1)).toBeLessThan(0)
 expect(transitionPair('snow','rocky')).not.toEqual(transitionPair('forest','grassland'));expect(transitionPair('unknown')).toEqual(transitionPair('land'))
 const samples=Array.from({length:30},(_,x)=>transitionAlpha(6,12,x*7,19,'snow','rocky'));expect(new Set(samples).size).toBeGreaterThan(20)
 expect(transitionAlpha(100,12,1,1,'forest')).toBe(1)
})
it('derives multi-stage shelves from coast distance with steeper high coasts',()=>{
 const near=coastDepth(1,20,30,0,15),far=coastDepth(80,20,30,0,15),high=coastDepth(12,20,30,1,15),low=coastDepth(12,20,30,0,15)
 expect(near.shallow).toBeGreaterThan(far.shallow);expect(near.offshore).toBeGreaterThan(near.shallow);expect(high.shallow).toBeLessThan(low.shallow)
 expect(coastDepth(10,200,300,0,15)).not.toEqual(coastDepth(10,20,30,0,15))
 const mask=new Uint8Array(25);mask[12]=1;const d=distanceField(mask,5,5);expect(d.distance[12]).toBe(0);expect(d.distance[7]).toBe(1);expect(d.nearest[0]).toBe(12)
})
