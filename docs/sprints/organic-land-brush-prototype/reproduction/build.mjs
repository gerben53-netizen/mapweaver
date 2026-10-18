import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from'node:assert/strict';import{unzipSync,strFromU8,zipSync,strToU8}from'fflate';import{createServer}from'vite';
const root='docs/sprints/organic-land-brush-prototype',input='docs/audits/2026-10-elyra-v3-geographic-accuracy/elyra-v3-geography.mapweaver';
const bytes=await fs.readFile(input),base=JSON.parse(strFromU8(unzipSync(bytes)['project.json'])),hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
await fs.copyFile(input,root+'/projects/base.mapweaver');
const v=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try{
const B=await v.ssrLoadModule('/src/domain/landBrush.ts'),A=await v.ssrLoadModule('/src/domain/areas.ts'),L=await v.ssrLoadModule('/src/domain/landAreas.ts'),F=await v.ssrLoadModule('/src/projects/format.ts');
const point=([x,y])=>({x:(x-90)*2.5,y:(y-20)*2.5}),same=[{action:'remove',size:60,points:[[378,378],[384,378],[390,380]]},{action:'add',size:60,points:[[389,429],[392,422],[395,419]]},{action:'remove',size:60,points:[[357,459],[361,458]]}],variants=[['round','round'],['organic-soft','organicSoft'],['organic-rugged','organicRugged'],['organic-fine','organicFine'],['combined','organicSoft']];
const counts=objects=>({areas:objects.length,polygons:objects.reduce((n,o)=>n+o.geometry.polygons.length,0),nodes:objects.reduce((n,o)=>n+A.allRings(o.geometry).flat().length,0),maxRing:Math.max(...objects.flatMap(o=>A.allRings(o.geometry).map(r=>r.length)))}),records=[];
for(const[key,shape]of variants){
 let objects=structuredClone(base.objects);const start=counts(objects),steps=key==='combined'?[{...same[0],shape:'organicSoft',size:85},{...same[1],shape:'organicRugged',size:45},{...same[2],shape:'organicFine',size:24},{action:'remove',shape:'organicFine',size:24,points:[[403,379],[408,382]]}]:same.map(s=>({...s,shape})),operations=[];
 for(const[step,s]of steps.entries()){
  const brush={...B.defaultLandBrush,...s,softness:0,roughness:.65,smoothing:'off'},points=s.points.map(point),seed=713+step,started=performance.now();
  const result=B.applyLandStroke({lands:objects,editable:objects.map(o=>o.id),map:base.map,brush,points,seed,newId:`${key}-${step}`}),milliseconds=performance.now()-started,ids=new Set([...result.removed,...result.replacements.map(o=>o.id)]),before=counts(objects);
  objects=[...objects.filter(o=>!ids.has(o.id)),...result.replacements,...result.added];objects.forEach(A.validateArea);L.landBudget(objects);
  assert(result.added.length===0,'Matched coast strokes should not introduce styled detached islands.');
  operations.push({action:s.action,shape:s.shape,size:s.size,softness:0,irregularity:.65,smoothing:'off',seed,points,mapSampling:B.resampleLandStroke(points,s.size).length,before,after:counts(objects),geometryMs:milliseconds,changed:result.replacements.length+result.added.length+result.removed.length>0});
 }
 const document=F.parseProject({...base,id:`organic-${key}-2026-10`,name:`Organic brush — ${key}`,modifiedAt:new Date().toISOString(),objects,layers:base.layers.map(l=>({...l,objectIds:objects.map(o=>o.id)}))});
 await fs.writeFile(root+`/projects/${key}.json`,JSON.stringify(document,null,2));await fs.writeFile(root+`/projects/${key}.mapweaver`,zipSync({'project.json':strToU8(JSON.stringify(document))},{level:6}));
 records.push({variant:key,baseGeometryHash:hash(base.objects.map(o=>o.geometry)),start,end:counts(objects),newNodes:counts(objects).nodes-start.nodes,rejected:0,invalid:0,geometryMs:operations.reduce((n,o)=>n+o.geometryMs,0),operations});
}
await fs.writeFile(root+'/performance-results.json',JSON.stringify({status:'native UI evidence pending',baseArchiveSha256:crypto.createHash('sha256').update(bytes).digest('hex'),geometryContext:'Node.js Vite SSR, one cold run per variant in listed order; rendering is measured separately in the real browser. Includes validation/boolean processing, not a human drawing latency benchmark.',matchedVariants:4,extraSmoothing:false,records},null,2));console.log(JSON.stringify(records.map(({variant,end,newNodes,geometryMs})=>({variant,end,newNodes,geometryMs})),null,2));
}finally{await v.close()}
