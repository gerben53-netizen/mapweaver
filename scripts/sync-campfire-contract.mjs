import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
// Run only for a deliberately reviewed canonical update. Never builds or writes the Campfire package.
const root=path.resolve(process.env.CAMPFIRE_MAP_CONTRACT_DIR||'../Campfire/packages/map-contract'),destination='src/campfire/generated',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const old=JSON.parse(await fs.readFile(destination+'/provenance.json','utf8')),sha256={};
for(const rel of new Set([...Object.keys(old.sha256),'schemas/campfire-map-contract-v2.schema.json']))sha256[rel]=hash(await fs.readFile(path.join(root,rel)));
for(const name of ['index.ts','types.ts','schema.ts','validation.ts'])await fs.copyFile(path.join(root,'src',name),destination+'/'+name);
for(const [source,target]of [['schemas/campfire-map-contract-v1.schema.json','canonical-schema.json'],['schemas/campfire-map-contract-v2.schema.json','canonical-schema-v2.json'],['fixtures/minimal-valid-map-v1.json','canonical-fixture.json']])await fs.copyFile(path.join(root,source),destination+'/'+target);
await fs.writeFile(destination+'/provenance.json',JSON.stringify({...old,canonicalLocation:root,supportedVersions:[1,2],sha256},null,2)+'\n');
console.log('Read-only canonical source copied into Mapweaver derived artifacts. Review diff and run contract tests.')
