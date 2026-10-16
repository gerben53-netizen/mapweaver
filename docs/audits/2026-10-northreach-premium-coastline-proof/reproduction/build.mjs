import fs from 'node:fs/promises';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {zipSync,strToU8} from 'fflate';import {createServer} from 'vite';
const out='docs/audits/2026-10-northreach-premium-coastline-proof',phase=process.argv[2]||'macro',S=2.5,crop={x:90,y:20,width:650,height:570},began=new Date().toISOString();
const vite=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,watch:null},appType:'custom'});
try{
const load=p=>vite.ssrLoadModule('/src/'+p),A=await load('domain/areas.ts'),L=await load('domain/landAreas.ts'),B=await load('domain/landBrush.ts'),{defaultMapStyle}=await load('domain/mapSettings.ts'),{defaultGeography}=await load('domain/geography.ts'),{parseProject}=await load('projects/format.ts');
const map={...defaultMapStyle(),width:crop.width*S,height:crop.height*S,background:null,backgroundColor:'#214e5a',mapType:'world-map',geography:{...defaultGeography('world-map'),widthKm:7617.1875,exportScaleBar:false,scaleBar:false},landEditing:{version:1,manual:true,revision:1}};map.grid.visible=false;
const p=([x,y])=>({x:(x-crop.x)*S,y:(y-crop.y)*S}),xy=t=>t.trim().split(/\s+/).map(v=>p(v.split(',').map(Number))),hash=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex'),style=o=>({...o,strokeWidth:0,land:{role:'landmass',terrain:'custom',coastline:{seed:1,roughness:0,step:8}},fill:{kind:'solid',color:'#c7bb8d'}});
let objects=[],log=[],seed=19234;
function trace(name,text){const pts=xy(text),g=A.areaGeometry('freehand',[...pts,pts[0]],map),o=style({...A.createArea(g,{kind:'solid',color:'#c7bb8d'}),id:crypto.randomUUID(),name});objects.push(o);log.push({phase,tool:'Area Freehand',name,samples:pts.length,nodes:A.allRings(g).flat().length});}
function stroke(action,shape,size,coords,tag,roughness=.25){const before=hash(objects),brush={...B.defaultLandBrush,action,shape,size:size*S,roughness,softness:0,smoothing:action==='smooth'?'low':'off'},points=coords.map(p),t=performance.now();try{const r=B.applyLandStroke({lands:objects,editable:objects.map(o=>o.id),map,brush,points,seed:seed++,newId:crypto.randomUUID()}),remove=new Set([...r.removed,...r.replacements.map(o=>o.id)]),next=[...objects.filter(o=>!remove.has(o.id)),...r.replacements.map(style),...r.added.map(o=>style({...o,name:tag}))];next.forEach(A.validateArea);L.landBudget(next);objects=next;log.push({phase,tool:'Land',action,shape,sizeReferencePx:size,points,seed:seed-1,tag,changed:hash(objects)!==before,ms:performance.now()-t});}catch(e){log.push({phase,tool:'Land',action,tag,rejected:e.message,ms:performance.now()-t});}}
if(phase==='macro'){
// Deliberately observed landmarks, not generative noise, reference segmentation or resampled V2 geometry.
trace('Northreach / Westmere / Golden Marches',`374,110 377,105 387,104 396,98 409,96 416,90 428,91 435,86 440,78 448,79 454,76 464,74 470,67 481,67 486,60 496,61 501,55 509,58 511,66 520,69 524,81 536,94 541,110 548,114 555,112 558,102 568,99 573,93 583,90 588,99 586,106 594,110 588,121 591,133 582,144 573,150 571,161 578,169 588,166 598,156 603,151 609,148 614,137 612,127 619,122 628,124 631,135 637,142 632,151 623,153 620,163 621,175 631,177 640,173 646,181 644,190 651,192 657,187 665,193 670,207 665,218 672,229 671,236 680,238 688,243 700,240 706,248 708,257 718,258 716,270 706,276 704,290 696,302 685,304 681,315 671,319 674,332 666,341 673,352 668,364 674,375 682,378 685,389 697,395 691,406 689,417 677,423 670,421 661,430 663,438 655,446 657,453 667,459 670,464 662,470 667,477 669,485 682,488 685,499 678,506 682,518 674,528 659,530 650,526 642,531 647,540 639,546 629,544 621,548 611,550 607,557 598,555 595,549 585,549 580,542 570,541 559,543 553,536 546,535 541,527 532,523 524,526 518,520 512,523 506,516 498,517 490,524 481,526 473,522 463,521 459,514 449,515 445,508 435,506 427,503 421,499 413,506 406,507 400,518 389,525 375,522 369,516 366,508 355,510 348,500 340,502 333,495 325,500 317,498 314,490 319,484 312,479 313,469 325,462 338,466 346,464 355,465 366,459 373,453 366,447 362,440 367,431 376,425 384,427 391,423 397,420 407,421 414,414 427,405 435,404 436,397 428,393 418,395 410,391 404,383 404,376 396,374 386,378 379,376 372,368 365,373 358,369 351,375 344,373 338,363 341,357 338,350 331,346 321,350 313,347 314,341 320,335 328,334 336,326 333,319 328,316 326,309 314,306 307,310 298,313 289,310 282,304 280,294 286,289 287,282 281,279 272,279 267,274 266,266 272,261 282,263 289,258 299,257 306,250 315,247 324,240 331,236 331,228 321,225 321,217 316,212 320,204 329,200 334,193 341,194 343,188 334,183 334,176 330,171 334,164 340,163 342,156 349,155 349,148 346,143 351,137 362,135 370,129 370,121`);
// Macro islands are individually traced silhouettes, including the long NW island and asymmetrical Skjold anchors.
trace('Northwest long island',`264,205 273,198 286,194 294,185 305,180 314,183 319,193 313,199 300,203 295,214 281,220 272,230 261,232 251,239 240,241 244,233 254,226 257,215`);
trace('Skjold north',`180,319 188,310 194,310 197,299 204,296 208,306 203,313 208,320 200,326 189,327 186,335 175,336`);
trace('Skjold central',`164,341 172,342 176,351 183,353 180,365 169,371 158,369 154,361 157,352`);
trace('Skjold west',`130,375 141,369 151,374 154,385 147,395 135,398 123,393 124,383`);
trace('Skjold east',`229,369 236,371 239,381 247,386 249,397 238,402 230,397 219,399 216,391 222,384`);
trace('Skjold south',`186,386 195,382 202,388 201,396 208,402 205,413 197,418 199,429 191,437 177,433 173,424 181,415 174,410 180,400`);
trace('South island',`421,543 429,536 437,538 441,548 450,550 455,560 468,565 479,576 473,582 461,583 451,577 446,585 433,590 419,585 409,581 405,571 411,563 405,558 412,551`);
}else{const source=JSON.parse(await fs.readFile(out+'/'+(phase==='meso'?'macro':'meso')+'.json','utf8'));objects=source.objects;
if(phase==='meso'){
// Named small discrepancies deliberately left for this pass; each is a normal Add/Remove gesture.
stroke('remove','organic',7,[[543,113],[544,116]],'Northern inlet lip',.15);
stroke('remove','peninsula',8,[[607,123],[604,133]],'Northeast branching inlet',.18);
stroke('remove','organic',6,[[318,336],[324,335]],'Westmere western inlet',.15);
stroke('add','peninsula',8,[[348,371],[350,375]],'Westmere southern finger',.3);
stroke('remove','organic',7,[[427,405],[430,401]],'Golden Marches bay head',.13);
stroke('remove','peninsula',6,[[580,545],[580,541]],'South coast sheltered inlet',.12);
for(const o of [...objects]){const next=A.withGeometry(o,L.editContour(o.geometry,'smooth',17));objects=objects.map(x=>x.id===o.id?next:x);log.push({phase,tool:'Area contour Smooth',amount:17,name:o.name});}
}else{
// Individually observed islands retain their different aspect ratios; Freehand avoids repeated brush beads.
for(const [name,pts] of [
['Northern shelf west','385,65 393,61 401,60 406,54 410,56 411,62 404,67 399,73 389,73 385,70'],
['Northern shelf middle','414,76 419,69 430,66 435,62 439,64 436,70 426,75 419,81'],
['Northern skerry 1','445,55 448,49 454,47 458,51 456,56 451,58'],
['Northern skerry 2','461,47 466,42 471,43 472,48 466,52'],
['Northern skerry 3','479,45 485,39 491,41 489,47 483,50'],
['Northern skerry 4','502,49 505,43 512,44 513,48 508,51'],
['Northern skerry 5','525,64 530,60 534,64 533,70 528,69'],
['Northern skerry 6','541,79 545,75 550,79 548,85 544,85'],
['NW offshore small','299,236 305,229 313,229 315,236 309,243 302,243'],
['Skjold outer west','100,363 103,357 109,358 111,364 106,371 100,369'],
['Skjold upper east','219,338 223,333 229,338 231,345 226,350 221,347'],
['Skjold middle west','137,353 143,350 147,355 144,363 137,367 134,362'],
['Skjold east rock','263,369 267,367 271,373 268,380 262,379'],
['Skjold southern east','257,401 265,397 272,399 270,406 263,411 256,409'],
['Skjold southern west','113,405 120,402 127,405 125,413 116,418 109,414'],
['Skjold southern rock','150,416 155,410 162,411 165,418 160,425 154,425'],
['Skjold tail rock','157,442 161,438 167,441 166,446 161,448'],
['Skjold outer south','208,463 214,459 221,462 220,467 213,470'],
['Golden bay north island','320,410 325,405 330,410 331,417 325,421 318,418'],
['Golden bay main island','331,426 337,420 344,425 346,433 351,435 349,443 342,445 336,439 329,436'],
['Golden bay west island','314,441 318,434 323,438 324,445 331,447 327,452 320,454 311,450'],
['Golden bay east island','359,427 363,422 370,425 367,431 362,432'],
['Golden bay east rock','353,438 357,434 361,435 359,441 354,443'],
['Southwest cape offshore','301,514 306,510 312,511 316,517 325,519 326,524 320,527 313,523 305,522 299,518'],
['Southwestern skerry','293,544 298,538 302,540 300,546 295,548'],
['South island west skerry','377,561 381,553 386,551 391,557 390,565 386,571 379,570'],
['Eastern offshore cape island','683,440 690,436 696,442 696,449 701,453 701,461 695,465 692,473 684,476 681,470 684,462 677,459 679,450'],
['East small rock','709,460 714,455 719,459 716,464 710,466']])trace(name,pts);
// Micro pass: replace five coarse island outlines with individually observed point edits.
for(const [name,text] of [
['Skjold north','180,319 182,315 187,314 189,310 194,310 194,305 197,303 197,299 201,297 204,296 207,300 206,304 208,307 204,310 204,315 208,319 206,322 201,323 200,326 195,325 191,328 188,327 188,332 184,334 180,334 175,336 176,330 180,326 178,323'],
['Skjold central','164,341 168,341 170,344 172,342 174,347 173,351 178,351 181,354 183,358 180,361 181,365 177,368 172,368 169,371 165,369 161,371 158,369 159,365 154,364 154,359 157,357 156,353 161,349 161,345'],
['Skjold west','130,375 134,375 136,371 141,369 144,372 148,372 151,375 151,379 155,382 153,386 154,389 150,391 149,395 145,395 144,398 138,397 135,399 131,397 126,397 123,393 124,388 122,385 126,381 126,377'],
['Skjold east','229,369 233,371 236,370 237,374 235,378 239,381 242,382 243,386 247,386 248,391 246,394 249,397 245,399 241,398 238,402 233,400 230,397 225,400 221,399 219,396 216,395 218,390 222,389 221,385 225,383 225,377 228,375'],
['Skjold south','186,386 190,385 193,382 196,384 199,384 202,388 200,391 202,395 199,398 203,402 207,402 205,406 208,409 205,413 200,414 199,418 196,420 199,424 197,429 194,431 191,437 187,435 184,436 181,432 177,433 176,428 173,424 177,421 177,417 181,415 180,412 175,411 174,407 178,404 180,400 178,396 182,393 182,389']]){
 const o=objects.find(x=>x.name===name),pts=xy(text),g=A.areaGeometry('freehand',[...pts,pts[0]],map),next=A.withGeometry(o,g);objects=objects.map(x=>x.id===o.id?next:x);log.push({phase,tool:'Area point edit',name,beforeNodes:A.allRings(o.geometry).flat().length,afterNodes:A.allRings(g).flat().length,referenceSamples:pts.length,description:'Individually observed rocky coves and points, no generic noise'});
}
// Targeted native local smoothing rounds the longest facets without random noise.
for(const [coords,tag] of [ [[[373,110],[414,91]],'NW shelf'],[[[440,78],[480,67]],'Northern rocky shelf'],[[[507,61],[537,94]],'Northern cape'],[[[268,267],[282,307]],'Western cliff'],[[[331,346],[365,373]],'Westmere fingers'],[[[312,479],[350,500]],'Southwest cape'],[[[397,512],[441,507]],'Southwestern bays'],[[[474,522],[519,520]],'South coast quiet arc'],[[[574,541],[615,550]],'South cape'],[[[679,380],[688,419]],'Eastern estuary']])stroke('smooth','round',27,coords,tag,0);
// Very short, spatially chosen coast nicks; no uniform all-coast noise pass.

}}
objects.forEach(A.validateArea);L.landBudget(objects);assert(objects.every(o=>o.strokeWidth===0&&o.land.coastline.roughness===0&&!o.land.appearance));
const layer={id:'northreach-land',name:'Northreach editable land',visible:true,locked:false,objectIds:objects.map(o=>o.id)},doc=parseProject({formatVersion:12,id:'northreach-premium-proof-2026-10',name:'Northreach '+phase,createdAt:'2026-10-16T20:00:00.000Z',modifiedAt:new Date().toISOString(),map,objects,layers:[layer],layerTree:{roots:[layer.id],groups:[]},objectGroups:[],assets:[]});
await fs.writeFile(out+'/'+phase+'.json',JSON.stringify(doc,null,2));await fs.writeFile(out+'/'+phase+'.mapweaver',zipSync({'project.json':strToU8(JSON.stringify(doc))},{level:6}));
if(phase==='final')await fs.copyFile(out+'/final.mapweaver',out+'/northreach-premium.mapweaver');
const metric={phase,began,finished:new Date().toISOString(),automationMs:Date.now()-Date.parse(began),areas:objects.length,nodes:objects.reduce((n,o)=>n+A.allRings(o.geometry).flat().length,0),maxRing:Math.max(...objects.flatMap(o=>A.allRings(o.geometry).map(r=>r.length))),holes:objects.reduce((n,o)=>n+o.geometry.polygons.reduce((s,p)=>s+p.holes.length,0),0),operations:log};await fs.writeFile(out+'/'+phase+'-operations.json',JSON.stringify(metric,null,2));console.log(JSON.stringify({...metric,operations:log.map(x=>({tool:x.tool,action:x.action,tag:x.tag,rejected:x.rejected}))}));
}finally{await vite.close()}
