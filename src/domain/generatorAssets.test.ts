import { expect,it } from 'vitest'
import { defaultGeneratorMetadata,validateGeneratorMetadata,findGeneratorAssets,createGeneratorSelector,selectGeneratorAsset } from './generatorAssets'
import type { GeneratorMetadata,GeneratorAsset } from './generatorAssets'
import { parseAssetManifest } from './assetManifest'
const asset=(id:string,patch:Partial<GeneratorMetadata>={}):GeneratorAsset=>({id,type:'stamp',applicableMapTypes:['world-map','regional-map'],generator:{...defaultGeneratorMetadata(),...patch}})
it('retains legacy packs and accepts optional versioned stamp metadata with neutral weight',()=>{
  for(const schemaVersion of [1,2,3])expect(parseAssetManifest({schemaVersion,assets:[{file:'ordinary.png',type:'stamp'}]}).manifest.assets[0].generator).toBeUndefined()
  const metadata={...defaultGeneratorMetadata(),weight:undefined}
  expect(parseAssetManifest({schemaVersion:3,assets:[{file:'m.png',type:'stamp',generator:metadata}]}).manifest.assets[0].generator?.weight).toBe(1)
  for(const schemaVersion of [1,2])expect(()=>parseAssetManifest({schemaVersion,assets:[{file:'m.png',type:'stamp',generator:metadata}]})).toThrow(/schema 3/)
  expect(()=>parseAssetManifest({schemaVersion:3,assets:[{file:'m.png',type:'fillPattern',generator:metadata}]})).toThrow(/stamp/)
})
it('rejects malformed vocabularies and numeric ranges instead of guessing semantics',()=>{
  for(const patch of [{semanticType:'mountains'},{roles:['random']},{roles:[]},{roles:['ridge','ridge']},{biomes:['ice']},{themes:['anything']},{weight:0},{weight:-1},{weight:null},{weight:NaN},{scale:{min:2,max:1}},{scale:{min:0,max:1}},{rotation:{allowed:false,min:-10,max:10}},{rotation:{allowed:true,min:-181,max:0}},{spacing:0},{version:2},{filename:'mountain.png'}])expect(()=>validateGeneratorMetadata({...defaultGeneratorMetadata(),...patch})).toThrow(/generator/i)
})
it('uses the documented fallback order, never relaxing semantic type or map applicability',()=>{
  const q={semanticType:'mountain' as const,roles:['peak' as const],biome:'alpine' as const,theme:'parchment' as const,mapType:'world-map' as const}
  const levels=[asset('1',{roles:['peak'],biomes:['alpine'],themes:['parchment']}),asset('2',{roles:['peak'],biomes:['alpine']}),asset('3',{roles:['ridge'],biomes:['alpine']}),asset('4'),asset('5',{biomes:['desert']})]
  const wrong=[asset('tree',{semanticType:'tree'}),{...asset('battle'),applicableMapTypes:['battlemap' as const]}, {...asset('none'),generator:null}, {...asset('pattern'),type:'fill-pattern'}]
  for(let i=0;i<5;i++){const r=findGeneratorAssets([...wrong,...levels.slice(i)],q);expect(r.level).toBe(i+1);expect(r.candidates.map(a=>a.id)).toEqual([String(i+1)])}
  expect(findGeneratorAssets(wrong,q)).toEqual({level:6,candidates:[]})
  expect(()=>findGeneratorAssets(levels,{...q,biome:'oops'} as never)).toThrow()
})
it('uses ANY requested role, sorts stable IDs and includes unconstrained ordinary map applicability only with metadata',()=>{
  const a=asset('b',{roles:['ridge']}),b={...asset('a',{roles:['peak']}),applicableMapTypes:[]}
  const r=findGeneratorAssets([a,b],{semanticType:'mountain',roles:['peak','ridge'],mapType:'regional-map'})
  expect(r.candidates.map(a=>a.id)).toEqual(['a','b'])
})
it('selects reproducibly by stable ID and seed with proportional positive weights',()=>{
  const list=[asset('rare',{weight:1}),asset('common',{weight:9})],a=createGeneratorSelector(list),b=createGeneratorSelector([...list].reverse())
  const sequence=Array.from({length:10000},(_,i)=>a(713,i)!.id)
  expect(sequence).toEqual(Array.from({length:10000},(_,i)=>b(713,i)!.id));expect(sequence.filter(id=>id==='common').length).toBeGreaterThan(8800);expect(sequence.filter(id=>id==='common').length).toBeLessThan(9200)
  expect(sequence.slice(0,100)).not.toEqual(Array.from({length:100},(_,i)=>b(714,i)!.id))
  expect(selectGeneratorAsset([],1,0)).toBeUndefined();expect(()=>createGeneratorSelector([list[0],list[0]])).toThrow(/Duplicate/);expect(()=>a(-1,0)).toThrow()
})
it('queries and samples a 10,000-record candidate set with one compiled weighted table',()=>{
  const list=Array.from({length:10000},(_,i)=>asset('id'+String(i).padStart(5,'0'),{weight:i%10+1})),start=performance.now()
  const found=findGeneratorAssets(list,{semanticType:'mountain',mapType:'world-map',biome:'generic'}),select=createGeneratorSelector(found.candidates)
  for(let i=0;i<10000;i++)expect(select(77,i)).toBeDefined()
  const elapsed=performance.now()-start;console.log('GENERATOR_QUERY_10000_MS',elapsed);expect(elapsed).toBeLessThan(3000)
})
