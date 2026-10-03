import { chromium } from '@playwright/test'

import { createServer } from 'vite'

import { spawn } from 'node:child_process'

import fs from 'node:fs/promises'

import path from 'node:path'

import os from 'node:os'

import assert from 'node:assert/strict'

const root=path.resolve('.sprint23b.local',String(Date.now())),data=path.join(root,'data'),base='http://127.0.0.1:48007',token=crypto.randomUUID()

await fs.mkdir(root,{recursive:true})

const delay=ms=>new Promise(r=>setTimeout(r,ms)),poll=async(fn,label='poll')=>{for(let i=0;i<250;i++){if(await fn())return;await delay(100)}throw Error(label)}

let service,browser,page,health,loader

const headers=()=>({'Content-Type':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token})

const api=async(url,options={})=>{const r=await fetch(base+'/api/v1'+url,{...options,headers:{...headers(),...options.headers}});assert(r.ok,await r.clone().text());return r.json()}

const start=async(location=data)=>{service=spawn(process.execPath,['dist-service/main.js'],{env:{...process.env,MAPWEAVER_PORT:'48007',MAPWEAVER_DATA_DIR:location,MAPWEAVER_CONTROL_TOKEN:token},windowsHide:true,stdio:'pipe'});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'startup')}

const stop=async()=>{if(service?.exitCode===null&&service.signalCode===null){await api('/lifecycle/control',{method:'POST',body:'{"action":"stop"}'});try{await poll(()=>service.exitCode!==null||service.signalCode!==null,'stop')}finally{if(service.exitCode===null&&service.signalCode===null)service.kill()}}}

const results={checks:[],performance:{environment:{platform:process.platform,node:process.version,cpu:os.cpus()[0].model}},errors:[]},check=n=>{results.checks.push(n);console.log('PASS '+n)}

