import { afterEach, expect, it } from 'vitest'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'
import { unzipSync, zipSync, strToU8 } from 'fflate'
import { Storage } from './storage'
import { previewPack, commitPack } from './libraryPacks'
import { libraryQuery } from './library'
import { ensureStampTaxonomy } from './stampGovernance'

const stores: Storage[] = []
afterEach(() => { for (const s of stores.splice(0)) { s.close(); rmSync(s.root, { recursive: true, force: true }) } })
it('accepts 22 Wave 2 families as 22 cards, preserves Wave 1 and rejects invalid identity payloads', async () => {
  const s = new Storage(mkdtempSync(path.join(os.tmpdir(), 'mw-wave-two-'))); stores.push(s)
  const bytes = readFileSync('public/pqa-premium-stamps/mapweaver-pqa-wave-two.zip')
  const files = unzipSync(bytes), manifest = JSON.parse(new TextDecoder().decode(files['mapweaver-assets.json']))
  expect(manifest.pack).toEqual({ id: 'pqa-premium-stamps-wave-02', revision: 1 })
  expect(manifest.families).toHaveLength(22)
  expect(manifest.families.flatMap((f: {variants: unknown[]}) => f.variants)).toHaveLength(69)
  ensureStampTaxonomy(s, manifest.families.map((f: {categoryId: string}) => f.categoryId))
  const categories = s.db.prepare('SELECT * FROM categories ORDER BY id').all()
  const waveOne = JSON.parse(JSON.stringify(manifest))
  waveOne.pack = {id:'pqa-reconciled-stamps',revision:1}
  waveOne.families = [ {...waveOne.families[0],id:'wave-one-coexistence-fixture'} ]
  waveOne.families[0].variants = [{id:'v01',file:'wave-one.png',weight:1}]
  const fixture = {...files,'mapweaver-assets.json':strToU8(JSON.stringify(waveOne))}
  Object.assign(fixture, {'wave-one.png':await sharp({create:{width:320,height:320,channels:4,background:'#123456'}}).png().toBuffer()})
  const first = await previewPack(s, Buffer.from(zipSync(fixture,{level:0})))
  expect(first.errors).toEqual([])
  commitPack(s,{token:first.token,revision:first.revision,duplicate:'keep'})
  const before = libraryQuery(s,{}).assets[0]
  const preview = await previewPack(s, bytes)
  expect(preview.errors).toEqual([])
  const result = commitPack(s,{token:preview.token,revision:preview.revision,duplicate:'keep',createCategories:false,useExistingCategories:true})
  expect(result.summary.imported).toBe(69)
  expect(result.categories).toEqual([])
  expect(s.db.prepare('SELECT * FROM categories ORDER BY id').all()).toEqual(categories)
  const cards = libraryQuery(s,{limit:'100'}).assets
  expect(cards).toHaveLength(23)
  expect(cards.find(a=>a.id===before.id)).toEqual(before)
  for (const family of manifest.families) {
    const card = cards.find(a=>a.family?.id===family.id)!
    expect(card.family?.variants).toHaveLength(family.variants.length)
    expect(card.family?.coverVariantId).toBe('v01')
    expect(card.family?.metadata?.defaultSize).toEqual(family.defaultSize)
    expect(card.categoryId).toBe(family.categoryId)
  }
  const same = await previewPack(s,bytes)
  expect(same.errors).toEqual([])
  expect(commitPack(s,{token:same.token,revision:same.revision,duplicate:'keep'}).summary.skipped).toBe(69)
  const afterReimport = libraryQuery(s,{limit:'100'}).assets
  for (const kind of ['family','variant','revision']) {
    const bad = JSON.parse(JSON.stringify(manifest))
    if(kind==='family')bad.families.push(bad.families[0])
    if(kind==='variant')bad.families[0].variants[1].id='v01'
    if(kind==='revision')bad.families[0].displayName='Changed immutable name'
    const p = await previewPack(s,Buffer.from(zipSync({...files,'mapweaver-assets.json':strToU8(JSON.stringify(bad))},{level:0})))
    expect(p.errors.length).toBeGreaterThan(0)
    expect(()=>commitPack(s,{token:p.token,revision:p.revision,duplicate:'keep'})).toThrow()
    expect(libraryQuery(s,{limit:'100'}).assets).toEqual(afterReimport)
  }
}, 60000)
