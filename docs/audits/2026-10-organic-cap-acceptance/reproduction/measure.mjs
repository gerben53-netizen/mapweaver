import fs from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createServer} from 'vite'
import {unzipSync,strFromU8,zipSync,strToU8} from 'fflate'
import sharp from 'sharp'

const root='docs/audits/2026-10-organic-cap-acceptance'
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex')
for(const dir of ['projects','masks','native-exports','comparison','reproduction','screenshots'])await fs.mkdir(`${root}/${dir}`,{recursive:true})
await fs.mkdir('.qa.local/cap-acceptance',{recursive:true})
const baseline=execFileSync('git',['show','95db985:src/domain/landBrush.ts'],{encoding:'utf8'})
assert.equal(await fs.readFile('src/domain/organicLandFootprint.ts','utf8'),execFileSync('git',['show','95db985:src/domain/organicLandFootprint.ts'],{encoding:'utf8'}))
await fs.writeFile('.qa.local/cap-acceptance/baseline.ts',baseline.replaceAll("from './","from '../../src/domain/"))
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null,hmr:false,ws:false},appType:'custom',plugins:[{name:'read-only-mask-observer',enforce:'pre',transform(code,id){if(/\/(landBrush|baseline)\.ts$/.test(id.replaceAll('\\','/'))){const a=' if(!mask.length)return';assert.equal(code.split(a).length,2);return code.replace(a,' proofMask=structuredClone(mask);\n'+a)+'\nexport let proofMask:MultiPolygon=[];\n'}}}]})
const D=40, p=(x,y)=>({x,y}), fixtures=[
 ['T01',[p(50,170),p(290,170)]],['T02',[p(170,50),p(170,290)]],
 ['T03',[p(70,70),p(240,240)]],
 ['T04',Array.from({length:49},(_,i)=>p(50+i*5,170+55*Math.sin(i/48*Math.PI*2)))],
 ['T05',[p(60,80),p(270,80),p(270,270),p(160,150)]],
 ['T06',[p(150,170),p(166,170)]],['T07',[p(150,170),p(150.8,170)]],
 ['T08',[p(150,170)]],['T09',[p(50,170),p(290,170)]]]
