import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const provenance=JSON.parse(fs.readFileSync('src/campfire/generated/provenance.json','utf8'));
const root=process.env.CAMPFIRE_MAP_CONTRACT_DIR||path.resolve('../Campfire/packages/map-contract');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const [rel,digest] of Object.entries(provenance.sha256)){
 if(fs.existsSync(root)&&hash(fs.readFileSync(path.join(root,rel)))!==digest)throw Error('Canonical Campfire contract drift: '+rel+'. Request owner review and refresh derived artifacts deliberately.');
 const local=rel.startsWith('src/')?'src/campfire/generated/'+rel.slice(4):rel.startsWith('schemas/')?'src/campfire/generated/'+(rel.includes('-v2.')?'canonical-schema-v2.json':'canonical-schema.json'):rel.startsWith('fixtures/')?'src/campfire/generated/canonical-fixture.json':null;
 if(local&&hash(fs.readFileSync(local))!==digest)throw Error('Modified derived contract artifact: '+local);
}
console.log('Campfire contract provenance verified'+(fs.existsSync(root)?' against read-only canonical source.':' (canonical source unavailable; pinned derived artifacts verified).'));
