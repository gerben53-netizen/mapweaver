import { expect, it } from 'vitest'
import { PREMIUM_TERRAIN, TERRAIN_FAMILIES, findPremiumTerrain, premiumBrushPreset } from './premiumTerrain'
import { defaultTerrainBrush, TerrainStroke, validateBrush } from './terrainBrush'
import { materialKey, validateTerrainPaint } from './terrainPaint'
import { encodeProject, decodeProject, gatherProject } from '../projects/archive'
import { defaultMapStyle } from './mapSettings'
import { defaultGeography } from './geography'

const map = { ...defaultMapStyle(), width: 1200, height: 800, mapType: 'world-map' as const, geography: defaultGeography('world-map'), background: null }
it('covers eleven families with useful variants, organized metadata and valid presets', () => {
  expect(PREMIUM_TERRAIN).toHaveLength(32)
  expect(new Set(PREMIUM_TERRAIN.map(t => t.id)).size).toBe(32)
  expect(new Set(PREMIUM_TERRAIN.map(t => t.file)).size).toBe(32)
  expect([...new Set(PREMIUM_TERRAIN.map(t => t.family))].sort()).toEqual([...TERRAIN_FAMILIES].sort())
  for (const family of ['Grassland', 'Rocky upland', 'Forest floor', 'Swamp & marsh']) expect(findPremiumTerrain('',family).length).toBeGreaterThanOrEqual(2)
  for (const t of PREMIUM_TERRAIN) {
    expect(t.categoryPath).toEqual(['Painterly Terrain', t.family])
    expect(t.collection).toContain(t.family); expect(t.notes.length).toBeGreaterThan(20)
    expect(t.mapTypes).toEqual(['regional-map','world-map']); expect(t.theme).toBe('painterlyFantasy')
    expect(() => validateBrush({ ...defaultTerrainBrush, ...premiumBrushPreset(t.id) })).not.toThrow()
    expect(findPremiumTerrain(t.title.toUpperCase())).toContain(t)
  }
  expect(findPremiumTerrain('unobtainium')).toEqual([])
})
it('retains legacy paint verbatim, adds versioned materials only by explicit painting', () => {
  const old = new TerrainStroke(undefined,defaultTerrainBrush,map); old.add({x:100,y:100})
  const legacy = old.finish(), original = JSON.stringify(legacy)
  expect(legacy.version).toBe(1)
  const next = new TerrainStroke(legacy,{...defaultTerrainBrush,...premiumBrushPreset('painterly.v1.foothill')},map)
  next.add({x:600,y:400}); const painted=next.finish()
  expect(painted.version).toBe(2); expect(validateTerrainPaint(painted)).toBe(painted)
  expect(JSON.stringify(legacy)).toBe(original)
  expect(painted.tiles['0,0']).toBe(legacy.tiles['0,0'])
  expect(painted.materials[materialKey('grassland',.6)]).toEqual({style:'grassland',scale:.6})
  expect(() => validateTerrainPaint({...painted,version:1})).toThrow()
  const key=Object.keys(painted.materials).find(k=>k.includes('@'))!
  for(const textureId of ['https://example.com/a.png','painterly.v9.foothill',null])expect(()=>validateTerrainPaint({...painted,materials:{...painted.materials,[key]:{...painted.materials[key],textureId}}})).toThrow()
})
it.each([.25,.5,1,2])('roundtrips premium fractional scale %s through a project ZIP without source migration',async textureScale=>{
  const brush={...defaultTerrainBrush,...premiumBrushPreset('painterly.v1.swamp-wet'),textureScale}
  const stroke=new TerrainStroke(undefined,brush,map);stroke.add({x:400,y:400});const terrainPaint=stroke.finish()
  const snapshot={map:{...map,terrainPaint},objects:[],layers:[{id:'ground',name:'Ground',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:null}
  const now='2026-09-26T00:00:00.000Z'
  const data=await gatherProject(snapshot,{id:'premium-test',name:'Premium test',createdAt:now,modifiedAt:now})
  const result=await decodeProject(await encodeProject(data))
  expect(result.document.map.terrainPaint).toEqual(terrainPaint)
  expect(result.assets.size).toBe(0) // immutable bundled resources, not user-library references
})
it('keeps Erase and Blend valid for mixed legacy/premium coverage',()=>{
  const stroke=new TerrainStroke(undefined,{...defaultTerrainBrush,...premiumBrushPreset('painterly.v1.grass-lush')},map)
  stroke.add({x:200,y:200});const before=stroke.finish()
  for(const mode of ['erase','blend'] as const){const s=new TerrainStroke(before,{...defaultTerrainBrush,mode},map);s.add({x:200,y:200});expect(()=>validateTerrainPaint(s.finish())).not.toThrow()}
})

it('keeps original registry entries unchanged and exposes useful new search aliases',async()=>{
 const original=(await import('../../tests/fixtures/premiumTerrainOriginal.json')).default
 expect(PREMIUM_TERRAIN.slice(0,14)).toEqual(original.catalog)
 for(const [term,key] of [['dune','dunes'],['damp','cave-damp'],['mud','cave-mud'],['uneven','cave-uneven'],['rubble','cave-rubble'],['tunnel','cave-wet-stone'],['leaf','leaf-litter'],['salt','salt-flats']])expect(findPremiumTerrain(term).map(t=>t.id)).toContain('painterly.v1.'+key)
 expect(findPremiumTerrain('underground','Underground & cavern')).toHaveLength(9)
})
it.each(PREMIUM_TERRAIN.slice(14))('paints and ZIP roundtrips $title',async t=>{
 const stroke=new TerrainStroke(undefined,{...defaultTerrainBrush,...premiumBrushPreset(t.id)},map);stroke.add({x:250,y:250});const terrainPaint=stroke.finish()
 const snapshot={map:{...map,terrainPaint},objects:[],layers:[{id:'ground',name:'Ground',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:null}
 const data=await gatherProject(snapshot,{id:'new-material',name:t.title,createdAt:'2026-09-26T00:00:00.000Z',modifiedAt:'2026-09-26T00:00:00.000Z'})
 expect((await decodeProject(await encodeProject(data))).document.map.terrainPaint).toEqual(terrainPaint)
})