const apply=(objects,r)=>{const ids=new Set([...r.removed,...r.replacements.map(o=>o.id)]);return [...objects.filter(o=>!ids.has(o.id)),...r.replacements,...r.added]}
const arc=points=>{const ds=[0];for(let i=1;i<points.length;i++)ds.push(ds.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));return {ds,length:ds.at(-1)}}
function at(points,s){const{ds,length}=arc(points);let i=s<0?1:s>length?points.length-1:ds.findIndex((d,k)=>k&&d>=s);if(i<1)i=points.length-1;const a=points[i-1],b=points[i],l=ds[i]-ds[i-1],t=(s-ds[i-1])/l;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,tx:(b.x-a.x)/l,ty:(b.y-a.y)/l}}
function width(mask,c){const hits=[];for(const poly of mask)for(const ring of poly)for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1],u=(a[0]-c.x)*c.tx+(a[1]-c.y)*c.ty,v=(b[0]-c.x)*c.tx+(b[1]-c.y)*c.ty;if((u<=0&&v>0)||(v<=0&&u>0)){const t=-u/(v-u);hits.push(-(a[0]+t*(b[0]-a[0])-c.x)*c.ty+(a[1]+t*(b[1]-a[1])-c.y)*c.tx)}}hits.sort((a,b)=>a-b);return hits.length>1?hits.at(-1)-hits[0]:0}
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)]
function capMetrics(before,after,points,d,end){const {length}=arc(points);if(length<3.2*d)return {cbrBefore:null,cbrAfter:null,ctcAfter:null,improvement:null,reason:'No non-overlapping adjacent stable body window (requires length >= 3.2D).'};const loc=s=>at(points,end?length-s:s),body=[];for(let s=.8*d;s<=1.6*d;s+=1)body.push(width(before,loc(s))/2);const ref=median(body);const measure=mask=>{const ws=[];for(let s=-.5*d;s<=.8*d;s+=1)ws.push(width(mask,loc(s)));return {cbr:Math.max(0,Math.max(...ws)/2-ref)/d,ctc:Math.max(...ws.slice(1).map((w,i)=>Math.abs(w-ws[i])))/d}};const b=measure(before),a=measure(after);return {cbrBefore:b.cbr,cbrAfter:a.cbr,ctcBefore:b.ctc,ctcAfter:a.ctc,improvement:b.cbr>1e-6?(b.cbr-a.cbr)/b.cbr:null,bodyHalfWidth:ref,reason:b.cbr<=1e-6?'CI N/A: baseline CBR <= 1e-6.':null,cbrStatus:a.cbr<=.1?'PASS':a.cbr<=.15?'REVIEW':'FAIL',ctcStatus:a.ctc<=.08?'PASS':a.ctc<=.12?'REVIEW':'FAIL'}}
function projection(points,x,y){let best=Infinity,s=0,offset=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(l*l))),dist=(x-a.x-t*dx)**2+(y-a.y-t*dy)**2;if(dist<best){best=dist;s=offset+t*l}offset+=l}return s}
const path=mask=>mask.map(poly=>poly.map(r=>'M'+r.map(([x,y])=>`${x},${y}`).join('L')+'Z').join('')).join('')
async function bp(before,after,points,d){const {length}=arc(points);if(length<3.2*d)return null;const render=async m=>sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 360 360"><path fill="white" fill-rule="evenodd" d="${path(m)}"/></svg>`)).ensureAlpha().raw().toBuffer();const [a,b]=await Promise.all([render(before),render(after)]);let n=0,diff=0;for(let y=0;y<720;y++)for(let x=0;x<720;x++){const s=projection(points,(x+.5)/2,(y+.5)/2);if(s<.6*d||s>length-.6*d)continue;const i=(y*720+x)*4+3,old=a[i]>=128,next=b[i]>=128;if(old)n++;if(old!==next)diff++}return {value:n?1-diff/n:null,originalPixels:n,symmetricDifferencePixels:diff,pixelSize:.5}}
const toGeometry=mask=>({polygons:mask.map(poly=>({outer:poly[0].slice(0,-1).map(([x,y])=>p(x,y)),holes:poly.slice(1).map(r=>r.slice(0,-1).map(([x,y])=>p(x,y)))}))})
try{
 const B=await vite.ssrLoadModule('/src/domain/landBrush.ts'),O=await vite.ssrLoadModule('/.qa.local/cap-acceptance/baseline.ts'),A=await vite.ssrLoadModule('/src/domain/areas.ts'),F=await vite.ssrLoadModule('/src/projects/format.ts'),C=await vite.ssrLoadModule('/src/domain/organicStrokeCaps.ts')
 const base=JSON.parse(strFromU8(unzipSync(await fs.readFile('docs/audits/2026-10-elyra-v3-geographic-accuracy/elyra-v3-geography.mapweaver'))['project.json']))
 const records=[],round=[];const historical=JSON.parse(await fs.readFile('docs/sprints/organic-land-brush-refinement/performance-results.json'))
 for(const [key,shape] of [['organic-soft','organicSoft'],['organic-rugged','organicRugged'],['organic-fine','organicFine'],['round','round']]){
  const atlas={before:[],after:[]}
  for(const [index,[testId,points]] of fixtures.entries()){
   const brush={...B.defaultLandBrush,shape,action:'add',size:D,softness:0,roughness:.65,smoothing:'off'},input={lands:[],editable:[],map:{width:360,height:360},brush,points,seed:713,newId:`${key}-${testId}`},masks={},outputs={};let geometryValid=true;const errors=[]
   for(const [version,engine] of [['before',O],['after',B]]){
    try{let r=engine.applyLandStroke(input);masks[version]=structuredClone(engine.proofMask);outputs[version]=apply([],r);if(testId==='T09'){const next={...input,lands:outputs[version],editable:outputs[version].map(o=>o.id),points:points.map(q=>p(q.x,q.y+12)),seed:714,newId:input.newId+'-overlap'};r=engine.applyLandStroke(next);outputs[version]=apply(outputs[version],r)}
     for(const o of outputs[version])A.validateArea(o)
     if(outputs[version].length!==1||outputs[version][0].geometry.polygons.length!==1||outputs[version][0].geometry.polygons[0].holes.length)throw Error('Unexpected fragments/holes or rejected Add')
     // Validate every actual footprint with the native ring validator.
     const samples=engine.resampleLandStroke(points,D),scales=C.organicCapScales(samples,D)
     for(const [i,q]of samples.entries()){const prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)],angle=Math.atan2(next.y-prev.y,next.x-prev.x),ring=engine.landFootprint(q,brush,713,angle),r=version==='after'&&shape!=='round'?C.shapeOrganicCap(ring,q,angle,scales[i]):ring;A.normalizeGeometry({polygons:[{outer:r,holes:[]}]})}
     const rect=A.createArea(A.rectangleGeometry({x:5,y:5,width:350,height:350}),{kind:'solid',color:'#b5bb89'});rect.land=structuredClone(outputs[version][0].land)
     const removed=engine.applyLandStroke({...input,lands:[rect],editable:[rect.id],brush:{...brush,action:'remove'}});if(!removed.replacements.length&&!removed.removed.length)throw Error('Unexpected rejected Remove');for(const o of removed.replacements)A.validateArea(o)
    }catch(e){geometryValid=false;errors.push(`${version}: ${e.message}`);masks[version]=structuredClone(engine.proofMask)}
    const dx=index%3*360,dy=Math.floor(index/3)*360
    atlas[version].push(...(outputs[version]||[]).map(o=>A.withGeometry(o,{polygons:o.geometry.polygons.map(poly=>({outer:poly.outer.map(q=>p(q.x+dx,q.y+dy)),holes:poly.holes.map(r=>r.map(q=>p(q.x+dx,q.y+dy)))}))})))
   }
   if(key==='round'){assert.deepEqual(outputs.before,outputs.after);round.push({testId,geometryExact:true});continue}
   if(!masks.before||!masks.after)throw Error(JSON.stringify({key,testId,errors,maskKeys:Object.keys(masks)}))
   const before=testId==='T09'?toMulti(outputs.before):masks.before,after=testId==='T09'?toMulti(outputs.after):masks.after
   const noMetrics=testId==='T09'?'Multiple overlapping gestures: no unique centerline/body reference; geometry and native visual comparison required.':testId==='T08'?'Dab has no directed start/end cap.':null
   const blank=()=>({cbrBefore:null,cbrAfter:null,ctcAfter:null,improvement:null,reason:noMetrics})
   const start=noMetrics?blank():capMetrics(before,after,points,D,false),end=noMetrics?blank():capMetrics(before,after,points,D,true),body=noMetrics?null:await bp(before,after,points,D)
   const result={brush:key,testId,brushDiameter:D,seed:713,points,capStart:start,capEnd:end,bodyPreservation:body?.value??null,bodyRaster:body,geometryValid,geometryErrors:errors,nativeExportVerified:null,decision:geometryValid?'VISUAL_REVIEW_PENDING':'REJECT',measurementGeometry:testId==='T09'?'Final native Area contours':'Clipped raw stroke union before simplification'}
   records.push(result);await fs.writeFile(`${root}/masks/${key}-${testId}.json`,JSON.stringify({input,before,after,finalBefore:outputs.before,finalAfter:outputs.after},null,2)+'\n')
  }
  for(const version of ['before','after']){const objects=atlas[version];const doc=F.parseProject({...base,id:`acceptance-${key}-${version}`,name:`Cap acceptance ${key} ${version}`,map:{...base.map,width:1080,height:1080},objects,layers:base.layers.map(l=>({...l,objectIds:objects.map(o=>o.id)}))});await fs.writeFile(`${root}/projects/${key}-${version}.json`,JSON.stringify(doc,null,2)+'\n');await fs.writeFile(`${root}/projects/${key}-${version}.mapweaver`,zipSync({'project.json':strToU8(JSON.stringify(doc))},{level:6}))}
  if(key==='round')continue
  const oldRecord=historical.records.find(r=>r.variant===key),chains={before:structuredClone(base.objects),after:structuredClone(base.objects)},operations=[]
  for(const [i,s] of oldRecord.operations.entries()){const op={};for(const [version,engine]of [['before',O],['after',B]]){const lands=chains[version],input={lands,editable:lands.map(o=>o.id),map:base.map,brush:{...B.defaultLandBrush,shape,action:s.action,size:s.size,softness:s.softness,roughness:s.irregularity,smoothing:s.smoothing},points:s.points,seed:s.seed,newId:`cap-${key}-${i}`};const r=engine.applyLandStroke(input);chains[version]=apply(lands,r);chains[version].forEach(A.validateArea);op[version]={changed:!!(r.replacements.length+r.added.length+r.removed.length),geometryValid:true}}operations.push({...s,beforeReplay:op.before,afterReplay:op.after})}
  for(const version of ['before','after']){const previous=`docs/sprints/${version==='before'?'organic-land-brush-refinement':'organic-stroke-cap-refinement'}`,doc=JSON.parse(await fs.readFile(`${previous}/projects/${key}.json`));assert.deepEqual(chains[version].map(o=>o.geometry),doc.objects.map(o=>o.geometry));await fs.copyFile(`${previous}/${version==='before'?'comparison':'native-exports'}/${key}.png`,`${root}/native-exports/${key}-northreach-${version}.png`)}
  const unavailable=()=>({cbrBefore:null,cbrAfter:null,ctcAfter:null,improvement:null,reason:'All three historical Northreach gestures are shorter than 3.2D; no stable adjacent body. Evaluate actual native coastal effect separately.'})
  records.push({brush:key,testId:'T10',brushDiameter:60,capStart:unavailable(),capEnd:unavailable(),bodyPreservation:null,geometryValid:true,nativeExportVerified:true,decision:'VISUAL_REVIEW_PENDING',operations,nativeProvenance:'Copied byte-for-byte from prior actual UI downloads; complete macrogeometry replay compared exactly to archived source documents.'})
 }
 await fs.writeFile(`${root}/cap-acceptance-results.json`,JSON.stringify({status:'MEASURED; native atlas verification pending',baselineCommit:'95db985',prototypeCommit:'e6d4d91',sourceSha256:sha(await fs.readFile('src/domain/landBrush.ts','utf8')),round,records},null,2)+'\n')
 console.log(JSON.stringify({cases:records.length,invalid:records.filter(r=>!r.geometryValid).map(r=>[r.brush,r.testId,r.geometryErrors]),metrics:records.filter(r=>r.capStart.cbrAfter!==null).map(r=>({brush:r.brush,test:r.testId,start:r.capStart,end:r.capEnd,bp:r.bodyPreservation}))},null,2))
}finally{await vite.close()}
function toMulti(objects){return objects.flatMap(o=>o.geometry.polygons.map(poly=>[poly.outer,...poly.holes].map(r=>[...r,r[0]].map(q=>[q.x,q.y]))))}
