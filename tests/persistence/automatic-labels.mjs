import {isDeepStrictEqual} from 'node:util'
const equivalent=(a,b)=>isDeepStrictEqual(JSON.parse(JSON.stringify(a??null)),JSON.parse(JSON.stringify(b??null)))
import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
const root=path.resolve('.qa.local','automatic-labels-'+Date.now()),base='http://127.0.0.1:48030',web='http://127.0.0.1:5187',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,vite,health,browser,page
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const errors=[]
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48030',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token,MAPWEAVER_DEV_ORIGIN:web}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48030'}});vite.stdout.resume();vite.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{return (await fetch(web)).ok}catch{return false}},'vite')


 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(web,{timeout:90000});await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Generator asset proof'));await page.getByRole('button',{name:'New campaign',exact:true}).click()

 await expect(page.getByRole('button',{name:'+ Map',exact:true})).toBeVisible();await poll(async()=>(await api('/campaigns')).length>0,'campaign created')

 await page.getByRole('button',{name:'+ Map',exact:true}).click();const creation=page.getByRole('dialog',{name:'New map',exact:true});await creation.getByLabel('Name',{exact:true}).fill('Automatic Labels proof');await creation.getByLabel('Map type',{exact:true}).selectOption('world-map');await creation.getByRole('button',{name:'Create map',exact:true}).click();await expect(page.getByRole('region',{name:'Map canvas'})).toBeVisible()



 await page.evaluate(async()=>{const {automaticLabelFixture}=await import('/tests/fixtures/automaticLabels.ts'),{useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),{history}=await import('/src/store/history.ts');p.setState(await automaticLabelFixture(p.getState().map));history.reset();e.setState({activeTool:'select',selectedObjectIds:[],activeLayerId:'label-sources'})})
 const current=()=>page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot())
 const counts=()=>page.evaluate(async()=>(await import('/src/store/history.ts')).useHistoryStore.getState().undoCount)
 const labels=async()=> (await current()).objects.filter(o=>o.kind==='label'&&o.automatic)
 await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.screenshot({path:path.join(root,'before.png')})
 const original=await current(),densityResults=[]
 async function open(){const summary=page.locator('summary').filter({hasText:/^Map actions$/});if((await summary.locator('..').getAttribute('open'))===null)await summary.click();await page.getByRole('button',{name:'Automatic labels…',exact:true}).click();return page.getByRole('dialog',{name:'Automatic labels',exact:true})}
 async function preview(density){const dialog=await open();await dialog.getByLabel('Automatic label density',{exact:true}).selectOption(density);const before=await current(),n=await counts();await dialog.getByRole('button',{name:'Preview labels',exact:true}).click();await expect(dialog.getByRole('img',{name:'Automatic label preview'})).toBeVisible({timeout:60000});assert(equivalent(await current(),before),'preview is transient');assert.equal(await counts(),n);return dialog}
 for(const density of ['low','medium','high']){
  const dialog=await preview(density);await page.screenshot({path:path.join(root,density+'-preview.png')});const n=await counts();await dialog.getByRole('button',{name:'Apply labels',exact:true}).click();assert.equal(await counts(),n+1)
  await page.locator('summary').filter({hasText:/^Map actions$/}).click();await page.screenshot({path:path.join(root,density+'-editor.png')});const generated=await labels();densityResults.push({density,count:generated.length,placed:generated.filter(o=>o.visible!==false).length,classes:generated.filter(o=>o.visible!==false).map(o=>o.automatic.labelClass)})
 }
 console.log('Densities',densityResults);assert(densityResults[0].count<densityResults[2].count);assert(densityResults[2].classes.includes('river'));assert(densityResults[2].classes.includes('waterMinor'));assert(densityResults[2].classes.includes('mountainRange'));assert(densityResults[2].classes.includes('landmark'))
 for(const o of original.objects.filter(o=>o.kind==='label'))assert(equivalent((await current()).objects.find(v=>v.id===o.id),o),'manual labels unchanged')
 // Real native-label drag and update; the override keeps position/style/text.
 const movable=(await labels()).find(o=>o.visible!==false&&o.automatic.category==='regions');assert(movable)
 await page.evaluate(async id=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({selectedObjectIds:[id],inspector:'properties'})},movable.id);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
 const point=await page.evaluate(async o=>{const {viewport:v}=(await import('/src/store/editorStore.ts')).useEditorStore.getState(),r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return{x:r.x+v.pan.x+(o.x+o.width/2)*v.zoom,y:r.y+v.pan.y+(o.y+o.height/2)*v.zoom}},movable)
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+22,point.y+12,{steps:8});await page.mouse.up();const moved=(await labels()).find(o=>o.id===movable.id);assert(moved.automatic.overridden,'drag marks override');assert(moved.x!==movable.x)
 const dialog=await preview('high');await dialog.getByRole('button',{name:'Apply labels',exact:true}).click();assert(equivalent((await labels()).find(o=>o.id===moved.id),moved),'manual move survives update');await page.locator('summary').filter({hasText:/^Map actions$/}).click();await page.screenshot({path:path.join(root,'manual-override.png')})
 // Reveal metadata through the standard Label Properties and detach atomically.
 await page.evaluate(async id=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({selectedObjectIds:[id],inspector:'properties'})},moved.id);await expect(page.getByRole('button',{name:'Detach from automatic layout',exact:true})).toBeVisible();await page.screenshot({path:path.join(root,'native-properties.png')});await page.getByRole('button',{name:'Detach from automatic layout',exact:true}).click();assert(!(await current()).objects.find(o=>o.id===moved.id).automatic);await page.getByRole('button',{name:/^Undo:/}).click();assert((await current()).objects.find(o=>o.id===moved.id).automatic)
 await page.evaluate(async()=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({selectedObjectIds:[]})});await page.mouse.move(20,20)
 const proof=await page.evaluate(async()=>{const {exportPng}=await import('/src/export/render.ts'),{currentSnapshot}=await import('/src/projects/session.ts');const s=currentSnapshot(),read=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)}),exports=[],editors=[];for(const scale of [1,2]){exports.push(await read(await exportPng(s,{scale,transparent:false,includeGrid:false})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const stage=window.Konva.stages[0],node=stage.findOne('.map-art').clone(),water=stage.findOne('.water-surface').clone();node.add(water);water.moveToBottom();editors.push(node.toCanvas({x:0,y:0,width:s.map.width,height:s.map.height,pixelRatio:scale}).toDataURL());node.destroy()}return{exports,editors}})
 const parity=[];for(let i=0;i<2;i++){await fs.writeFile(path.join(root,'labels-'+(i+1)+'x.png'),Buffer.from(proof.exports[i].split(',')[1],'base64'));const a=await sharp(Buffer.from(proof.exports[i].split(',')[1],'base64')).ensureAlpha().raw().toBuffer(),b=await sharp(Buffer.from(proof.editors[i].split(',')[1],'base64')).ensureAlpha().raw().toBuffer();assert.equal(a.length,b.length);let max=0,total=0,large=0;for(let j=0;j<a.length;j++){const d=Math.abs(a[j]-b[j]);max=Math.max(max,d);total+=d;if(d>3)large++}parity.push({scale:i+1,max,mean:total/a.length,large});await fs.writeFile(path.join(root,'labels-'+(i+1)+'x-editor.png'),Buffer.from(proof.editors[i].split(',')[1],'base64'));assert(total/a.length<.05&&large/a.length<.0001,'parity '+JSON.stringify(parity.at(-1)))}
 await page.screenshot({path:path.join(root,'final-editor.png')})
 const saved=await current(),id=(await api('/startup-project')).id
 await poll(async()=>equivalent((await api('/projects/'+id)).document.objects,saved.objects),'autosave paint')
 await page.getByRole('button',{name:'Save',exact:true}).click();await poll(async()=>equivalent((await api('/projects/'+id)).document.objects,saved.objects),'manual save');await page.reload();await expect.poll(async()=>(await current()).objects.length).toBe(saved.objects.length);assert(equivalent((await current()).map,saved.map),'reload map');assert(equivalent((await current()).objects,saved.objects),'reload objects')


 const performanceResult=await page.evaluate(async()=>{const {generateAutomaticLabels,AUTO_LABEL_DEFAULTS}=await import('/src/domain/automaticLabels.ts'),{createPlace}=await import('/src/domain/annotations.ts'),{currentSnapshot}=await import('/src/projects/session.ts');const s=currentSnapshot(),map={...s.map,width:4096,height:2800},objects=Array.from({length:250},(_,i)=>({...createPlace({x:120+(i%20)*190,y:150+Math.floor(i/20)*200},'Settlement '+i,i%9===0?'capital':'town',map),id:'perf-'+i})),fixture={map,objects,layers:[{id:'perf',name:'Places',visible:true,locked:false,objectIds:objects.map(o=>o.id)}],objectGroups:[],layerTree:null},times=[];let result;for(let i=0;i<5;i++){const t=performance.now();result=generateAutomaticLabels(fixture,{...AUTO_LABEL_DEFAULTS,density:'high'});times.push(performance.now()-t)}return{sources:250,times,placed:result.labels.length-result.suppressed,suppressed:result.suppressed}});console.log('Performance',performanceResult);assert(Math.max(...performanceResult.times)<1000)
 await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.screenshot({path:path.join(root,'layout-1280x720.png')});const cancel=await preview('low');await cancel.getByRole('button',{name:'Cancel',exact:true}).click();assert(equivalent((await current()).objects,saved.objects))
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({densityResults,parity,performanceResult,errors},null,2));console.log('PASS automatic labels density previews, native edit/override, detach/undo, persistence, exact 1x/2x parity. Evidence '+root)
}catch(e){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw e}
finally{await browser?.close();vite?.kill();if(health)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});if(service?.exitCode===null)service.kill()}
