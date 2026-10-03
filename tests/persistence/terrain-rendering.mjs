import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
const root=path.resolve('.qa.local','terrain-rendering-'+Date.now()),base='http://127.0.0.1:48027',web='http://127.0.0.1:5184',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,vite,health,browser,page
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const results=[],errors=[]
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48027',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token,MAPWEAVER_DEV_ORIGIN:web}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184','--strictPort'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48027'}});vite.stdout.resume();vite.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{return (await fetch(web)).ok}catch{return false}},'vite')


 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(web,{timeout:90000})
 await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Terrain proof'));await page.getByRole('button',{name:'New campaign',exact:true}).click()
 await page.getByRole('button',{name:'+ Map',exact:true}).click();const creation=page.getByRole('dialog',{name:'New map',exact:true});await creation.getByLabel('Name',{exact:true}).fill('Textured world');await creation.getByLabel('Map type',{exact:true}).selectOption('world-map');await creation.getByRole('button',{name:'Generate world map…',exact:true}).click()
 const wizard=page.getByRole('dialog',{name:'Generate world map',exact:true});await wizard.getByRole('button',{name:'Generate preview'}).click();await expect(wizard.getByRole('button',{name:'Create generated map'})).toBeEnabled({timeout:20000});await page.screenshot({path:path.join(root,'preview.png')});await wizard.getByRole('button',{name:'Create generated map'}).click();await expect(wizard).toHaveCount(0)
 await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.screenshot({path:path.join(root,'world-editor.png')})
 const generated=await page.evaluate(async()=>{
   const {currentSnapshot}=await import('/src/projects/session.ts'),{exportPng,renderScene}=await import('/src/export/render.ts'),{exportScene}=await import('/src/export/scene.ts'),{terrainCacheStats}=await import('/src/canvas/drawArea.ts')
   const snap=currentSnapshot(),before=JSON.stringify(snap),times=[],png=[]
   for(const scale of [1,2]){const start=performance.now();const blob=await exportPng(snap,{scale,includeGrid:false,transparent:false});const bytes=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)});times.push({exportScale:scale,ms:performance.now()-start});png.push({scale,bytes})}
   const scene=exportScene(snap,{scale:1,includeGrid:false,transparent:false});for(let i=0;i<5;i++){const start=performance.now();renderScene(scene,new Map());times.push({warmDraw:i,ms:performance.now()-start})}
   window.terrainSnapshot=snap
   return {png,times,cache:terrainCacheStats(),unchanged:before===JSON.stringify(currentSnapshot()),objects:snap.objects.length,map:snap.map}
 })
 assert(generated.unchanged);assert(generated.cache.pixels<=16_000_000);for(const out of generated.png)await fs.writeFile(path.join(root,`world-${out.scale}x.png`),Buffer.from(out.bytes.split(',')[1],'base64'));delete generated.png;results.push(generated);console.log(JSON.stringify({times:generated.times,cache:generated.cache,objects:generated.objects}));await fs.writeFile(path.join(root,'performance.json'),JSON.stringify(generated,null,2))
 // Exercise real properties, including one-step history and error handling.
 await page.evaluate(async()=>{const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts');const o=p.getState().objects.find(o=>o.kind==='area'&&o.land.role==='landmass');window.testAreaId=o.id;e.setState({activeTool:'select',selectedObjectIds:[o.id],inspector:'properties'})})
 await page.getByText('Terrain appearance',{exact:true}).click();await page.getByLabel('Terrain style',{exact:true}).selectOption('desert');await page.getByLabel('Terrain texture scale',{exact:true}).fill('0.25');await page.getByLabel('Coast style',{exact:true}).selectOption('parchment');await page.getByRole('button',{name:'Apply terrain appearance',exact:true}).click()
 const appearance=()=>page.evaluate(async()=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects.find(o=>o.id===window.testAreaId).land.appearance)
 assert.equal((await appearance()).style,'desert');assert.equal((await appearance()).patternScale,.25);await page.getByRole('button',{name:/^Undo:/}).click();assert.equal((await appearance()).style,'land');await page.getByRole('button',{name:/^Redo:/}).click();assert.equal((await appearance()).style,'desert')
 await page.getByRole('tab',{name:'Map',exact:true}).click();await page.getByLabel('Water style',{exact:true}).selectOption('parchment');await page.getByRole('button',{name:'Apply water appearance',exact:true}).click()
 await page.getByRole('button',{name:'Save',exact:true}).click();const id=await page.evaluate(async()=>(await import('/src/projects/session.ts')).useProjectSession.getState().info.id);await poll(async()=>(await api('/projects/'+id)).document.map.water?.style==='parchment','water saved');await page.reload();await expect.poll(()=>page.evaluate(async()=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().map.water?.style)).toBe('parchment');const saved=await api('/projects/'+id);assert(saved.document.objects.some(o=>o.land?.appearance?.patternScale===.25))
 // Real raster tests on isolated geometry: inward feather, holes, coast halo and editor/export parity.
 const pixels=await page.evaluate(async()=>{
   const {createArea,rectangleGeometry,normalizeGeometry}=await import('/src/domain/areas.ts'),{defaultLandArea}=await import('/src/domain/landAreas.ts'),{terrainAppearance}=await import('/src/domain/terrainStyles.ts'),{paintArea}=await import('/src/canvas/drawArea.ts'),{renderScene}=await import('/src/export/render.ts'),{exportScene}=await import('/src/export/scene.ts'),{currentSnapshot}=await import('/src/projects/session.ts')
   let o=createArea(rectangleGeometry({x:20,y:20,width:200,height:160}));o.strokeWidth=0;o.land={...defaultLandArea('terrain-region'),appearance:{...terrainAppearance('forest'),feather:20,textureOpacity:.6}}
   const canvas=document.createElement('canvas');canvas.width=240;canvas.height=200;const c=canvas.getContext('2d');c.translate(o.x,o.y);paintArea(c,o);const data=c.getImageData(0,0,240,200).data,alpha=x=>data[(100*240+x)*4+3]
   const direct=canvas.toDataURL(),doc={...currentSnapshot(),map:{...currentSnapshot().map,width:240,height:200,background:null},objects:[o],layers:[{id:'t',name:'Test',visible:true,locked:false,objectIds:[o.id]}],objectGroups:[],layerTree:{roots:['t'],groups:[]}}
   const one=renderScene(exportScene(doc,{scale:1,transparent:true,includeGrid:false}),new Map()).toDataURL(),two=renderScene(exportScene(doc,{scale:2,transparent:true,includeGrid:false}),new Map()).toDataURL()
   const raw=JSON.stringify(o);o={...o,geometry:normalizeGeometry({polygons:[{outer:o.geometry.polygons[0].outer,holes:[[{x:90,y:70},{x:90,y:130},{x:150,y:130},{x:150,y:70}]]}]})};c.clearRect(-20,-20,240,200);paintArea(c,o);const holeAlpha=c.getImageData(120,100,1,1).data[3]
   const coast=[];for(const style of ['none','minimal','fantasy','parchment','contrast']){o={...o,land:{...o.land,role:'landmass',appearance:{...o.land.appearance,feather:0,coast:style}}};c.clearRect(-20,-20,240,200);paintArea(c,o);coast.push({style,alpha:c.getImageData(16,100,1,1).data[3]})}
   return {alpha:[alpha(19),alpha(20),alpha(25),alpha(30),alpha(40),alpha(100)],direct,one,two,holeAlpha,coast,geometry:raw}
 })
 assert.equal(pixels.alpha[0],0);assert(pixels.alpha[1]<pixels.alpha[2]&&pixels.alpha[2]<pixels.alpha[3]&&pixels.alpha[3]<pixels.alpha[4]);assert.equal(pixels.alpha[5],255);assert.equal(pixels.holeAlpha,0);assert.equal(pixels.coast.find(c=>c.style==='none').alpha,0);assert(pixels.coast.find(c=>c.style==='fantasy').alpha>0)
 const decode=async s=>sharp(Buffer.from(s.split(',')[1],'base64')).raw().toBuffer();assert.deepEqual(await decode(pixels.direct),await decode(pixels.one),'shared area painter matches exported pixels exactly');for(const k of ['direct','one','two']){await fs.writeFile(path.join(root,`feather-${k}.png`),Buffer.from(pixels[k].split(',')[1],'base64'));delete pixels[k]}results.push(pixels)
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({results,errors},null,2));console.log('PASS terrain UI, undo/redo, persistence/reload, feather/holes/coast pixels, editor/export exact parity, 1x/2x world export, unchanged geometry. Evidence '+root)
}catch(e){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw e}
finally{await browser?.close();vite?.kill();if(health)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});if(service?.exitCode===null)service.kill()}
