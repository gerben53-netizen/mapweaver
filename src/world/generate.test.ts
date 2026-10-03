import { expect,it } from 'vitest'
import { generateWorld, terrainField, drainage, WORLD_LIMITS } from './generate'
import { WORLD_DEFAULTS, WORLD_PRESETS, validateWorldGeneration } from './model'
import { parseProject } from '../projects/format'
import { validateArea, allRings } from '../domain/areas'
import { normalizeMapSettings } from '../domain/mapSettings'
import { pointInArea } from '../domain/scatter'
import { contours } from './contours'
const doc=(r:ReturnType<typeof generateWorld>)=>({formatVersion:12,id:'world',name:'World',createdAt:'2026-09-24T00:00:00.000Z',modifiedAt:'2026-09-24T00:00:00.000Z',map:r.map,objects:r.objects,layers:r.layers,layerTree:r.layerTree,objectGroups:[],assets:[]})
it('is deterministic, seed sensitive, and produces editable valid bounded geometry',()=>{
 const start=performance.now(),a=generateWorld(WORLD_DEFAULTS),b=generateWorld(WORLD_DEFAULTS)
 expect(b).toEqual(a);expect(generateWorld({...WORLD_DEFAULTS,seed:'Another world'}).objects).not.toEqual(a.objects)
 expect(a.map.mapType).toBe('world-map');expect(a.objects.some(o=>o.kind==='area')).toBe(true);expect(a.objects.some(o=>o.kind==='path')).toBe(true)
 expect(a.objects.length).toBeLessThanOrEqual(WORLD_LIMITS.objects);expect(a.stats.points).toBeLessThanOrEqual(WORLD_LIMITS.points)
 for(const o of a.objects)if(o.kind==='area'){expect(validateArea(o)).toEqual(o);for(const r of allRings(o.geometry))expect(r.length).toBeLessThanOrEqual(512)}
 expect(performance.now()-start).toBeLessThan(10000)
 console.log('WORLD',a.stats,'objects',a.objects.length,'ms',Math.round(performance.now()-start))
})
it('water threshold removes land and continent/roughness controls change terrain',()=>{
 const a=terrainField({...WORLD_DEFAULTS,water:.3}),b=terrainField({...WORLD_DEFAULTS,water:.6})
 expect(a.height).toEqual(b.height);expect(a.height.filter(v=>v>.3).length).toBeGreaterThan(b.height.filter(v=>v>.6).length)
 expect(terrainField({...WORLD_DEFAULTS,continents:1}).height).not.toEqual(a.height)
 expect(terrainField({...WORLD_DEFAULTS,roughness:0}).height).not.toEqual(a.height)
})
it('drains without cycles on a descending filled surface and identifies actual depressions',()=>{
 const f=terrainField(WORLD_DEFAULTS),d=drainage(f.height,f.cols,f.rows,WORLD_DEFAULTS.water)
 for(let i=0;i<d.parent.length;i++)if(d.parent[i]>=0){expect(d.filled[d.parent[i]]).toBeLessThan(d.filled[i]);if(d.lake[i])expect(d.filled[i]-f.height[i]).toBeGreaterThan(.012)}
 const basin=[0,0,0,0,0,0,.7,.7,.7,0,0,.7,.2,.7,0,0,.7,.7,.7,0,0,0,0,0,0],drain=drainage(basin,5,5,.1)
 expect(drain.lake[12]).toBe(true)
})
it('emits rivers with descending drainage nodes and ocean, visible lake or confluence destinations',()=>{
 const p=WORLD_DEFAULTS,r=generateWorld(p),f=terrainField(p),d=drainage(f.height,f.cols,f.rows,p.water),prior=new Set<number>()
 const lakes=r.objects.filter(o=>o.kind==='area'&&r.layers[1].objectIds.includes(o.id))
 for(const path of r.objects){if(path.kind!=='path')continue
  const cells=path.nodes.map(n=>Math.round(n.y/p.height*(f.rows-1))*f.cols+Math.round(n.x/p.width*(f.cols-1)))
  expect(new Set(cells).size).toBe(cells.length)
  for(let i=1;i<cells.length;i++)expect(d.filled[cells[i]]).toBeLessThan(d.filled[cells[i-1]])
  const last=cells.at(-1)!,point=path.nodes.at(-1)!
  expect(f.height[last]<=p.water||prior.has(last)||lakes.some(o=>o.kind==='area'&&pointInArea(point,o.geometry))).toBe(true)
  cells.forEach(i=>prior.add(i))
 }
})
it('traces holes and simplifies valid contours instead of pixel-sized objects',()=>{
 const size=41,values=Array.from({length:size*size},(_,i)=>{const x=i%size-20,y=Math.floor(i/size)-20,r=Math.hypot(x,y);return Math.min(15-r,r-5)})
 const result=contours(values,size,size,1000,1000)
 expect(result.geometries).toHaveLength(1);expect(result.geometries[0].polygons[0].holes).toHaveLength(1)
 expect(allRings(result.geometries[0]).flat().length).toBeLessThan(150)
})
it('classifies forests, deserts and alpine regions from climate/elevation, not random props',()=>{
 const p=WORLD_DEFAULTS,f=terrainField(p)
 for(let i=0;i<f.biomes.length;i++){const b=f.biomes[i],e=(f.height[i]-p.water)/(1-p.water+.001)
 if(b.includes('forest')){expect(f.moisture[i]).toBeGreaterThan(.78-p.forests*.38);expect(f.temperature[i]).toBeGreaterThan(.28)}
 if(b==='desert'){expect(f.moisture[i]).toBeLessThan(.32);expect(f.temperature[i]).toBeGreaterThan(.5)}
 if(b==='alpine')expect(e).toBeGreaterThan(.85)
 }
 expect(terrainField({...p,forests:0}).biomes.some(b=>b.includes('forest'))).toBe(false)
 expect(generateWorld({...p,rivers:0}).stats.riverCount).toBe(0)
})
it.each(Object.entries(WORLD_PRESETS))('validates and round-trips %s including ownership and scale',(_name,preset)=>{
 const r=generateWorld({...WORLD_DEFAULTS,...preset});expect(parseProject(JSON.parse(JSON.stringify(doc(r)))).map).toEqual(r.map)
 expect(parseProject(doc(r)).objects).toEqual(r.objects)
 expect(normalizeMapSettings(r.map).generation).toEqual(r.map.generation)
 expect(()=>validateWorldGeneration({...r.map.generation!,generatorVersion:99} as never)).toThrow()
})
