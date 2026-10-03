import { expect, it } from 'vitest'
import { toolIntentFixture } from '../../tests/fixtures/toolIntent'
import { encodeProject, decodeProject } from './codec'
import { semanticTerrain } from '../domain/terrainIntent'
import { createArea } from '../domain/areas'

it('round-trips existing Path, River, Road, Border, Landmass, Area and Terrain Region without appearance or geometry changes', async () => {
  const original=toolIntentFixture()
  const loaded=await decodeProject(await encodeProject({document:original,assets:new Map()}))
  expect(loaded.document).toEqual(original)
  const again=await decodeProject(await encodeProject(loaded))
  expect(again.document).toEqual(original)
})

it('creates semantic terrain with an explicit biome and matching visual preset while generic Area has none', () => {
  expect(semanticTerrain('swamp',1000)).toMatchObject({role:'terrain-region',terrain:'swamp',appearance:{style:'swamp'}})
  const source=toolIntentFixture().objects.find(o=>o.kind==='area')!
  if(source.kind!=='area')throw Error('Area fixture missing')
  expect(createArea(source.geometry,source.fill).land).toBeUndefined()
})
