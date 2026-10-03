import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import Ajv from 'ajv'
import { unzipSync, strFromU8 } from 'fflate'
const ajv = new Ajv({ strict: false })
const payload = JSON.parse(await fs.readFile('public/asset-templates/prefab-v1.schema.json', 'utf8'))
ajv.addSchema(payload)
const validate = ajv.compile(JSON.parse(await fs.readFile('public/asset-templates/mapweaver-assets-v2.schema.json', 'utf8')))
for (const mode of ['editable', 'flattened']) {
  const files = unzipSync(await fs.readFile(`public/examples/prefabs/house-${mode}.zip`))
  const manifest = JSON.parse(strFromU8(files['mapweaver-assets.json']))
  assert(validate(manifest), JSON.stringify(validate.errors))
  const item = manifest.assets.find(a => a.type === 'prefab')
  assert.equal(item.prefab.mode, mode)
  assert(ajv.validate(payload.$id, item.prefab), JSON.stringify(ajv.errors))
  assert(!validate({ ...manifest, schemaVersion: 3 }))
  assert(!ajv.validate(payload.$id, { ...item.prefab, formatVersion: 2 }))
}
console.log('PASS both portable example packs, manifest-2 and prefab-1 schemas; unknown versions rejected')
