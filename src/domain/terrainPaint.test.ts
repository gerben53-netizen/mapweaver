import { describe, expect, it } from 'vitest'
import { brushFalloff, defaultTerrainBrush, TerrainStroke, type TerrainBrush } from './terrainBrush'
import { decodeMask, emptyTerrainPaint, encodeMask, materialKey, terrainPaintBoundary, terrainPaintOrder, validateTerrainPaint, type TerrainPaint } from './terrainPaint'
import { mapToScreen, screenToMap } from '../canvas/viewport'
import { canCreateWithTool } from './mapCapabilities'
import { generateWorld } from '../world/generate'
import { WORLD_DEFAULTS } from '../world/model'
import { applyWorldTheme } from './applyWorldTheme'
import { exportScene } from '../export/scene'
const size={width:1024,height:768}
function draw(base:TerrainPaint|undefined,patch:Partial<TerrainBrush>={},points=[{x:128,y:128}]){
  const stroke=new TerrainStroke(base,{...defaultTerrainBrush,size:80,softness:0,strength:1,...patch},size)
  points.forEach(p=>stroke.add(p));return stroke.finish()
}
function weight(p:TerrainPaint,x:number,y:number,id=materialKey('grassland',.6)){
  const encoded=p.tiles[`${Math.floor(x/128)},${Math.floor(y/128)}`]?.[id]
  return encoded?decodeMask(encoded)[Math.floor(y%128/2)*64+Math.floor(x%128/2)]:0
}
describe('terrain paint masks and admission',()=>{
  it('creates a separate empty layer and restricts creation to land maps',()=>{
    expect(validateTerrainPaint(emptyTerrainPaint()).tiles).toEqual({})
    expect(canCreateWithTool('battlemap','terrainBrush')).toBe(false)
    expect(canCreateWithTool('world-map','terrainBrush')).toBe(true)
    expect(canCreateWithTool('regional-map','terrainBrush')).toBe(true)
  })
  it('roundtrips raw and compressed masks and refuses invalid lengths/runs',()=>{
    for(const data of [new Uint8Array(4096).fill(123),Uint8Array.from({length:4096},(_,i)=>i%256)])expect(decodeMask(encodeMask(data))).toEqual(data)
    for(const value of ['b:AA==','r:AAAA','r:EAEB','r:@@@','z:AA=='])expect(()=>decodeMask(value)).toThrow()
  })
  it('roundtrips paint and rejects unknown keys/materials, excess weights and budgets',()=>{
    const p=draw(undefined);expect(validateTerrainPaint(JSON.parse(JSON.stringify(p)))).toEqual(p)
    expect(()=>validateTerrainPaint({...p,secret:true})).toThrow()
    expect(()=>validateTerrainPaint({...p,tiles:{'128,0':Object.values(p.tiles)[0]}})).toThrow()
    expect(()=>validateTerrainPaint({...p,tiles:{'0,0':{missing:encodeMask(new Uint8Array(4096))}}})).toThrow()
    const full=encodeMask(new Uint8Array(4096).fill(255))
    expect(()=>validateTerrainPaint({...p,materials:{a:{style:'rocky',scale:1}}})).toThrow()
    expect(()=>validateTerrainPaint({...p,materials:{grassland_1:{style:'grassland',scale:1},snow_1:{style:'snow',scale:1}},tiles:{'0,0':{grassland_1:full,snow_1:full}}})).toThrow()
    const many=Object.fromEntries(Array.from({length:33},(_,i)=>['grassland_'+(i+1),{style:'grassland',scale:i+1}]))
    expect(()=>validateTerrainPaint({...p,materials:many})).toThrow()
  })
  it.each([.25,.5,.75,1,2])('retains fractional texture scale %s',textureScale=>{
    const p=draw(undefined,{textureScale});expect(Object.values(validateTerrainPaint(p).materials)[0].scale).toBe(textureScale)
  })
})
describe('brush behavior',()=>{
  it.each([0,.5,1])('uses a smooth monotonic falloff at softness %s',softness=>{
    expect(brushFalloff(0,100,softness)).toBe(1);expect(brushFalloff(100,100,softness)).toBe(0)
    const samples=Array.from({length:101},(_,i)=>brushFalloff(i,100,softness))
    expect(samples.every((v,i)=>i===0||v<=samples[i-1])).toBe(true)
    expect(brushFalloff(75,100,softness)).toBe(softness===0?1:softness===.5?.5:.15625)
  })
  it('accumulates per stroke, not pointer dwell',()=>{
    const first=draw(undefined,{strength:.4}),twice=draw(first,{strength:.4})
    expect(weight(first,128,128)).toBe(102);expect(weight(twice,128,128)).toBe(163)
    const many=draw(undefined,{strength:.4},Array.from({length:100},()=>({x:128,y:128})))
    expect(many).toEqual(first)
  })
  it('interpolates fast strokes without gaps or sample-rate-dependent buildup',()=>{
    const a=draw(undefined,{softness:.65},[{x:40,y:128},{x:940,y:128}])
    const b=draw(undefined,{softness:.65},Array.from({length:91},(_,i)=>({x:40+i*10,y:128})))
    expect(a).toEqual(b)
    for(let x=40;x<=940;x+=10)expect(weight(a,x,128)).toBeGreaterThan(250)
  })
  it.each([.5,1,2,4])('paints the same logical footprint at zoom %s',zoom=>{
    const viewport={zoom,pan:{x:17,y:-23}},logical=[{x:128,y:128},{x:300,y:200}]
    const points=logical.map(p=>screenToMap(mapToScreen(p,viewport),viewport))
    expect(draw(undefined,{},points)).toEqual(draw(undefined,{},logical))
  })
  it('overlays a material locally and erases only paint',()=>{
    const a=draw(undefined),b=draw(a,{style:'snow',strength:.5}),c=draw(b,{mode:'erase',strength:1})
    expect(weight(b,128,128)).toBe(128);expect(weight(b,128,128,'snow_0.6')).toBe(127)
    expect(weight(c,128,128)).toBe(0);expect(weight(c,128,128,'snow_0.6')).toBe(0)
    expect(weight(a,128,128)).toBe(255)
  })
  it('blends both sides of paint boundaries across chunk seams',()=>{
    const full=encodeMask(new Uint8Array(4096).fill(255)),base={...emptyTerrainPaint(),materials:{grassland_1:{style:'grassland' as const,scale:1}},tiles:{'0,0':{grassland_1:full}}}
    const blend=draw(base,{mode:'blend',size:60},[{x:128,y:64}])
    expect(weight(blend,126,64,'grassland_1')).toBeLessThan(255)
    expect(weight(blend,128,64,'grassland_1')).toBeGreaterThan(0)
    expect(validateTerrainPaint(blend)).toBe(blend)
  })
  it('shares untouched chunks and retains the immutable source',()=>{
    const base=draw(undefined,{},[{x:64,y:64}]),next=draw(base,{},[{x:800,y:600}])
    expect(next.tiles['0,0']).toBe(base.tiles['0,0']);expect(Object.keys(base.tiles)).toEqual(['0,0'])
  })
  it('refuses hidden/locked layers',()=>{
    expect(()=>draw({...emptyTerrainPaint(),locked:true})).toThrow('unlock')
    expect(()=>draw({...emptyTerrainPaint(),visible:false})).toThrow('Show')
  })
})
it('keeps semantic terrain and generation intact, with paint below paths and effects',()=>{
  const generated=generateWorld({...WORLD_DEFAULTS,width:1024,height:768,seed:'paint-semantics'}),before=structuredClone(generated),terrainPaint=draw(undefined,{style:'rocky'})
  const snapshot={...generated,map:{...generated.map,terrainPaint},objectGroups:[]}
  const themed=applyWorldTheme(snapshot,'world.painterlyFantasy',{reset:false,elements:false,assets:false},[]).snapshot
  expect(themed.map.terrainPaint).toEqual(terrainPaint);expect(generated).toEqual(before)
  expect(themed.objects.filter(o=>o.kind==='area').map(o=>[o.id,o.geometry,o.land?.terrain])).toEqual(generated.objects.filter(o=>o.kind==='area').map(o=>[o.id,o.geometry,o.land?.terrain]))
  const scene=exportScene(snapshot,{scale:1,transparent:false,includeGrid:false}),paintIndex=scene.items.findIndex(i=>i.kind==='terrainPaint')
  expect(paintIndex).toBeGreaterThan(0)
  expect(scene.items.findIndex(i=>i.kind==='object'&&i.object.kind==='path')).toBeGreaterThan(paintIndex)
  const items=terrainPaintOrder([...generated.objects].reverse(),true)
  expect(items.slice(0,terrainPaintBoundary(items)).every(o=>o.kind==='area')).toBe(true)
  expect(terrainPaintOrder(generated.objects,false)).toBe(generated.objects)
})
