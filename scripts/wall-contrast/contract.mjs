import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex')
export function safePath(root,relative){if(typeof relative!=='string'||relative.includes('\\')||relative.startsWith('/')||relative.split('/').some(v=>!v||v==='.'||v==='..'))throw Error('Unsafe relative path');const target=path.resolve(root,relative);if(!target.startsWith(path.resolve(root)+path.sep))throw Error('Path escapes root');return target}
export function validateManifest(manifest,contract){
 validateManifestShape(manifest)
 if(manifest.provenance.sourceSpecSHA256!==contract.baselineSpecSHA256)throw Error('Wrong original correction spec')
 if(manifest.schemaVersion!==1||manifest.contractId!=='mapweaver-premium-wall-contrast-replacement-v1'||manifest.packageId!=='premium-wall-contrast-production-2'||typeof manifest.exampleOnly!=='boolean'||!Array.isArray(manifest.materials)||manifest.materials.length!==5)throw Error('Invalid package identity')
 const equal=isDeepStrictEqual,quality=v=>['KEEP','FIX','REJECT'].includes(v)
 for(const [i,d]of contract.materials.entries()){const m=manifest.materials[i];if(m.id!==d.id||m.sourceRevision!==d.currentRevision||m.revision!==d.nextRevision||m.generatorType!==d.strategy||m.definitionPath!==`materials/${d.id}/definition.json`||!quality(m.qualityStatus)||m.components.length!==d.components.length)throw Error('Invalid material identity '+d.id)
  for(const [j,c]of d.components.entries()){const a=m.components[j];if(a.id!==c.id||a.role!==c.role||a.artworkPath!==`artwork/${d.id}-production-2/${c.filename}`||a.sourceSHA256!==c.sourceSHA256||! /^[0-9a-f]{64}$/.test(a.sha256)||a.pixelWidth!==c.pixelWidth||a.pixelHeight!==c.pixelHeight||!equal(a.anchor,c.anchor)||!equal(a.safeBounds,c.safeBounds)||!equal(a.alphaBounds,c.alphaBounds)||a.nominalLengthFt!==c.nominalLengthFt||a.nominalWidthFt!==c.nominalWidthFt||a.weight!==c.weight||!quality(a.qualityStatus)||a.provenance?.sourceRevision!=='production-1'||!['author','license','changeSummary'].every(k=>typeof a.provenance[k]==='string'&&a.provenance[k].trim()))throw Error('Invalid component contract '+d.id+'/'+c.id)}
 }
 return manifest
}
export async function validateImageFile(filename,c,expectedHash){const bytes=await fs.readFile(filename);if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)!==c.pixelWidth||bytes.readUInt32BE(20)!==c.pixelHeight||bytes[24]!==8||bytes[25]!==6)throw Error('Expected exact 8-bit RGBA PNG dimensions: '+c.id);const digest=sha256(bytes);if(expectedHash&&digest!==expectedHash)throw Error('Source hash mismatch '+c.id);return {filename,sha256:digest}}

/** Admission for this fixed Work output contract; not a general JSON Schema engine. */
export function validateManifestShape(m){
 const object=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||!keys.every(k=>Object.hasOwn(v,k)))throw Error('Missing or extra metadata fields')},text=v=>typeof v==='string'&&v.trim().length>0
 object(m,['schemaVersion','contractId','packageId','exampleOnly','createdAt','provenance','materials'])
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(m.createdAt))throw Error('Invalid provenance date')
 object(m.provenance,['author','license','tool','sourceSpecSHA256']);if(!['author','license','tool'].every(k=>text(m.provenance[k])))throw Error('Missing package provenance')
 for(const d of m.materials){object(d,['id','sourceRevision','revision','generatorType','definitionPath','qualityStatus','components']);if(!Array.isArray(d.components))throw Error('Missing components');for(const c of d.components){object(c,['id','role','artworkPath','sha256','sourceSHA256','pixelWidth','pixelHeight','anchor','safeBounds','alphaBounds','nominalLengthFt','nominalWidthFt','weight','qualityStatus','provenance']);object(c.provenance,['sourceRevision','author','license','changeSummary'])}}
}
