import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const root='docs/audits/2026-10-map-types-production-assessment';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const textures=JSON.parse(await fs.readFile('public/terrain-textures-painterly/terrain-library.json','utf8')).textures;
const terrain=[];for(const t of textures){const m=await sharp('public'+t.file).metadata();terrain.push({id:t.id,decodable:!!m.width&&!!m.height,width:m.width,height:m.height})}
const env=JSON.parse(await fs.readFile('public/environmental-detail/production-1/provenance.json','utf8')),detail=[];
for(const c of env.components){const bytes=await fs.readFile('public/environmental-detail/production-1/'+c.filename),m=await sharp(bytes).metadata();detail.push({id:c.id,sha256:hash(bytes)===c.sha256,decodable:!!m.width&&!!m.height})}
await fs.writeFile(root+'/bundled-resource-validation.json',JSON.stringify({terrain,environmentalDetail:{status:env.status,presets:env.presets.length,components:detail}},null,2));
const dir=root+'/reproduction';await fs.mkdir(dir,{recursive:true});for(const f of ['build.mjs','refine.mjs','editor.tsx','index.html','vite.config.mjs','seed.mjs','inventory.mjs','verify.mjs'])await fs.copyFile('.qa.local/production-audit/'+f,dir+'/'+f);
console.log({terrain:terrain.length,environmental:detail.length,failed:[...terrain,...detail].filter(x=>!x.decodable||x.sha256===false).length});
