import { expect,it } from 'vitest'
import manifest from '../../public/world-assets-painterly/mapweaver-assets.json'
import { hierarchyTier,hierarchyDensity,hierarchyTransform,HIERARCHY_SCALE,axisDelta } from './assetHierarchy'
import { scatterWorld,maskDistance } from './scatterWorld'
import { fixture } from '../../tests/fixtures/worldScatter'
import type { WorldScatterAsset } from './scatterModel'
import { validateGeneratorMetadata } from '../domain/generatorAssets'
import { validateWorldScatterSource } from './scatterModel'
const assets=manifest.assets.filter(a=>a.generator).map((a,i)=>({...a,id:'hierarchy-'+i,name:a.title,width:512,height:384})) as WorldScatterAsset[]
const settings={mountains:'high',forests:'high',details:'high',theme:'painterlyFantasy'} as const
it('validates optional tiers, orientation and lighting without rewriting legacy metadata',()=>{
 const legacy={version:1,semanticType:'mountain',roles:['ridge'],biomes:['generic'],themes:['genericFantasy'],weight:1}
 expect(validateGeneratorMetadata(legacy)).toEqual(legacy)
 for(const patch of [{hierarchy:'boss'},{ridgeAxis:91},{lighting:'left'},{ridgeAxis:NaN}])expect(()=>validateGeneratorMetadata({...legacy,...patch})).toThrow()
 for(const a of assets)expect(validateGeneratorMetadata(a.generator)).toEqual(a.generator)
})
it('bounds tier scales and preserves upright heroes while orienting allowed ridges',()=>{
 const meta={...assets[0].generator,rotation:{allowed:true,min:-8,max:8},scale:{min:.5,max:2},ridgeAxis:25}
 for(const tier of ['hero','primary','support','detail'] as const)for(const draw of [0,.5,1]){const t=hierarchyTransform(meta,tier,draw,32,true)!;expect(t.scale).toBeGreaterThanOrEqual(HIERARCHY_SCALE[tier].min);expect(t.scale).toBeLessThanOrEqual(HIERARCHY_SCALE[tier].max);if(tier==='hero')expect(t.rotation).toBe(0)}
 expect(hierarchyTransform(meta,'primary',.5,32,true)?.rotation).toBe(7);expect(axisDelta(-155,25)).toBe(0)
 expect(hierarchyTransform({...meta,scale:{min:10,max:20}},'detail',.5,0,false)).toBeNull()
})
it('increases supporting density rather than heroes and maps forest edge/interior to distinct tiers',()=>{
 expect(hierarchyDensity('hero','low')).toBe(hierarchyDensity('hero','high'))
 expect(hierarchyDensity('detail','high')/hierarchyDensity('detail','low')).toBeGreaterThan(hierarchyDensity('primary','high')/hierarchyDensity('primary','low'))
 expect(hierarchyTier('forests','forestEdge',1,.5)).toBe('detail');expect(hierarchyTier('forests','forestEdge',2,.5)).toBe('support');expect(hierarchyTier('forests','forestInterior',6,.5)).toBe('primary')
})
it('composes deterministic rare heroes and increasing support/detail with safe forest distribution',()=>{
 const {r,f}=fixture(),run=(density:'low'|'high')=>scatterWorld(r,{...settings,mountains:density,forests:density,details:density},assets,f),low=run('low'),high=run('high'),source=high.map.generation!.scatter!
 expect(high).toEqual(scatterWorld(r,settings,[...assets].reverse(),f));expect(source.engineVersion).toBe(2);expect(validateWorldScatterSource(source)).toEqual(source)
 const count=(out:typeof high,tier:string)=>out.map.generation!.scatter!.placements.filter(p=>p.hierarchy===tier).length
 console.log('HIERARCHY_COUNTS',Object.fromEntries(['hero','primary','support','detail'].map(t=>[t,[count(low,t),count(high,t)]])))
 expect(count(high,'support')+count(high,'detail')).toBeGreaterThan(count(low,'support')+count(low,'detail'));expect(count(high,'hero')).toBeLessThanOrEqual(4)
 const heroes=source.placements.filter(p=>p.hierarchy==='hero');expect(new Set(heroes.map(p=>p.sourceId)).size).toBe(heroes.length);expect(heroes.map(p=>p.cell)).toEqual(low.map.generation!.scatter!.placements.filter(p=>p.hierarchy==='hero').map(p=>p.cell))
 const forests=source.placements.filter(p=>p.group==='forests');expect(forests.filter(p=>p.hierarchy==='primary').length).toBeLessThanOrEqual(108);expect(forests.some(p=>p.hierarchy==='support')).toBe(true);expect(forests.some(p=>p.hierarchy==='detail')).toBe(true)
 const depths=maskDistance(f.biomes.map(b=>b==='forest'||b==='dense forest'),f.cols,f.rows)
 for(const p of source.placements){expect(assets.find(a=>a.id===p.sourceId)?.generator.hierarchy).toBe(p.hierarchy);if(p.group==='forests'&&depths[p.cell]<=1)expect(p.hierarchy).toBe('detail')}
 expect(source.placements.some(p=>p.group==='mountains'&&p.hierarchy==='primary')).toBe(true);expect(source.placements.some(p=>p.group==='mountains'&&p.hierarchy==='support')).toBe(true)
})
it('excludes declared incompatible light instead of silently mixing it',()=>{
 const {r,f}=fixture(),bad=assets.map(a=>({...a,generator:{...a.generator,lighting:'other' as const}})),out=scatterWorld(r,settings,bad,f)
 expect(out.map.generation!.scatter!.placements).toHaveLength(0);expect(out.map.generation!.scatter!.warnings.some(w=>w.includes('lighting'))).toBe(true)
})
