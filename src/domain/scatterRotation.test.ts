import { expect, it } from 'vitest'
import { createScatter, DEFAULT_SCATTER, generateScatter, scatterDefaults, scatterRotation, validateScatterSettings, validateScatter } from './scatter'
import type { ScatterSettings } from './scatter'
const sources=[0,15,-10].map((rotation,i)=>({assetId:`asset-${i}`,weight:1,width:12,height:20,rotation}))
const stroke={mode:'paint' as const,diameter:240,points:[{x:200,y:200},{x:800,y:400}]}
const generate=(settings:Partial<ScatterSettings>)=>generateScatter({...createScatter(sources,{...DEFAULT_SCATTER,collision:'allow',...settings},91),strokes:[stroke]})
it('None preserves every source angle and ignores tangent alignment',()=>{
 const o=generate({rotationMode:'none',align:true})
 expect(new Set(o.instances.map(i=>i.assetId)).size).toBe(3)
 for(const i of o.instances)expect(i.rotation).toBe((sources.find(s=>s.assetId===i.assetId)!.rotation+360)%360)
 expect(scatterRotation({...DEFAULT_SCATTER,rotationMode:'none'},sources[1],()=>{throw Error('Unused RNG')},90)).toBe(15)
})
it('None leaves all independent random decisions unchanged',()=>{
 const withoutRotation=(s:Partial<ScatterSettings>)=>generate(s).instances.map(i=>({...i,rotation:0}))
 expect(withoutRotation({rotationMode:'none'})).toEqual(withoutRotation({rotationMode:'random'}))
})
it.each(['none','random','range'] as const)('%s reproduces across serialization and regeneration',rotationMode=>{
 const o=generate({rotationMode,rotationMin:-15,rotationMax:15})
 expect(generateScatter(JSON.parse(JSON.stringify(o)))).toEqual(o)
 expect(validateScatter(JSON.parse(JSON.stringify(o)))).toEqual(o)
})
it('Range adds bounded signed offsets to each source, irrespective of tangent',()=>{
 const o=generate({rotationMode:'range',rotationMin:-15,rotationMax:15,align:true})
 const offsets=o.instances.map(i=>((i.rotation-sources.find(s=>s.assetId===i.assetId)!.rotation+540)%360)-180)
 expect(Math.min(...offsets)).toBeGreaterThanOrEqual(-15)
 expect(Math.max(...offsets)).toBeLessThanOrEqual(15)
 expect(Math.max(...offsets)-Math.min(...offsets)).toBeGreaterThan(20)
})
it('Random retains the full seeded engine-1 variation for zero-oriented sources',()=>{
 const input={...createScatter(sources.map(s=>({...s,rotation:0})),DEFAULT_SCATTER,91),strokes:[stroke]}
 const legacy=generateScatter(input),random=generateScatter({...input,settings:{...DEFAULT_SCATTER,rotationMode:'random'}})
 expect(random.instances).toEqual(legacy.instances)
 expect(new Set(random.instances.map(i=>i.rotation)).size).toBeGreaterThan(10)
})
it('Legacy bounded, aligned recipes keep their formula and have no fields added',()=>{
 const settings={...DEFAULT_SCATTER,rotationMin:-20,rotationMax:60,align:true}
 expect(scatterRotation(settings,sources[1],()=>.25,40)).toBe(40)
 const o=generate(settings),json=JSON.stringify(o)
 expect(JSON.stringify(validateScatter(JSON.parse(json)))).toBe(json)
 expect(generateScatter(o).instances).toEqual(o.instances)
 expect(o.settings).not.toHaveProperty('rotationMode')
})
it('rejects malformed modes, ranges and source angles',()=>{
 for(const patch of [{rotationMin:NaN},{rotationMax:Infinity},{rotationMin:16,rotationMax:15},{rotationMin:-361},{rotationMode:'bogus'}])expect(()=>validateScatterSettings({...DEFAULT_SCATTER,...patch} as ScatterSettings)).toThrow()
 const o=generate({rotationMode:'none'})
 expect(()=>validateScatter({...o,sources:[{...sources[0],rotation:NaN}]})).toThrow()
})
it('uses map defaults with explicit recipe/preset precedence',()=>{
 for(const type of ['world-map','regional-map']){
  expect(scatterDefaults(type).rotationMode).toBe('none')
  expect(scatterDefaults(type,{rotationMode:'random'}).rotationMode).toBe('random')
  expect(scatterDefaults(type,{rotationMode:'range',rotationMin:-5,rotationMax:5})).toMatchObject({rotationMode:'range',rotationMin:-5,rotationMax:5})
 }
 expect(scatterDefaults('battlemap')).toMatchObject({rotationMode:'random',rotationMin:0,rotationMax:360})
})
