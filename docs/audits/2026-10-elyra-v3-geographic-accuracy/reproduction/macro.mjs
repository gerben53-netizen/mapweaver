import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { zipSync, strToU8 } from 'fflate';
const root='docs/audits/2026-10-elyra-v3-geographic-accuracy';
const source=JSON.parse(await fs.readFile('docs/audits/2026-10-northreach-premium-coastline-proof/final.json','utf8'));
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try {
 const A=await vite.ssrLoadModule('/src/domain/areas.ts');
 const {parseProject}=await vite.ssrLoadModule('/src/projects/format.ts');
 const main=source.objects.find(o=>o.name==='Northreach / Westmere / Golden Marches');
 const old=main.geometry.polygons[0].outer;
 const nearest=(x,y)=>old.reduce((best,p,i)=>Math.hypot(p.x-(x-90)*2.5,p.y-(y-20)*2.5)<best.d?{i,d:Math.hypot(p.x-(x-90)*2.5,p.y-(y-20)*2.5)}:best,{i:-1,d:Infinity}).i;
 const start=nearest(312,479),end=nearest(321,350);
 // Manually observed upper cliff/land boundary, southern shore -> bay head -> northern shore.
 // Samples are not bitmap segmentation, random noise or curve subdivision.
 const samples=`312,479 316,475 320,472 324,471 328,470 332,467 336,465 340,465 344,466 349,467 354,466 359,464 364,461 367,457 368,453 364,449 362,446 362,442 364,438 369,434 374,432 380,430 385,429 390,426 395,424 400,423 406,423 410,419 415,417 420,415 426,413 430,410 432,407 436,405 437,401 434,398 429,395 423,394 418,392 413,390 410,387 408,384 406,381 405,378 403,376 399,378 395,378 391,376 389,373 388,369 386,366 383,365 379,366 375,368 372,370 369,371 366,369 365,366 364,362 362,359 359,358 356,360 353,363 350,365 347,364 345,361 344,358 343,354 341,351 338,349 334,348 330,350 326,351 321,350`;
 const points=samples.split(/\s+/).map(s=>{const [x,y]=s.split(',').map(Number);return{x:(x-90)*2.5,y:(y-20)*2.5}});
 if(start<0||end<=start)throw Error('Unexpected source-ring direction; stop before production.');
 const ring=[...old.slice(0,start),...points,...old.slice(end+1)];
 const geometry=A.normalizeGeometry({polygons:[{outer:ring,holes:[]}]});
 const next=A.withGeometry(main,geometry);A.validateArea(next);
 source.objects=source.objects.map(o=>o.id===main.id?next:o);
 source.id=crypto.randomUUID();source.name='Elyra V3 — Northreach geographic accuracy';source.modifiedAt=new Date().toISOString();
 const document=parseProject(source);
 await fs.writeFile(root+'/stages/macro.json',JSON.stringify(document,null,2));
 await fs.writeFile(root+'/stages/macro.mapweaver',zipSync({'project.json':strToU8(JSON.stringify(document))}));
 await fs.writeFile(root+'/production-metrics.json',JSON.stringify({status:'macro geometry prepared; native export and macro gate pending',startedAt:new Date().toISOString(),method:'Existing native Freehand geometry/withGeometry; manually observed replacement coast',freehandActions:1,landAddRemoveActions:0,localSmoothingActions:0,protectedLandmarks:0,acceptedPreviews:0,cancelledPreviews:0,manualOutlineSamples:points.length,sourceRange:[start,end],mainNodes:ring.length,humanActions:0,humanTimeSavingsClaimed:false},null,2));
 console.log(JSON.stringify({start,end,samples:points.length,nodes:ring.length,mapId:document.id}));
} finally {await vite.close();}
