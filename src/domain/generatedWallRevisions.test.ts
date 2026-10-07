// @vitest-environment node
import {expect,it,vi} from 'vitest'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {currentGeneratedDefinitions,generatedDefinition,generatedWallChoices,generatedWallStyle} from './generatedWalls'
import {createWall,SIMPLE_WALL} from './walls'
import {generatedPlacements} from './generatedWallGeometry'
import {defaultMapStyle,normalizeMapSettings} from './mapSettings'
import {encodeProject,decodeProject} from '../projects/archive'
import {fixture,validateFixture} from '../projects/fixtures.test-support'
it('promotes only accepted pale stone; retains exact historical choices and geometries',()=>{
 const current=currentGeneratedDefinitions();expect(current.find(d=>d.id==='pale-palace-stone')?.revision).toBe('production-2')
 for(const id of ['marble','natural-cave-rock','refined-timber','rustic-heavy-timber','living-root','rough-stone'])expect(current.find(d=>d.id===id)?.revision).toBe('production-1')
 expect(current.some(d=>d.id==='sung-wood')).toBe(false)
 expect(generatedWallChoices().filter(d=>d.id==='pale-palace-stone').map(d=>d.revision)).toEqual(['production-2'])
 expect(generatedWallChoices({id:'pale-palace-stone',revision:'production-1'}).filter(d=>d.id==='pale-palace-stone').map(d=>d.revision)).toEqual(['production-1','production-2'])
 const map={...defaultMapStyle(),width:640,height:400,background:null},nodes=[{id:'a',x:20,y:20,mode:'corner' as const},{id:'b',x:500,y:20,mode:'corner' as const}]
 const old=createWall(nodes,false,generatedWallStyle(SIMPLE_WALL,map,'pale-palace-stone','production-1')),fresh=createWall(nodes,false,generatedWallStyle(SIMPLE_WALL,map,'pale-palace-stone'))
 expect(fresh.wall?.generated?.revision).toBe('production-2');expect(old.wall?.generated?.revision).toBe('production-1')
 const geometry=(w:typeof old)=>generatedPlacements(w).map(({component,...p})=>({...p,componentId:component.id}));expect(geometry(fresh)).toEqual(geometry(old))
 const definitions=currentGeneratedDefinitions([generatedDefinition({id:'pale-palace-stone',revision:'production-2'}),generatedDefinition({id:'pale-palace-stone',revision:'production-1'})]);expect(definitions).toHaveLength(1);expect(definitions[0].revision).toBe('production-2')
})
it('allows bounded revision coexistence beyond sixteen total records without overwrites',async()=>{
 vi.resetModules();const r=await import('./generatedWalls'),base=r.generatedDefinition({id:'pale-palace-stone',revision:'production-1'}),before=JSON.stringify(base)
 for(let i=0;i<r.GENERATED_REGISTRY_LIMITS.revisionsPerMaterial-2;i++)r.registerGeneratedDefinition({...base,revision:'qa-'+i})
 expect(r.generatedDefinitions().length).toBeGreaterThan(20);expect(()=>r.registerGeneratedDefinition({...base,revision:'qa-overflow'})).toThrow('limit');expect(()=>r.registerGeneratedDefinition({...base,name:'Changed'})).toThrow('immutable');expect(JSON.stringify(base)).toBe(before)
 const ids=new Set(r.generatedDefinitions().map(d=>d.id));for(let i=ids.size;i<r.GENERATED_REGISTRY_LIMITS.materials;i++)r.registerGeneratedDefinition({...base,id:'qa-material-'+i})
 expect(()=>r.registerGeneratedDefinition({...base,id:'qa-material-overflow'})).toThrow('limit')
})
it('keeps both revisions through native project ZIP save/reopen',async()=>{
 for(const revision of ['production-1','production-2']){const prepared=await fixture();prepared.document.formatVersion=12;prepared.document.map={...normalizeMapSettings(prepared.document.map),background:null};prepared.document.objectGroups=[];prepared.document.layerTree={roots:prepared.document.layers.map(l=>l.id),groups:[]};const wall=createWall([{id:'a',x:20,y:20,mode:'corner'},{id:'b',x:400,y:20,mode:'corner'}],false,generatedWallStyle(SIMPLE_WALL,prepared.document.map,'pale-palace-stone',revision));prepared.document.objects=[wall];prepared.document.layers[0].objectIds=[wall.id];prepared.document.map.background=null;prepared.document.assets=[];prepared.assets.clear();const loaded=await decodeProject(await encodeProject(prepared),validateFixture);expect(loaded.document.objects.find(o=>o.id===wall.id)).toEqual(wall)}
})
it('bundles exact accepted bytes, historical hashes and canonical additive default content',async()=>{
 const provenance=JSON.parse(await readFile('docs/wall-sets/pale-palace-stone-production-2-provenance.json','utf8')),old=JSON.parse(await readFile('docs/wall-sets/pale-palace-stone-production-provenance.json','utf8'))
 for(const c of provenance.components){const bytes=await readFile('public/'+c.artworkPath.replace('artwork/','generated-walls/'));expect(createHash('sha256').update(bytes).digest('hex')).toBe(c.sha256);expect(bytes.readUInt32BE(16)).toBe(c.pixelWidth);expect(bytes.readUInt32BE(20)).toBe(c.pixelHeight)}
 for(const c of old.components)expect(createHash('sha256').update(await readFile('public'+c.image)).digest('hex')).toBe(c.sha256)
 const defaults=JSON.parse(await readFile('docs/distribution/default-content.json','utf8'));expect(defaults.publicDirectories).toContain('generated-walls');expect(defaults.builtIn).toContain('Bleke paleissteen generated masonry walls: six production-2 components (production-1 retained for saved maps)')
})
