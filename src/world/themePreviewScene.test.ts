import {expect,it} from 'vitest'
import {themePreviewScene} from './themePreviewScene'
import {themesForMap} from '../domain/worldThemes'
import {exportScene} from '../export/scene'
import {generateWorld} from './generate'
import {WORLD_DEFAULTS} from './model'
import {themeWorld,themeWorldAssets} from './themeWorld'
const themes=themesForMap('world-map')
const geometry=(s:ReturnType<typeof themePreviewScene>)=>s.objects.filter(o=>o.kind==='area'||o.kind==='path').map(o=>o.kind==='area'?{id:o.id,geometry:o.geometry,terrain:o.land?.terrain}:{id:o.id,nodes:o.kind==='path'?o.nodes:[]})
it('uses identical geography and semantic content for all five themes',()=>{
 const samples=themes.map(t=>themePreviewScene(t.id)),base=geometry(samples[0])
 for(const s of samples){expect(geometry(s)).toEqual(base);expect(s.objects.map(o=>[o.id,o.kind])).toEqual(samples[0].objects.map(o=>[o.id,o.kind]));expect(()=>exportScene(s,{scale:1,transparent:false,includeGrid:false})).not.toThrow()}
 expect(new Set(samples.map(s=>JSON.stringify(s.map))).size).toBe(5)
 expect(new Set(samples.map(s=>s.objects.find(o=>o.id==='preview-region')?.kind==='label'&&JSON.stringify(s.objects.find(o=>o.id==='preview-region')))).size).toBe(5)
})
it('falls back to semantic terrain and a vector settlement when optional images are unavailable',()=>{
 const fallback=themePreviewScene(themes[0].id),rich=themePreviewScene(themes[0].id,{mountain:{id:'mountain',width:384,height:260},forest:{id:'forest',width:384,height:300},city:{id:'city',width:384,height:300}})
 expect(geometry(rich)).toEqual(geometry(fallback));expect(fallback.objects.some(o=>o.kind==='stamp')).toBe(false)
 expect(fallback.objects.find(o=>o.id==='preview-city')?.assetId).toBeUndefined()
 expect(rich.objects.filter(o=>o.kind==='stamp')).toHaveLength(8);expect(rich.objects.find(o=>o.id==='preview-city')).toMatchObject({visualMode:'illustrated',assetId:'city'})
})
it('keeps generated land, river nodes and provenance identical across visual themes',()=>{
 const base=generateWorld({...WORLD_DEFAULTS,width:800,height:600}),before=JSON.stringify(base)
 const geometryOf=(r:typeof base)=>r.objects.map(o=>o.kind==='area'?o.geometry:o.kind==='path'?o.nodes:o.id)
 for(const t of themes){const themed=themeWorld(base,t.id);expect(geometryOf(themed)).toEqual(geometryOf(base));expect(themed.map.generation).toEqual(base.map.generation)}
 expect(JSON.stringify(base)).toBe(before);expect(themeWorldAssets([],themes[0].id)).toEqual([])
})