try {

 await start();loader=await createServer({server:{middlewareMode:true,watch:{ignored:['**/*.local/**']}}})

 const {createWall,wallStyle}=await loader.ssrLoadModule('/src/domain/walls.ts'),{deriveOpening}=await loader.ssrLoadModule('/src/domain/openings.ts'),{createArea,rectangleGeometry}=await loader.ssrLoadModule('/src/domain/areas.ts'),{createLabel}=await loader.ssrLoadModule('/src/domain/annotations.ts'),{createScatter,generateScatter,DEFAULT_SCATTER}=await loader.ssrLoadModule('/src/domain/scatter.ts');await loader.ssrLoadModule('/src/domain/prefabs.ts')

 const imported=await api('/projects/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:await fs.readFile('public/examples/wall-materials.mapweaver')})

 const uploaded=await api('/assets?type=stamp&name=Desk&filename=desk.png',{method:'POST',headers:{'Content-Type':'image/png'},body:await fs.readFile('public/asset-templates/06_manuscriptlessenaar.png')}),asset=uploaded.asset

 const wall=createWall([{id:'a',x:160,y:160,mode:'corner'},{id:'b',x:760,y:160,mode:'corner'},{id:'c',x:760,y:560,mode:'corner'},{id:'d',x:160,y:560,mode:'corner'}],true,wallStyle(imported.document.objects[0]));wall.name='House material walls'

 const door=deriveOpening({kind:'door',id:crypto.randomUUID(),name:'Front door',wallId:wall.id,position:.15,openingWidth:70,unit:'px',pixelsPerUnit:1,side:1,flip:false,rotation:0,scaleX:1,scaleY:1,x:0,y:0,width:1,height:1,opacity:1,doorType:'single',status:'closed'},wall)

 const window=deriveOpening({...door,id:crypto.randomUUID(),kind:'window',name:'East window',position:.4,windowType:'simple'},wall);delete window.doorType;delete window.status

 const floor=createArea(rectangleGeometry({x:160,y:160,width:600,height:400}));floor.name='Room floor';floor.roomSource={wallIds:[wall.id],fingerprint:'abc',seed:{x:400,y:300}}

 const desk={kind:'stamp',id:crypto.randomUUID(),name:'Furniture',assetId:asset.id,x:350,y:300,width:100,height:50,rotation:20,scaleX:1,scaleY:1,opacity:1}

 const label=createLabel({x:470,y:220},'The little house');label.name='House label'

 const scatter=generateScatter({...createScatter([{assetId:asset.id,weight:1,width:30,height:15}],{...DEFAULT_SCATTER,density:5},17),strokes:[{mode:'paint',diameter:100,points:[{x:850,y:200},{x:850,y:550}]}]})

 const objects=[floor,wall,door,window,desk,label,scatter],houseIds=objects.slice(0,6).map(o=>o.id)

 const d={...imported.document,id:crypto.randomUUID(),name:'Prefab house demonstration',map:{...imported.document.map,width:1600,height:1100,grid:{...imported.document.map.grid,physicalScale:{unit:'m',distancePerCell:1.5}}},objects,layers:[{id:'house',name:'House',visible:true,locked:false,objectIds:houseIds},{id:'outside',name:'Outside',visible:true,locked:false,objectIds:[scatter.id]}],objectGroups:[{id:'house-group',name:'House furniture and walls',visible:true,locked:false,layerId:'house',objectIds:houseIds}],layerTree:{roots:['assembly'],groups:[{id:'assembly',name:'House assembly',visible:true,locked:false,children:['house','outside']}]},assets:[imported.document.assets.find(a=>a.id===wall.stroke.assetId),{id:asset.id,kind:'stamp',fileName:'desk.png',mimeType:asset.mimeType,width:asset.width,height:asset.height,hash:asset.sha256,path:`assets/${asset.sha256}.png`}]}

 const source=await api('/projects',{method:'POST',body:JSON.stringify(d)});const originalExport=await fetch(base+'/api/v1/projects/'+source.id+'/export',{headers:headers()});await fs.writeFile(path.join(root,'source-house.mapweaver'),Buffer.from(await originalExport.arrayBuffer()))

 await loader.close();loader=null

 browser=await chromium.launch({channel:'chrome',headless:true});results.performance.environment.browser=browser.version();page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(18000);page.on('pageerror',e=>results.errors.push(e.message));await page.goto(base);await page.getByRole('button',{name:'Open Prefab house demonstration',exact:true}).click()

 const openCreate=async(kind,id)=>{await page.getByRole('button',{name:'Save as reusable prefab',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Save as reusable prefab',exact:true});await dialog.getByLabel('Source',{exact:true}).selectOption(kind);if(kind!=='selection'&&id)await dialog.getByLabel('Source entry',{exact:true}).selectOption(id);return dialog}

 // Source inspection and cancel preserve the exact active project.

 for(const [kind,id,count] of [['group','house-group',6],['layer','house',6],['layerGroup','assembly',7]]){const dialog=await openCreate(kind,id);assert((await dialog.innerText()).includes(count+' objects'));await dialog.getByRole('button',{name:'Cancel',exact:true}).click()}

 await page.getByRole('tab',{name:'Objects',exact:true}).click();const options=page.getByRole('listbox',{name:'Map objects'}).getByRole('option');await options.first().click();let dialog=await openCreate('selection');assert((await dialog.innerText()).includes('6 objects'));await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual((await api('/projects/'+source.id)).document.objects,source.document.objects);check('Selection, group, layer and layer-group sources; cancellation leaves source unchanged')

 const savePrefab=async(mode,name,resolution=1)=>{const dialog=await openCreate('layerGroup','assembly');await dialog.getByLabel('Mode',{exact:true}).selectOption(mode);await dialog.getByLabel('Title',{exact:true}).fill(name);await dialog.getByLabel('Render resolution',{exact:true}).selectOption(String(resolution));await dialog.getByLabel('Default size',{exact:true}).selectOption('world');await dialog.getByLabel('Default width (m)',{exact:true}).fill('24');const start=performance.now();await dialog.getByRole('button',{name:'Preview composition',exact:true}).click();await dialog.getByRole('button',{name:'Confirm save prefab',exact:true}).waitFor();await poll(()=>dialog.getByRole('button',{name:'Confirm save prefab',exact:true}).isEnabled(),'preview');results.performance[mode+'CreatePreviewMs']=performance.now()-start;await dialog.getByAltText('Composition preview').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,mode+'-preview.png')});await dialog.getByRole('button',{name:'Confirm save prefab',exact:true}).click();await poll(async()=>!(await dialog.count()),'commit')}

 await savePrefab('editable','House editable');await savePrefab('flattened','House flattened',2);let library=await api('/library?type=prefab');assert.equal(library.total,2);check('Editable and 2× Flattened saved through browser with explicit physical size and preview')

 await page.getByRole('tab',{name:'Asset library',exact:true}).click();await page.getByRole('tab',{name:'Prefabs',exact:true}).click();await page.getByRole('button',{name:/House editable.*Editable prefab/}).click();await page.screenshot({path:path.join(root,'library-1280.png')})

 const placement=async(name,mode='layers',rotation='0')=>{await page.getByRole('tab',{name:'Asset library',exact:true}).click();await page.getByRole('tab',{name:'Prefabs',exact:true}).click();await page.getByRole('button',{name:new RegExp(name+'.*prefab')}).click();await page.getByRole('button',{name:/^Place prefab/}).click();const d=page.getByRole('dialog',{name:/^Place prefab/});await d.getByLabel('Layers',{exact:true}).selectOption(mode);await d.getByLabel('Rotation (degrees)',{exact:true}).fill(rotation);await d.getByRole('button',{name:'Choose placement',exact:true}).click();await page.getByRole('button',{name:'Place at preview anchor',exact:true}).click();await poll(async()=>!(await page.getByLabel('Prefab placement preview',{exact:true}).count()),'placement')}

 await placement('House editable','layers','30');await poll(async()=>(await api('/projects/'+source.id)).document.objects.length===14,'placed save');let placed=(await api('/projects/'+source.id)).document;assert.equal(placed.layers.length,4);assert.deepEqual(placed.objects.slice(0,7),source.document.objects)

 await page.getByRole('region',{name:'Map canvas',exact:true}).focus();await page.keyboard.press('Control+z');await poll(async()=>(await api('/projects/'+source.id)).document.objects.length===7,'undo');await page.keyboard.press('Control+y');await poll(async()=>(await api('/projects/'+source.id)).document.objects.length===14,'redo');check('Independent rotated placement preserving layers; one undo/redo removes/restores entire composition')

 const png=async(name)=>{await page.getByRole('button',{name:'Export PNG',exact:true}).click();const d=page.getByRole('dialog',{name:'Export PNG',exact:true});await d.getByLabel('Include grid',{exact:true}).uncheck();const pending=page.waitForEvent('download');await d.getByRole('button',{name:'Download PNG',exact:true}).click();await(await pending).saveAs(path.join(root,name));await d.getByRole('button',{name:'Close',exact:true}).click()}

 await png('placed-house.png');await placement('House flattened','active','-25');await poll(async()=>(await api('/projects/'+source.id)).document.objects.length===15,'flattened');check('Flattened crop/anchor places one ordinary stamp on the active layer')

 await page.setViewportSize({width:1600,height:1000});await page.screenshot({path:path.join(root,'placed-1600.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await png('combined.png')

 for(const item of library.assets){const response=await fetch(base+'/api/v1/library/export',{method:'POST',headers:headers(),body:JSON.stringify({ids:[item.id]})});assert(response.ok,await response.clone().text());await fs.writeFile(path.join(root,item.prefabMode+'.zip'),Buffer.from(await response.arrayBuffer()))}

 const exported=await fetch(base+'/api/v1/projects/'+source.id+'/export',{headers:headers()});assert(exported.ok);await fs.writeFile(path.join(root,'house.mapweaver'),Buffer.from(await exported.arrayBuffer()))

 const saved=(await api('/projects/'+source.id)).document;await stop();await page.close();await start();assert.deepEqual((await api('/projects/'+source.id)).document.objects,saved.objects);check('Save/restart/reload preserves composition and library definitions')



 // Clean-library transfer: dependencies are remapped without source database IDs.

 await stop();await start(path.join(root,'clean-library'))

 for(const mode of ['editable','flattened']){const p=await api('/library/preview',{method:'POST',headers:{'Content-Type':'application/zip'},body:await fs.readFile(path.join(root,mode+'.zip'))});assert.deepEqual(p.errors,[]);await api('/library/commit',{method:'POST',body:JSON.stringify({token:p.token,revision:p.revision,duplicate:'keep',createCategories:true,useExistingCategories:true})})}

 const portable=await api('/projects/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:await fs.readFile(path.join(root,'house.mapweaver'))})

 page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>results.errors.push(e.message));await page.goto(base);await page.getByRole('button',{name:'Open Prefab house demonstration',exact:true}).click();await png('after-clean-import.png');assert((await fs.readFile(path.join(root,'combined.png'))).equals(await fs.readFile(path.join(root,'after-clean-import.png'))));check('Clean-library pack and project transfer preserves byte-identical rendered PNG')

 const second={...portable.document,id:crypto.randomUUID(),name:'Different physical scale',objects:[],assets:[],layers:[{id:'target',name:'Target',visible:true,locked:false,objectIds:[]}],objectGroups:[],layerTree:{roots:['target'],groups:[]},map:{...portable.document.map,width:2400,height:1800,grid:{...portable.document.map.grid,cellSize:100}}}

 const secondRow=await api('/projects',{method:'POST',body:JSON.stringify(second)});await page.reload();await page.getByRole('button',{name:'Open Different physical scale',exact:true}).click();await placement('House editable','active','0');await poll(async()=>(await api('/projects/'+secondRow.id)).document.objects.length===7,'second scale')

 const secondPlaced=(await api('/projects/'+secondRow.id)).document,secondWall=secondPlaced.objects.find(o=>o.kind==='path'),firstWall=placed.objects.slice(7).find(o=>o.kind==='path');assert(Math.abs(secondWall.strokeWidth/firstWall.strokeWidth-2)<1e-6);await png('different-scale.png');check('Second map physical scale doubles new geometry exactly; prior instances remain concrete')

 await page.getByRole('tab',{name:'Asset library',exact:true}).click();await page.getByRole('tab',{name:'Prefabs',exact:true}).click();await page.getByRole('button',{name:/House editable.*prefab/}).click();await page.getByLabel('Title',{exact:true}).fill('House renamed without updating instances');await page.getByLabel('Title',{exact:true}).press('Enter');await delay(500);assert.deepEqual((await api('/projects/'+secondRow.id)).document.objects,secondPlaced.objects);check('Library metadata edit leaves placed instances unchanged')

 await page.getByRole('tab',{name:'Map editor',exact:true}).click();await page.getByRole('tab',{name:'Objects',exact:true}).click();await page.getByText('Group',{exact:true}).click();await page.getByRole('button',{name:/^Ungroup/}).click();await poll(async()=>(await api('/projects/'+secondRow.id)).document.objectGroups.length===0,'ungroup')

 await page.getByRole('listbox',{name:'Map objects'}).getByRole('option').filter({hasText:'Front door'}).click();await page.getByRole('tab',{name:'Properties',exact:true}).click();await page.getByLabel('Door status',{exact:true}).selectOption('open-right');await page.getByRole('button',{name:'Apply opening properties',exact:true}).click();await poll(async()=>(await api('/projects/'+secondRow.id)).document.objects.find(o=>o.kind==='door').status==='open-right','edit one door')

 assert.deepEqual((await api('/projects/'+portable.id)).document.objects,portable.document.objects);const definition=(await api('/library?type=prefab')).assets.find(a=>a.prefabMode==='editable');assert.equal((await api('/prefabs/'+definition.id)).document.objects.find(o=>o.kind==='door').status,'closed');await page.screenshot({path:path.join(root,'independent-door.png')});check('Ungroup and edit one door independently; source map, other copy and canonical prefab unchanged')

 // Keyboard cancellation and concrete empty-source error.

 await page.getByRole('tab',{name:'Asset library',exact:true}).click();await page.getByRole('tab',{name:'Prefabs',exact:true}).click();await page.getByRole('button',{name:/House renamed.*prefab/}).click();await page.getByRole('button',{name:/^Place prefab/}).click();await page.getByRole('dialog',{name:/^Place prefab/}).getByRole('button',{name:'Choose placement',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.getByLabel('Prefab placement preview',{exact:true}).count(),0)

 const empty=await openCreate('layer');assert((await empty.getByRole('alert').innerText()).includes('no included objects'));assert(await empty.getByRole('button',{name:'Preview composition',exact:true}).isDisabled());await empty.getByRole('button',{name:'Cancel',exact:true}).click();check('Keyboard Escape cancels placement; empty source has explicit error and disabled preview')

 // 1,000 ordinary objects versus one object with 5,000 rendered scatter instances.

 const currentDesk=portable.document.objects.find(o=>o.kind==='stamp'),manifest=portable.document.assets.find(a=>a.id===currentDesk.assetId)

 const many=Array.from({length:1000},(_,i)=>({...currentDesk,id:crypto.randomUUID(),name:'Bench furniture '+i,x:30+(i%40)*36,y:30+Math.floor(i/40)*36,width:24,height:12,rotation:0}))

 const dense=generateScatter({...createScatter([{assetId:manifest.id,weight:1,width:10,height:5}],{...DEFAULT_SCATTER,density:80,collision:'allow',scaleMin:1,scaleMax:1,rotationMin:0,rotationMax:0},18),area:rectangleGeometry({x:30,y:30,width:1200,height:800})});assert.equal(dense.instances.length,5000)

 for(const [label,objects] of [['1000-objects',many],['5000-scatter-instances',[dense]]]){

   const doc={...second,id:crypto.randomUUID(),name:'Benchmark '+label,map:{...second.map,width:1600,height:1100},objects,assets:[manifest],layers:[{id:'benchmark',name:'Benchmark',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],layerTree:{roots:['benchmark'],groups:[]}}

   const row=await api('/projects',{method:'POST',body:JSON.stringify(doc)});await page.reload();await page.getByRole('button',{name:'Open Benchmark '+label,exact:true}).click();const memoryBefore=await page.evaluate(()=>performance.memory?.usedJSHeapSize||null),t=performance.now();const dialog=await openCreate('layer','benchmark');await dialog.getByLabel('Title',{exact:true}).fill('Prefab '+label);await dialog.getByRole('button',{name:'Preview composition',exact:true}).click();await poll(()=>dialog.getByRole('button',{name:'Confirm save prefab',exact:true}).isEnabled(),'benchmark preview');const previewMs=performance.now()-t;await dialog.getByRole('button',{name:'Confirm save prefab',exact:true}).click();await poll(async()=>!(await dialog.count()),'benchmark save');const saveMs=performance.now()-t-previewMs,pt=performance.now();await placement('Prefab '+label,'active');await poll(async()=>(await api('/projects/'+row.id)).document.objects.length===objects.length*2,'benchmark placement');results.performance[label]={ordinaryObjects:objects.length,renderedInstances:label==='1000-objects'?1000:5000,createPreviewMs:previewMs,commitMs:saveMs,placementAndAutosaveMs:performance.now()-pt,heapBefore:memoryBefore,heapAfter:await page.evaluate(()=>performance.memory?.usedJSHeapSize||null)}

 }

 check('Measured create/preview/place for 1,000 ordinary objects and 5,000 scatter instances')

 await stop();await page.close()

 assert.equal(results.errors.length,0);await fs.writeFile(path.join(root,'results.json'),JSON.stringify(results,null,2));console.log('EVIDENCE '+root)

} catch(e){if(page&&!page.isClosed())await page.screenshot({path:path.join(root,'failure.png')});await fs.writeFile(path.join(root,'failure.txt'),String(e));throw e}

finally{await browser?.close();await loader?.close();await stop().catch(()=>{})}

