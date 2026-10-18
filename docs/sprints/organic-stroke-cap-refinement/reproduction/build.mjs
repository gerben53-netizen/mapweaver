import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import console from 'node:console'
import { Buffer } from 'node:buffer'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'vite'
import { unzipSync, strFromU8, zipSync, strToU8 } from 'fflate'
import sharp from 'sharp'

const root='docs/sprints/organic-stroke-cap-refinement'
const baseline=execFileSync('git',['show','95db985:src/domain/landBrush.ts'],{encoding:'utf8'})
assert.equal(await fs.readFile('src/domain/organicLandFootprint.ts','utf8'),execFileSync('git',['show','95db985:src/domain/organicLandFootprint.ts'],{encoding:'utf8'}))
await fs.mkdir('.qa.local/organic-cap',{recursive:true})
await fs.writeFile('.qa.local/organic-cap/baseline.ts',baseline.replaceAll("from './","from '../../src/domain/"))
const v=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},plugins:[{name:'proof-mask-observer',enforce:'pre',transform(code,id){if(/\/(landBrush|baseline)\.ts$/.test(id.replaceAll('\\','/'))){const anchor=' if(!mask.length)return';assert.equal(code.split(anchor).length,2);return code.replace(anchor,' proofMask=structuredClone(mask);\n'+anchor)+'\nexport let proofMask:MultiPolygon=[];\n'}}}],appType:'custom'})
const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex')
try{
 const B=await v.ssrLoadModule('/src/domain/landBrush.ts'),O=await v.ssrLoadModule('/.qa.local/organic-cap/baseline.ts'),A=await v.ssrLoadModule('/src/domain/areas.ts'),F=await v.ssrLoadModule('/src/projects/format.ts'),C=await v.ssrLoadModule('/src/domain/organicStrokeCaps.ts')
 const bytes=await fs.readFile('docs/audits/2026-10-elyra-v3-geographic-accuracy/elyra-v3-geography.mapweaver'),base=JSON.parse(strFromU8(unzipSync(bytes)['project.json']))
 const previous=JSON.parse(await fs.readFile('docs/sprints/organic-land-brush-refinement/performance-results.json'))
 const apply=(objects,result)=>{const changed=new Set([...result.removed,...result.replacements.map(o=>o.id)]);return[...objects.filter(o=>!changed.has(o.id)),...result.replacements,...result.added]}
 const count=objects=>({areas:objects.length,polygons:objects.reduce((n,o)=>n+o.geometry.polygons.length,0),nodes:objects.reduce((n,o)=>n+A.allRings(o.geometry).flat().length,0)})
 const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]
 const records=[]
 for(const record of previous.records){
  let objects=globalThis.structuredClone(base.objects),oldObjects=globalThis.structuredClone(base.objects)
  const operations=[]
  for(const[index,s]of record.operations.entries()){
   const brush={...B.defaultLandBrush,shape:s.shape,action:s.action,size:s.size,softness:s.softness,roughness:s.irregularity,smoothing:s.smoothing}
   const input={lands:objects,editable:objects.map(o=>o.id),map:base.map,brush,points:s.points,seed:s.seed,newId:`cap-${record.variant}-${index}`}
   const oldInput={...input,lands:oldObjects,editable:oldObjects.map(o=>o.id)}
   const oldTimes=[],newTimes=[]
   // Same preceding BASELINE geometry for both timings, alternating call order.
   for(let run=0;run<9;run++)for(const[engine,times]of(run%2?[[B,newTimes],[O,oldTimes]]:[[O,oldTimes],[B,newTimes]])){
    const start=performance.now();engine.applyLandStroke(oldInput);if(run>=2)times.push(performance.now()-start)
   }
   const oldResult=O.applyLandStroke(oldInput),newResult=B.applyLandStroke(input)
   oldObjects=apply(oldObjects,oldResult);objects=apply(objects,newResult);objects.forEach(A.validateArea)
   operations.push({action:s.action,shape:s.shape,size:s.size,softness:s.softness,irregularity:s.irregularity,smoothing:s.smoothing,seed:s.seed,points:s.points,baselineGeometryBefore:s.before,baselineGeometryAfter:s.after,changedBefore:oldResult.replacements.length+oldResult.added.length+oldResult.removed.length>0,changed:newResult.replacements.length+newResult.added.length+newResult.removed.length>0,beforeMs:median(oldTimes),afterMs:median(newTimes),beforeRunsMs:oldTimes,afterRunsMs:newTimes,result:count(objects),samples:B.resampleLandStroke(s.points,s.size).length})
  }
  const doc=F.parseProject({...base,id:`cap-${record.variant}-2026-10`,name:`Cap refinement — ${record.variant}`,modifiedAt:new Date().toISOString(),objects,layers:base.layers.map(l=>({...l,objectIds:objects.map(o=>o.id)}))})
  const oldDoc=JSON.parse(await fs.readFile(`docs/sprints/organic-land-brush-refinement/projects/${record.variant}.json`))
  assert.equal(hash(oldObjects.map(o=>o.geometry)),hash(oldDoc.objects.map(o=>o.geometry)))
  if(record.variant==='round')assert.deepEqual(objects,oldObjects)
  await fs.writeFile(`${root}/projects/${record.variant}.json`,JSON.stringify(doc,null,2)+'\n')
  await fs.writeFile(`${root}/projects/${record.variant}.mapweaver`,zipSync({'project.json':strToU8(JSON.stringify(doc))},{level:6}))
  records.push({variant:record.variant,start:count(base.objects),end:count(objects),before:count(oldObjects),rejected:0,invalid:0,operations})
 }
 // Diagnostic details: these are contour plots, NEVER native exports.
 const oldStages=JSON.parse(await fs.readFile('docs/audits/2026-10-organic-stroke-geometry-diagnostic/diagnostic-stages.json'))
 const input=oldStages['long-multiturn'].input
 O.applyLandStroke(input);const before=globalThis.structuredClone(O.proofMask)
 B.applyLandStroke(input);const after=globalThis.structuredClone(B.proofMask)
 const samples=B.resampleLandStroke(input.points,input.brush.size),scales=C.organicCapScales(samples,input.brush.size)
 const bodyChecks=samples.map((p,i)=>{const prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)],angle=Math.atan2(next.y-prev.y,next.x-prev.x),ring=B.landFootprint(p,input.brush,input.seed,angle);return{index:i,scale:scales[i],exact:scales[i]===1?C.shapeOrganicCap(ring,p,angle,scales[i])===ring:null}})
 assert(bodyChecks.some(c=>c.exact));assert(bodyChecks.filter(c=>c.scale===1).every(c=>c.exact))
 const path=m=>m.map(p=>p.map(r=>'M'+r.map(([x,y])=>`${x},${y}`).join('L')+'Z').join('')).join('')
 const details=[['stroke-start',{x:440,y:90,width:260,height:260},input],['stroke-body',{x:510,y:340,width:260,height:260},input],['stroke-end',{x:500,y:720,width:260,height:260},input],['short-stroke',{x:620,y:1040,width:130,height:130},oldStages['native-remove-bay'].input],['curved-stroke',{x:440,y:100,width:390,height:830},input]]
 for(const[name,crop,trial]of details){
  O.applyLandStroke(trial);const old=globalThis.structuredClone(O.proofMask);B.applyLandStroke(trial);const next=B.proofMask
  const panel=(m,title)=>`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="600"><rect width="100%" height="100%" fill="#17272e"/><text x="15" y="25" fill="white" font-size="18">${title}</text><text x="15" y="48" fill="#edc281" font-size="13">DIAGNOSTIC CONTOUR — not a native export</text><svg x="15" y="65" width="470" height="510" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}"><path d="${path(m)}" fill="#cbb785" stroke="#eee1b5" fill-rule="evenodd" stroke-width=".8"/></svg></svg>`
  await sharp({create:{width:1000,height:600,channels:4,background:'#17272e'}}).composite([{input:Buffer.from(panel(old,'Before — '+name)),left:0,top:0},{input:Buffer.from(panel(next,'After — '+name)),left:500,top:0}]).png().toFile(`${root}/details/${name}.png`)
 }
 await fs.writeFile(`${root}/performance-results.json`,JSON.stringify({status:'Native UI verification pending',baselineCommit:'95db985',baseArchiveSha256:hash(bytes),method:'Two warmups, seven alternating-order runs; medians on identical baseline preceding geometry. Vite SSR includes read-only mask observation overhead. Native exports measured separately.',memoryDeltaBytes:null,memoryReason:'Shared Node process/JIT/GC makes attributable per-stroke memory unreliable; no allocation claim.',bodyChecks,records,diagnosticMaskHashes:{before:hash(before),after:hash(after)},knownDifferenceMetric:{value:null,reason:'Known high-density polygon-clipping difference failure retained in prior audit; this sprint uses contours and native raster comparisons, no precision workaround.'}},null,2)+'\n')
 console.log(JSON.stringify(records.map(r=>({variant:r.variant,before:r.before,after:r.end})),null,2))
}finally{await v.close()}
