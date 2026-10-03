import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {zipSync,strToU8} from 'fflate'
const root=path.resolve('.qa.local','world-stamp-'+Date.now()),base='http://127.0.0.1:48025',web='http://127.0.0.1:5182',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,vite,health,browser,page
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const results=[],errors=[]
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48025',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token,MAPWEAVER_DEV_ORIGIN:web}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5182','--strictPort'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48025'}});vite.stdout.resume();vite.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{return (await fetch(web)).ok}catch{return false}},'vite')
 const bytes=await sharp({create:{width:50,height:25,channels:4,background:'#ff0000'}}).png().toBuffer(),defaultSize={mode:'world',width:10,unit:'ft',lockAspectRatio:true}
 const oldBytes=await sharp({create:{width:40,height:20,channels:4,background:'#00ff00'}}).png().toBuffer()
 const packed=Buffer.from(zipSync({'desk.png':bytes,'old.png':oldBytes,'mapweaver-assets.json':strToU8(JSON.stringify({schemaVersion:1,assets:[{file:'desk.png',type:'stamp',title:'Sizing proof',defaultSize},{file:'old.png',type:'stamp',title:'Previous stamp',defaultSize:{...defaultSize,width:5}}]}))},{level:0}))
 const preview=await api('/library/preview','POST',packed);assert.deepEqual(preview.errors,[]);const imported=await api('/library/commit','POST',{token:preview.token,revision:preview.revision,duplicate:'keep'});assert.deepEqual(imported.entries[0].defaultSize,defaultSize)
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(const dpr of [1,2]){
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:dpr});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(web)
  if(dpr===1){await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Sizing proof'));await page.getByRole('button',{name:'New campaign',exact:true}).click()}
  await page.getByRole('button',{name:'+ Map',exact:true}).click();const dialog=page.getByRole('dialog',{name:'New map',exact:true});await dialog.getByLabel('Name',{exact:true}).fill('Sizing DPR '+dpr);await dialog.getByRole('button',{name:'Create map',exact:true}).click()
  await expect(page.getByRole('region',{name:'Map canvas'})).toBeVisible()
  await page.getByRole('tab',{name:'Map',exact:true}).click();await page.getByLabel('1 square equals',{exact:true}).fill('5');await page.getByRole('button',{name:'Set game scale',exact:true}).click()
  await page.getByLabel('Resolution (px/square)',{exact:true}).fill('50');await page.getByLabel('Resolution (px/square)',{exact:true}).press('Enter')
  await page.evaluate(async()=>{const {useProjectStore:p}=await import('/src/store/projectStore.ts');const m=p.getState().map;p.getState().applyMapSettings({...m,width:400,height:400,grid:{...m.grid,snapEnabled:false,renderAboveObjects:false}},()=>true)})
  await page.getByRole('button',{name:'Place asset',exact:true}).click();await page.getByRole('button',{name:'Choose Previous stamp',exact:true}).first().dblclick();await expect(page.getByRole('dialog',{name:'Choose a stamp'})).toHaveCount(0)
  await page.getByRole('tab',{name:'Asset library',exact:true}).click();await page.getByRole('button',{name:/^Sizing proof/}).click();assert.equal(await page.evaluate(async()=>(await import('/src/store/editorStore.ts')).useEditorStore.getState().stampAsset.name),'Previous stamp');await page.getByRole('tab',{name:'Map editor',exact:true}).click();await page.getByRole('button',{name:'Place asset',exact:true}).click();await page.getByRole('button',{name:'Choose Sizing proof',exact:true}).first().dblclick();await expect(page.getByRole('dialog',{name:'Choose a stamp'})).toHaveCount(0);await expect(page.getByRole('region',{name:'Map canvas'})).toBeVisible();assert.equal(await page.evaluate(async()=>(await import('/src/store/editorStore.ts')).useEditorStore.getState().stampAsset.name),'Sizing proof')
  await page.evaluate(async()=>{const {useEditorStore:e}=await import('/src/store/editorStore.ts');e.setState({viewport:{zoom:1,pan:{x:20,y:20}}})})
  const surface=page.getByRole('region',{name:'Map canvas'});await surface.click({position:{x:220,y:220}});await page.getByRole('button',{name:'Select',exact:true}).click()
  await page.evaluate(async()=>{const {useEditorStore:e}=await import('/src/store/editorStore.ts'),{useProjectStore:p}=await import('/src/store/projectStore.ts');e.getState().select(p.getState().objects[0].id)})
  await page.getByRole('tab',{name:'Properties',exact:true}).click();await expect(page.getByRole('region',{name:'Object properties'}).getByLabel('Width',{exact:true})).toHaveValue('100');await expect(page.getByRole('region',{name:'Object properties'}).getByLabel('Height',{exact:true})).toHaveValue('50')
  for(const zoom of [.5,1,2,4]){
   await page.evaluate(async zoom=>{const {useEditorStore:e}=await import('/src/store/editorStore.ts');e.setState({viewport:{zoom,pan:{x:20-150*zoom,y:20-150*zoom}}})},zoom)
   const geometry=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts');const o=p.getState().objects[0],stage=window.Konva.stages[0],node=stage.findOne('#'+o.id),image=node.findOne('Image'),tr=stage.findOne('Transformer');return {stored:o,renderWidth:image.getClientRect({skipStroke:true,skipShadow:true}).width,selectionWidth:tr.width(),cell:p.getState().map.grid.cellSize,zoom:e.getState().viewport.zoom,dpr:devicePixelRatio}})
   assert.equal(geometry.stored.width,100);assert.equal(geometry.renderWidth,100*zoom);assert.equal(geometry.selectionWidth,100*zoom);assert.equal(geometry.renderWidth/(geometry.cell*zoom),2);results.push(geometry)
  }
  await page.screenshot({path:path.join(root,'dpr-'+dpr+'-400.png')})
  const exports=await page.evaluate(async()=>{const {currentSnapshot}=await import('/src/projects/session.ts'),{exportPng}=await import('/src/export/render.ts');const before=JSON.stringify(currentSnapshot()),out=[];for(const scale of [1,2]){const blob=await exportPng(currentSnapshot(),{scale,includeGrid:true,transparent:false});out.push({scale,data:Array.from(new Uint8Array(await blob.arrayBuffer()))})}if(before!==JSON.stringify(currentSnapshot()))throw Error('Export mutated geometry');return out})
  for(const exp of exports){const png=Buffer.from(exp.data);await fs.writeFile(path.join(root,`dpr-${dpr}-export-${exp.scale}.png`),png);const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minX=info.width,maxX=-1;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;if(data[i]>245&&data[i+1]<10&&data[i+2]<10){minX=Math.min(minX,x);maxX=Math.max(maxX,x)}}assert.equal(info.width,400*exp.scale);assert.equal(maxX-minX+1,100*exp.scale);results.push({dpr,export:exp.scale,outputWidth:info.width,stampPixelWidth:maxX-minX+1,cells:(maxX-minX+1)/(50*exp.scale)})}
  await page.getByRole('button',{name:'Save',exact:true}).click();const id=await page.evaluate(async()=>(await import('/src/projects/session.ts')).useProjectSession.getState().info.id);await poll(async()=>(await api('/projects/'+id)).document.objects[0]?.width===100,'persisted width');await page.reload();await expect(page.getByRole('region',{name:'Map canvas'})).toBeVisible();await expect.poll(()=>page.evaluate(async()=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects[0]?.width),{timeout:15000}).toBe(100);await context.close()
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({results,errors},null,2));console.log('PASS world metadata import, placement, Properties, selection, zoom .5/1/2/4, DPR 1/2, PNG 1/2, save/reload. Evidence '+root)
}catch(e){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw e}
finally{await browser?.close();vite?.kill();if(health)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});if(service?.exitCode===null)service.kill()}
