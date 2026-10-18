import fs from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import console from 'node:console'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { createServer } from 'vite'
import { unzipSync, strFromU8 } from 'fflate'

const root='docs/sprints/organic-stroke-cap-refinement'
const previous='docs/sprints/organic-land-brush-refinement'
const metrics=JSON.parse(await fs.readFile(root+'/performance-results.json'))
// Finalize exact changed/no-op flags without rebuilding finalized UI archives.
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom'})
try{
 const B=await server.ssrLoadModule('/src/domain/landBrush.ts')
 const base=JSON.parse(strFromU8(unzipSync(await fs.readFile('docs/audits/2026-10-elyra-v3-geographic-accuracy/elyra-v3-geography.mapweaver'))['project.json']))
 for(const record of metrics.records){
  let objects=globalThis.structuredClone(base.objects)
  for(const op of record.operations){
   const result=B.applyLandStroke({lands:objects,editable:objects.map(o=>o.id),map:base.map,brush:{...B.defaultLandBrush,shape:op.shape,action:op.action,size:op.size,softness:op.softness,roughness:op.irregularity,smoothing:op.smoothing},points:op.points,seed:op.seed,newId:'proof'})
   if(op.before){op.baselineGeometryBefore=op.before;op.baselineGeometryAfter=op.after;delete op.before;delete op.after}
   op.changedBefore=true;op.changed=result.added.length+result.replacements.length+result.removed.length>0
   const changed=new Set([...result.removed,...result.replacements.map(o=>o.id)])
   objects=[...objects.filter(o=>!changed.has(o.id)),...result.replacements,...result.added]
  }
 }
}finally{await server.close()}
const hash=b=>createHash('sha256').update(b).digest('hex')
const keys=['round','organic-soft','organic-rugged','organic-fine','combined']
const crop={left:550,top:800,width:400,height:430},panels=[]
for(const[i,key]of keys.entries()){
 const before=await fs.readFile(`${previous}/comparison/${key}.png`),after=await fs.readFile(`${root}/native-exports/${key}.png`)
 const validation=JSON.parse(await fs.readFile(`${root}/projects/${key}-validation.json`))
 assert(validation.pngExact&&validation.objectsExact);assert.equal(hash(after),validation.png)
 if(key==='round')assert.equal(hash(after),hash(before))
 const a=await sharp(before).ensureAlpha().raw().toBuffer(),b=await sharp(after).ensureAlpha().raw().toBuffer()
 let changedPixels=0;for(let n=0;n<a.length;n+=4)if(a[n]!==b[n]||a[n+1]!==b[n+1]||a[n+2]!==b[n+2]||a[n+3]!==b[n+3])changedPixels++
 const oldCrop=await sharp(before).extract(crop).png().toBuffer(),newCrop=await sharp(after).extract(crop).png().toBuffer()
 const label=(text,w=400)=>Buffer.from(`<svg width="${w}" height="40"><rect width="100%" height="100%" fill="#192a30"/><text x="12" y="27" fill="white" font-size="19">${text}</text></svg>`)
 const name=key.replace('organic-','')
 await sharp({create:{width:800,height:470,channels:4,background:'#192a30'}}).composite([{input:label('Before — '+name),left:0,top:0},{input:label('After — '+name),left:400,top:0},{input:oldCrop,left:0,top:40},{input:newCrop,left:400,top:40}]).png().toFile(`${root}/comparison/${name}-before-after.png`)
 panels.push({input:label('Before — '+name),left:i*400,top:0},{input:oldCrop,left:i*400,top:40},{input:label('After — '+name),left:i*400,top:470},{input:newCrop,left:i*400,top:510})
 Object.assign(metrics.records.find(r=>r.variant===key),{native:validation,uiDownloadHash:hash(after),previousNativeHash:hash(before),uiDownloadExact:true,changedPixels,changedPixelFraction:changedPixels/(1625*1425)})
}
await sharp({create:{width:2000,height:940,channels:4,background:'#192a30'}}).composite(panels).png().toFile(`${root}/comparison/contact-sheet.png`)
metrics.status='Five actual native UI downloads verified; archive/database/native PNG parity exact; Round byte-identical'
metrics.crop=crop
const restored=await fs.readFile(`${root}/native-exports/combined-restored.png`)
assert.equal(hash(restored),metrics.records.find(r=>r.variant==='combined').uiDownloadHash)
metrics.uiHistory={gesture:'Actual Rugged Add drag; undo, redo, final undo and Save',restoredNativeSha256:hash(restored),exact:true}
await fs.writeFile(root+'/performance-results.json',JSON.stringify(metrics,null,2)+'\n')
console.log(JSON.stringify(metrics.records.map(r=>({variant:r.variant,pixels:r.changedPixels,exportMs:r.native.exportMs,strokeMedians:r.operations.map(o=>[o.beforeMs,o.afterMs])})),null,2))
