import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { Buffer } from 'node:buffer'
import console from 'node:console'
import { performance } from 'node:perf_hooks'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import clipping from 'polygon-clipping'
import sharp from 'sharp'
import { unzipSync, strFromU8 } from 'fflate'

// Research harness only. The transform observes the existing algorithm in memory;
// no product file, production bundle, database or existing evidence is written.
const out = fileURLToPath(new URL('./', import.meta.url))
await fs.mkdir(path.join(out, 'visuals'), { recursive: true })
await fs.mkdir(path.join(out, 'native-evidence'), { recursive: true })
await fs.mkdir(path.join(out, 'mask-comparisons'), { recursive: true })
const sha = v => createHash('sha256').update(typeof v === 'string' || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest('hex')
const source = await fs.readFile('src/domain/landBrush.ts', 'utf8')
let transformHits = 0
function observe(code) {
  const replace = (from, to) => {
    assert.equal(code.split(from).length, 2, `Observation anchor changed: ${from}`)
    code = code.replace(from, to)
  }
  replace('resampleLandStroke(input.points,b.size).map', '(diagnosticSamples??resampleLandStroke(input.points,b.size)).map')
  replace(' let mask:MultiPolygon=[]', ' diagnosticCapture={points:structuredClone(points),coverage:structuredClone(coverage),raw:[],attempts:[]};\n let mask:MultiPolygon=[]')
  replace(' if(!mask.length)return', ' diagnosticCapture.mask=structuredClone(mask);\n if(!mask.length)return')
  replace('g=contours(combined,b)', 'g=(diagnosticCapture.raw.push({id:touched[0]?.id??input.newId,removed:touched.slice(1).map(o=>o.id),value:structuredClone(combined)}),contours(combined,b))')
  replace("if(b.action==='remove')g=contours(clipping.difference(multi(o.geometry),mask),b)", "if(b.action==='remove'){const raw=clipping.difference(multi(o.geometry),mask);diagnosticCapture.raw.push({id:o.id,removed:[],value:structuredClone(raw)});g=contours(raw,b)}")
  replace('try{return normalizeGeometry({polygons:polygons.map', 'try{diagnosticCapture.attempts.push({tolerance,factor,minimum});return normalizeGeometry({polygons:polygons.map')
  return code + '\nexport let diagnosticCapture:any={};let diagnosticSamples:any=null;export function setDiagnosticSamples(value:any){diagnosticSamples=value}\nexport {contours as diagnosticContours,multi as diagnosticMulti,ring as diagnosticRing};\n'
}
const settings = { configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' }
const plain = await createServer(settings)
const instrumented = await createServer({ ...settings, plugins: [{ name: 'read-only-stroke-observation', enforce: 'pre', transform(code, id) { if (id.split('?')[0].replaceAll('\\', '/').endsWith('/src/domain/landBrush.ts')) { transformHits++; return observe(code) } } }] })
try {
  const B = await plain.ssrLoadModule('/src/domain/landBrush.ts')
  const I = await instrumented.ssrLoadModule('/src/domain/landBrush.ts')
  const A = await plain.ssrLoadModule('/src/domain/areas.ts')
  const L = await plain.ssrLoadModule('/src/domain/landAreas.ts')
  const toGeometry = m => ({ polygons: m.map(p => ({ outer: I.diagnosticRing(p[0]), holes: p.slice(1).map(I.diagnosticRing) })) })
  const toMulti = g => I.diagnosticMulti(g)
  const combine = gs => gs.length ? clipping.union(...gs.map(toMulti)) : []
  const rings = m => m.flatMap(p => p.map(I.diagnosticRing))
  const vertices = m => rings(m).flat()
  const area = m => m.reduce((n, p) => n + Math.abs(A.signedArea(I.diagnosticRing(p[0]))) - p.slice(1).reduce((s, h) => s + Math.abs(A.signedArea(I.diagnosticRing(h))), 0), 0)
  const delta = (a, b) => area(clipping.difference(a, b)) + area(clipping.difference(b, a))
  const comparisonFailures=[]
  async function compareMasks(name,reference,candidate,context) {
    // Save exact doubles BEFORE invoking the library. No snapping, rounding,
    // repair or substitute area value is permitted for a failed measurement.
    const record={name,context,reference,candidate,referenceHash:sha(reference),candidateHash:sha(candidate)}
    const filename=path.join(out,'mask-comparisons',name+'.json')
    await fs.writeFile(filename,JSON.stringify(record)+'\n')
    const operations=[]
    for(const [direction,a,b]of[['reference-minus-candidate',reference,candidate],['candidate-minus-reference',candidate,reference]]){
      try{operations.push({direction,status:'ok',areaPx2:area(clipping.difference(a,b))})}
      catch(error){operations.push({direction,status:'failed',error:error.message,stack:error.stack});console.error(`DIAGNOSTIC MEASUREMENT FAILURE ${name} ${direction}: ${error.message}`)}
    }
    const failed=operations.some(o=>o.status==='failed')
    const result={name,status:failed?'failed':'ok',symmetricDifferencePx2:failed?null:operations.reduce((n,o)=>n+o.areaPx2,0),operations,referenceHash:record.referenceHash,candidateHash:record.candidateHash,exactMasks:'mask-comparisons/'+name+'.json'}
    await fs.writeFile(path.join(out,'mask-comparisons',name+'-result.json'),JSON.stringify(result,null,2)+'\n')
    if(failed)comparisonFailures.push(result)
    return result
  }
  const count = m => ({ polygons: m.length, holes: m.reduce((n,p) => n+p.length-1,0), vertices: vertices(m).length })
  function rawChecks(m) {
    let properCrossings=0,zeroLengthEdges=0,minimumEdge=Infinity
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
    for(const r of rings(m)) for(let j=0;j<r.length;j++){
      const a=r[j],b=r[(j+1)%r.length],length=A.distance(a,b)
      minimumEdge=Math.min(minimumEdge,length);if(length<=1e-9)zeroLengthEdges++
      for(let k=j+2;k<r.length;k++){
        if(j===0&&k===r.length-1)continue
        const c=r[k],d=r[(k+1)%r.length]
        if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)properCrossings++
      }
    }
    return{finite:vertices(m).every(p=>Number.isFinite(p.x+p.y)),properCrossings,zeroLengthEdges,minimumEdge,method:'Strict proper same-ring crossings; excludes collinear/touching cases. Saved Areas separately undergo full native validation.'}
  }
  const distRing = (p, r) => Math.min(...r.map((v,j) => A.distance(p,A.closestPoint(p,v,r[(j+1)%r.length]))))
  const dist = (p, m) => Math.min(...rings(m).map(r => distRing(p,r)))
  const boundaryDelta = (a,b) => Math.max(0,...vertices(a).map(p=>dist(p,b)),...vertices(b).map(p=>dist(p,a)))
  const apply = (lands, r) => { const changed = new Set([...r.removed,...r.replacements.map(o=>o.id)]); return [...lands.filter(o=>!changed.has(o.id)),...r.replacements,...r.added] }
  const brush = (shape='organicRugged', size=120, action='add') => ({ ...B.defaultLandBrush,shape,size,action,softness:0,roughness:.65,smoothing:'off' })
  const rectangle = { ...A.createArea(A.rectangleGeometry({x:150,y:100,width:400,height:850})),id:'diagnostic-rectangle',land:L.defaultLandArea('landmass') }
  const map = { width:1100,height:1050 }
  const make = (lands, points, patch={}) => ({ lands,editable:lands.map(o=>o.id),map,points,brush:brush(),seed:713,newId:'diagnostic-new',...patch })
  const basePath='docs/audits/2026-10-elyra-v3-geographic-accuracy/elyra-v3-geography.mapweaver'
  const baseBytes = await fs.readFile(basePath)
  const base = JSON.parse(strFromU8(unzipSync(baseBytes)['project.json']))
  const priorMetrics = JSON.parse(await fs.readFile('docs/sprints/organic-land-brush-refinement/performance-results.json'))
  const priorRugged = priorMetrics.records.find(r=>r.variant==='organic-rugged')
  const resultCases=[]
  let lands=globalThis.structuredClone(base.objects)
  for (const [index,step] of priorRugged.operations.entries()) {
    const input=make(lands,step.points,{map:base.map,brush:brush('organicRugged',step.size,step.action),seed:step.seed})
    resultCases.push({ name:['native-first-remove','native-add-cape','native-remove-bay'][index],input })
    lands=apply(lands,B.applyLandStroke(input))
  }
  const previousDoc=JSON.parse(await fs.readFile('docs/sprints/organic-land-brush-refinement/projects/organic-rugged.json'))
  assert.equal(sha(lands.map(o=>o.geometry)),sha(previousDoc.objects.map(o=>o.geometry)), 'Replayed native Rugged geometry differs')
  const long = make([rectangle],[{x:530,y:180},{x:600,y:280},{x:540,y:400},{x:640,y:500},{x:580,y:640},{x:690,y:740},{x:610,y:840}])
  const sharpTurn = make([rectangle],[{x:530,y:350},{x:680,y:350},{x:680,y:580},{x:585,y:390}])
  resultCases.push({name:'long-multiturn',input:long},{name:'sharp-turn',input:sharpTurn})
  resultCases.push({name:'repeated-same-seed',input:{...long,lands:apply(long.lands,B.applyLandStroke(long))}})
  resultCases.push({name:'overlap-next-seed',input:{...long,lands:apply(long.lands,B.applyLandStroke(long)),seed:714}})
  const measures=[], captures={}
  function capture(name,input,override=null) {
    I.setDiagnosticSamples(override)
    const started=performance.now(),result=I.applyLandStroke(input),elapsed=performance.now()-started
    const obs=globalThis.structuredClone(I.diagnosticCapture),final=apply(input.lands,result)
    if (!override) assert.deepEqual(result,B.applyLandStroke(input),`Instrumentation changes ${name}`)
    for(const f of obs.coverage) A.normalizeGeometry(toGeometry(f))
    final.forEach(A.validateArea)
    const rawIds=new Set(obs.raw.flatMap(r=>[r.id,...r.removed]))
    const rawLand=[...input.lands.filter(o=>!rawIds.has(o.id)).map(o=>toMulti(o.geometry)),...obs.raw.map(r=>r.value)]
    const C=rawLand.length?clipping.union(...rawLand):[],D=combine(final.map(o=>o.geometry)),mask=obs.mask
    const normalized=obs.raw.map(r=>{try { const g=A.normalizeGeometry(toGeometry(r.value));return{valid:true,boundaryChange:boundaryDelta(r.value,toMulti(g)),areaChange:delta(r.value,toMulti(g))} }catch(e){return{valid:false,reason:e.message}}})
    const footprintRings=obs.coverage.map(f=>rings(f)[0]),perimeter={start:0,end:0,body:0,unattributed:0}
    for(const r of rings(mask)) for(const [j,p] of r.entries()) {
      const q=r[(j+1)%r.length],mid={x:(p.x+q.x)/2,y:(p.y+q.y)/2},length=A.distance(p,q)
      const index=footprintRings.findIndex(f=>distRing(mid,f)<1e-5)
      perimeter[index===0?'start':index===footprintRings.length-1?'end':index>=0?'body':'unattributed']+=length
    }
    const last=obs.points.at(-1),first=obs.points[0],radius=input.brush.size/2
    const capBoundary=vertices(C).filter(p=>A.distance(p,last)<=radius*1.25||A.distance(p,first)<=radius*1.25)
    const measure={name,shape:input.brush.shape,action:input.brush.action,seed:input.seed,size:input.brush.size,spacing:override?'diagnostic override':Math.max(2,input.brush.size*.12),samples:obs.points.length,footprintVertices:footprintRings[0].length,rawMask:count(mask),rawLand:count(C),finalLand:count(D),savedAreas:final.length,savedNodes:final.reduce((n,o)=>n+A.allRings(o.geometry).flat().length,0),rawMaskChecks:rawChecks(mask),rawLandChecks:rawChecks(C),simplificationAttempts:obs.attempts,normalization:normalized,cToDBoundaryVertexDistancePx:boundaryDelta(C,D),cToDCapVertexDistancePx:Math.max(0,...capBoundary.map(p=>dist(p,D))),cToDSymmetricDifferencePx2:delta(C,D),cToDAreaDifferencePercent:delta(C,D)/Math.max(1,area(C))*100,rawExposedBoundaryLengthPx:perimeter,geometryMs:elapsed,validFootprints:true,validSavedAreas:true,sourceResultHash:sha(result),rawMaskHash:sha(mask),finalGeometryHash:sha(final.map(o=>o.geometry))}
    assert.deepEqual(result,I.applyLandStroke(input),`Non-deterministic ${name}`)
    const data={input,observation:obs,C,D,final,result,measure}
    measures.push(measure);captures[name]=data;return data
  }
  for(const c of resultCases) {capture(c.name,c.input);capture(c.name+'-round',{...c.input,brush:{...c.input.brush,shape:'round'}})}
  const sensitivities=[]
  const reference=captures['long-multiturn']
  const sampleOverride=(fraction)=>B.resampleLandStroke(long.points,long.brush.size*fraction/.12)
  for (const [label,input,samples] of [
    ['low-density',long,sampleOverride(.35)],['high-density',long,sampleOverride(.04)],
    ['reversed',{...long,points:[...long.points].reverse()},null],
    ['seed-714',{...long,seed:714},null],['size-60',{...long,brush:{...long.brush,size:60}},null],['size-240',{...long,brush:{...long.brush,size:240}},null],
    ['smoothing-high',{...long,brush:{...long.brush,smoothing:'high'}},null],
  ]) {
    const d=capture(label,input,samples)
    const comparison=await compareMasks(label,reference.observation.mask,d.observation.mask,{input,samples,source:'raw B masks; additional diagnostic comparison, not product operation'})
    sensitivities.push({name:label,comparison,maskSymmetricDifferencePx2:comparison.symmetricDifferencePx2,maskBoundaryVertexDistancePx:boundaryDelta(reference.observation.mask,d.observation.mask),samples:d.observation.points.length})
  }
  // Same known polyline with extra event subdivisions; not an invented mouse-speed simulation.
  const dense=long.points.flatMap((p,i)=>i===long.points.length-1?[p]:Array.from({length:10},(_,n)=>({x:p.x+(long.points[i+1].x-p.x)*n/10,y:p.y+(long.points[i+1].y-p.y)*n/10})))
  const denseData=capture('dense-pointer-events',{...long,points:dense})
  const denseComparison=await compareMasks('dense-pointer-events',reference.observation.mask,denseData.observation.mask,{input:{...long,points:dense},source:'raw B masks'})
  sensitivities.push({name:'dense-pointer-events',comparison:denseComparison,maskSymmetricDifferencePx2:denseComparison.symmetricDifferencePx2,maskBoundaryVertexDistancePx:boundaryDelta(reference.observation.mask,denseData.observation.mask),samples:denseData.observation.points.length})
  const angles=[0,.7,Math.PI].map(a=>B.landFootprint(long.points[0],long.brush,long.seed,a))
  assert.deepEqual(angles[0],angles[1]);assert.deepEqual(angles[0],angles[2])
  const ablations=[]
  const coverage=reference.observation.coverage
  for(const drop of [1,2,3]) {
    const mask=clipping.union(...coverage.slice(drop,-drop)),end=reference.observation.points.at(-1-drop)
    const comparison=await compareMasks('drop-'+drop,reference.observation.mask,mask,{drop,source:'endpoint-removal ablation only'})
    ablations.push({droppedAtEachEnd:drop,remainingSamples:coverage.length-drop*2,newEndCenter:end,comparison,maskSymmetricDifferencePx2:comparison.symmetricDifferencePx2,description:'Diagnostic removal of endpoint footprints only; adjacent footprint becomes the new cap. Not a proposed product fix.'})
    captures['drop-'+drop]={...reference,observation:{...reference.observation,mask},C:mask,D:mask}
  }
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
  const polygonPath=m=>m.map(p=>p.map(r=>'M'+r.map(([x,y])=>`${x},${y}`).join('L')+'Z').join('')).join('')
  function cropFor(d){const pts=d.input.points,r=d.input.brush.size*.7;return{x:Math.min(...pts.map(p=>p.x))-r,y:Math.min(...pts.map(p=>p.y))-r,width:Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x))+2*r,height:Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))+2*r}}
  function panel(d,stage,title,crop,overlay=false){
    const scale=Math.min(390/crop.width,540/crop.height),w=430,h=640
    const line=(m,color,fill='none',opacity=1,width=1)=>`<path d="${polygonPath(m)}" fill="${fill}" fill-rule="evenodd" stroke="${color}" stroke-width="${width/scale}" opacity="${opacity}"/>`
    let content=''
    if(stage==='A') {
      content+=line(combine(d.input.lands.map(o=>o.geometry)),'#52656b','#233b43')
      content+=d.observation.coverage.map(f=>line(f,'#8ed4b3','none',.6,.7)).join('')
      content+=`<polyline points="${d.input.points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="#ffb068" stroke-width="${1.5/scale}"/>`
      content+=d.observation.points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${2/scale}" fill="#fafafa"/>${i%8===0?`<text x="${p.x+4/scale}" y="${p.y-4/scale}" font-size="${10/scale}" fill="white">${i}</text>`:''}`).join('')
      content+=d.observation.points.map((p,i,pts)=>{if(i%8)return'';const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],angle=Math.atan2(b.y-a.y,b.x-a.x);return`<line x1="${p.x}" y1="${p.y}" x2="${p.x+Math.cos(angle)*16/scale}" y2="${p.y+Math.sin(angle)*16/scale}" stroke="#ffb068" stroke-width="${1/scale}"/>`}).join('')
    } else if(stage==='B') content+=line(d.observation.mask,'#f0b960','#d0a266')
    else {content+=line(stage==='C'?d.C:d.D,'#f0d68c','#c8bb8a');if(overlay)content+=line(d.C,'#58deed','none',.9,1)}
    const first=d.input.points[0],last=d.input.points.at(-1),radius=d.input.brush.size/2
    for(const[p,color,label]of[[first,'#81b9ff','S'],[last,'#ff8bdb','E']])content+=`<circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="none" stroke="${color}" stroke-dasharray="${4/scale},${4/scale}" stroke-width="${1/scale}"/><circle cx="${p.x}" cy="${p.y}" r="${4/scale}" fill="${color}"/><text x="${p.x+7/scale}" y="${p.y-7/scale}" fill="${color}" font-size="${14/scale}">${label}</text>`
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#15262d"/><text x="15" y="24" fill="white" font-size="16">${escape(title)}</text><text x="15" y="44" fill="#e7bc76" font-size="12">DIAGNOSTIC — not a native map export</text><svg x="20" y="60" width="390" height="540" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" preserveAspectRatio="xMinYMin meet">${content}</svg><text x="15" y="620" fill="#bed0d5" font-size="11">S=start; E=end; circles=nominal radius; same crop/scale</text></svg>`
  }
  async function sheet(filename,items,crop){const buffers=await Promise.all(items.map(([d,s,title,overlay])=>sharp(Buffer.from(panel(d,s,title,crop,overlay))).png().toBuffer()));await sharp({create:{width:430*items.length,height:640,channels:4,background:'#15262d'}}).composite(buffers.map((input,i)=>({input,left:i*430,top:0}))).png().toFile(path.join(out,'visuals',filename))}
  for(const name of ['long-multiturn','sharp-turn','native-add-cape','native-remove-bay','repeated-same-seed','overlap-next-seed']) {
    const d=captures[name]
    await sheet(name==='long-multiturn'?'rugged-stages-a-b-c-d.png':name+'-stages.png',[[d,'A','A — samples / footprints'],[d,'B','B — raw stroke union'],[d,'C','C — raw land boolean'],[d,'D','D — saved contour']],cropFor(d))
  }
  await sheet('round-vs-rugged.png',[[captures['long-multiturn-round'],'B','Round raw body + caps'],[reference,'B','Rugged raw body + caps']],cropFor(reference))
  for(const[name,filename]of[['native-add-cape','add-endcap.png'],['native-remove-bay','remove-endcap.png']]){
    const d=captures[name];await sheet(filename,[[d,'B','Raw mask / inherited endcap'],[d,'D','Saved land; cyan = raw C',true]],cropFor(d))
  }
  await sheet('low-vs-high-sampling.png',[[captures['low-density'],'B','Low: 0.35 × diameter'],[reference,'B','Current: 0.12 × diameter'],[captures['high-density'],'B','High: 0.04 × diameter']],cropFor(reference))
  await sheet('pre-vs-post-simplification.png',[[reference,'C','C — no RDP'],[reference,'D','D — RDP; cyan = C',true]],cropFor(reference))
  await sheet('endpoint-removal-ablation.png',[[reference,'B','Current complete coverage'],[captures['drop-1'],'B','Drop first/last one footprint'],[captures['drop-3'],'B','Drop first/last three footprints']],cropFor(reference))
  const native=[]
  for(const key of ['organic-rugged','round']) {
    const origin=`docs/sprints/organic-land-brush-refinement/comparison/${key}.png`,bytes=await fs.readFile(origin)
    const validation=JSON.parse(await fs.readFile(`docs/sprints/organic-land-brush-refinement/projects/${key}-validation.json`))
    assert.equal(sha(bytes),validation.png)
    await fs.copyFile(origin,path.join(out,'native-evidence',`${key}-existing-native.png`))
    native.push({origin,copy:`native-evidence/${key}-existing-native.png`,sha256:sha(bytes),nativeUiDownload:true,newExport:false,sourceCommit:'e502a937f283be4c6e503b3603e28dc1fcae7c71',geometryReplayConfirmed:key==='organic-rugged'})
  }
  await fs.writeFile(path.join(out,'reproduction-parameters.json'),JSON.stringify({head:'e502a937f283be4c6e503b3603e28dc1fcae7c71',sourceSha256:sha(source),baseArchive:basePath,baseSha256:sha(baseBytes),native,cases:resultCases.map(c=>({name:c.name,input:c.input})),sensitivity:'Only diagnostic override samples differ for density tests. All production-default comparisons observe identical inputs through A/B/C/D.',fixtureDeviation:'Long/sharp/repeat use an explicitly synthetic rectangle to isolate body/caps; native Add/Remove exactly replay Northreach sequential inputs. No existing data modified.'},null,2)+'\n')
  await fs.writeFile(path.join(out,'geometry-measurements.json'),JSON.stringify({status:comparisonFailures.length?'Completed with explicitly unavailable difference measurements':'Completed',comparisonFailures,sourceSha256:sha(source),transformHits,defaultSamplingObservedResultEqualsUnmodified:true,diagnosticOverrides:'Low/high density intentionally override sample positions in memory; these two results are not asserted equal to default production sampling. All captured footprints and saved Areas are validated.',deterministic:true,orientationArgumentIgnoredForRugged:true,nativeReplayExact:true,measurements:measures,sensitivities,endpointAblations:ablations,metricCaveat:'Boundary distance uses symmetric vertex-to-segment distances, not exact continuous Hausdorff distance. Area differences use the existing polygon-clipping library; failed results are null and retain original errors and masks. Timings include instrumentation and are not production latency benchmarks.'},null,2)+'\n')
  await fs.writeFile(path.join(out,'diagnostic-stages.json'),JSON.stringify(captures)+'\n')
  assert.equal(await fs.readFile('src/domain/landBrush.ts','utf8'),source)
  console.log(JSON.stringify({captures:measures.length,transformHits,nativeReplayExact:true,summary:measures.slice(0,14).map(m=>({name:m.name,samples:m.samples,B:m.rawMask.vertices,C:m.rawLand.vertices,D:m.finalLand.vertices,capDelta:m.cToDCapVertexDistancePx,areaDelta:m.cToDAreaDifferencePercent})),sensitivities},null,2))
} finally { await instrumented.close(); await plain.close() }
