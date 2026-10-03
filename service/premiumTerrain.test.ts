import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { PREMIUM_TERRAIN } from '../src/domain/premiumTerrain'
import { validateAssetPack } from './assetPackValidation'
it('ships every immutable resource, complete provenance and valid optional fill-pattern pack', async()=>{
  const root='public/terrain-textures-painterly'
  const provenance=JSON.parse(readFileSync(root+'/provenance.json','utf8'))
  const catalog=JSON.parse(readFileSync(root+'/terrain-library.json','utf8'))
  expect(catalog.textures).toEqual(PREMIUM_TERRAIN)
  const old=JSON.parse(readFileSync('tests/fixtures/premiumTerrainOriginal.json','utf8'))
  for(const p of old.provenance)expect(provenance.find((v:{id:string})=>v.id===p.id)).toEqual(p)
  const hashes=new Set<string>()
  for(const t of PREMIUM_TERRAIN){
    const bytes=readFileSync('public'+t.file),hash=createHash('sha256').update(bytes).digest('hex')
    hashes.add(hash)
    expect(provenance.find((p:{id:string})=>p.id===t.id)).toMatchObject({sha256:hash,method:'Built-in image_gen'})
    const metadata=await sharp(bytes).metadata()
    expect([metadata.width,metadata.height,metadata.hasAlpha]).toEqual([512,512,false])
  }
  expect(hashes.size).toBe(32)
  expect(await validateAssetPack(readFileSync(root+'/mapweaver-terrain-painterly-fills.zip'))).toMatchObject({valid:true,assets:32,warnings:[],errors:[]})
})
