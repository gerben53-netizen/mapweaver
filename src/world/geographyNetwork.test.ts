import { expect,it } from 'vitest'
import { generateWorld,terrainField,drainage } from './generate'
import { WORLD_DEFAULTS, WORLD_PRESETS } from './model'
import { drainageNetwork,extractRidges,validateGeographyNetwork } from './geographyNetwork'
import { parseProject } from '../projects/format'
import { themeWorld } from './themeWorld'
it('keeps v1 reproducible and emits deterministic version-2 ridges and drainage',()=>{
 const p={...WORLD_DEFAULTS,seed:'Velanth tidebound 7',continents:2,water:.36,mountains:.8,roughness:.7,rivers:16}
 const old=generateWorld(p),a=generateWorld(p,2),b=generateWorld(p,2)
 expect(a).toEqual(b);expect(old.map.generation?.generatorVersion).toBe(1);expect(old.map.generation?.geography).toBeUndefined();expect(a.map.generation?.generatorVersion).toBe(2)
 const g=a.map.generation!.geography!;expect(validateGeographyNetwork(g)).toEqual(g)
 expect(g.ridges.some(r=>r.level==='major')).toBe(true);expect(g.ridges.some(r=>r.level==='secondary')).toBe(true)
 expect(g.drainage.length).toBeGreaterThan(0);expect(a.objects.length).toBeLessThanOrEqual(240)
 const f=terrainField(p,2),d=drainage(f.height,f.cols,f.rows,p.water)
 for(const r of g.drainage){for(let i=1;i<r.cells.length;i++)expect(d.filled[r.cells[i]]).toBeLessThan(d.filled[r.cells[i-1]])
  expect(r.endWidth).toBeGreaterThanOrEqual(r.startWidth)
  if(!r.downstream)expect(['ocean','lake']).toContain(r.mouth)
 }
 for(const r of g.ridges){expect(r.points.length).toBeGreaterThanOrEqual(3);for(let i=1;i<r.points.length;i++)expect(Math.hypot(r.points[i].x-r.points[i-1].x,r.points[i].y-r.points[i-1].y)).toBeLessThan(p.width/20)}
 const doc={formatVersion:12,id:'test',name:'Test',createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z',...a,assets:[],objectGroups:[]};delete (doc as Partial<typeof a>).stats
 expect(parseProject(JSON.parse(JSON.stringify(doc))).map).toEqual(a.map)
 const styled=themeWorld(a,'world.painterlyFantasy');for(const r of g.drainage){const path=styled.objects.find(o=>o.id===r.id);expect(path?.kind==='path'&&path.route?.kind==='river'&&path.route.startWidth).toBe(r.startWidth)}
})
it('splits tributaries at shared junctions and widens the downstream editable reach',()=>{
 const cols=145,rows=97,n=cols*rows,height=Array(n).fill(.1),biomes=Array(n).fill('grassland'),filled=Array(n).fill(0)
 const chains=[[150,151,152,153,154],[296,297,152]];chains.flat().forEach(i=>{height[i]=.5;filled[i]=1000-i});height[154]=.1
 const {reaches,paths}=drainageNetwork(chains,{cols,rows,height,biomes},filled,Array(n).fill(false),.2,2400,1600)
 expect(paths).toHaveLength(3);const main=reaches.find(r=>r.from===152)!
 expect(main.tributaries).toHaveLength(2);expect(main.order).toBe(2)
 for(const id of main.tributaries){const child=reaches.find(r=>r.id===id)!;expect(child.downstream).toBe(main.id);expect(main.startWidth).toBeGreaterThan(child.startWidth)}
 const g={version:1 as const,cols,rows,ridges:[],drainage:reaches};expect(()=>validateGeographyNetwork({...g,drainage:reaches.map(r=>({...r,downstream:r.id}))})).toThrow()
})
it('finds no ridge paths in a flat field',()=>{expect(extractRidges({cols:145,rows:97,height:Array(145*97).fill(.2),biomes:Array(145*97).fill('grassland')},.1,2400,1600)).toEqual([])})

it.each(Object.entries(WORLD_PRESETS))('bounds the new %s generator and its serialized network',(_name,preset)=>{const r=generateWorld({...WORLD_DEFAULTS,...preset},2);expect(r.objects.length).toBeLessThanOrEqual(240);expect(validateGeographyNetwork(r.map.generation!.geography!)).toEqual(r.map.generation!.geography)})
