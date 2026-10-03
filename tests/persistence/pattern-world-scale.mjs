import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {zipSync,strToU8} from 'fflate'
const root=path.resolve('.qa.local','pattern-world-'+Date.now()),base='http://127.0.0.1:48026',web='http://127.0.0.1:5183',token=crypto.randomUUID()
await fs.mkdir(root,{recursive:true})
const poll=async(fn,label)=>{for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100))}throw Error('Timeout: '+label)}
let service,vite,health,browser,page
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api/v1'+url,{method,headers:{'Content-Type':Buffer.isBuffer(body)?'application/zip':'application/json','X-Mapweaver':'1','X-Mapweaver-Instance':health.instanceId,'X-Mapweaver-Generation':health.generation,'X-Mapweaver-Control':token},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});assert(r.ok,await r.clone().text());return r.json()}
const results=[],errors=[]
try{
 service=spawn(process.execPath,['dist-service/main.js'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48026',MAPWEAVER_DATA_DIR:path.join(root,'data'),MAPWEAVER_CONTROL_TOKEN:token,MAPWEAVER_DEV_ORIGIN:web}});service.stdout.resume();service.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{health=await fetch(base+'/api/v1/health').then(r=>r.json());return health.pid===service.pid}catch{return false}},'service')
 vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5183','--strictPort'],{windowsHide:true,stdio:'pipe',env:{...process.env,MAPWEAVER_PORT:'48026'}});vite.stdout.resume();vite.stderr.on('data',b=>process.stderr.write(b));await poll(async()=>{try{return (await fetch(web)).ok}catch{return false}},'vite')

 const tile=await sharp({create:{width:40,height:40,channels:4,background:'#0000ff'}}).composite([{input:await sharp({create:{width:20,height:40,channels:4,background:'#ff0000'}}).png().toBuffer(),left:0,top:0}]).png().toBuffer()
 const packed=Buffer.from(zipSync({'tile.png':tile,'mapweaver-assets.json':strToU8(JSON.stringify({schemaVersion:1,assets:[{file:'tile.png',type:'fillPattern',title:'Stripe floor'}]}))},{level:0}))
 const preview=await api('/library/preview','POST',packed);assert.deepEqual(preview.errors,[]);const imported=await api('/library/commit','POST',{token:preview.token,revision:preview.revision,duplicate:'keep'}),assetId=imported.entries[0].id
 browser=await chromium.launch({channel:'chrome',headless:true})
 const analyse=async(bytes,period)=>{
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const y=Math.floor(info.height/2),starts=[];let red=false
  for(let x=1;x<info.width-1;x++){const i=(y*info.width+x)*4;assert.equal(data[i+3],255,'opaque tiled interior must have no gaps');const next=data[i]>180&&data[i+2]<80;if(next&&!red)starts.push(x);red=next}
  const steps=starts.slice(2).map((x,i)=>x-starts[i+1]);assert(steps.length>1);for(const step of steps)assert(Math.abs(step-period)<=1,`repeat ${step}, expected ${period}`)
  return {width:info.width,height:info.height,period,steps:steps.slice(0,6)}
 }
 for(const dpr of [1,2]){
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:dpr});page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(web)
  if(dpr===1){await expect(page.getByRole('dialog',{name:'Create your first campaign'})).toBeVisible();page.once('dialog',d=>d.accept('Pattern proof'));await page.getByRole('button',{name:'New campaign',exact:true}).click()}
  await page.getByRole('button',{name:'+ Map',exact:true}).click();const dialog=page.getByRole('dialog',{name:'New map',exact:true});await dialog.getByLabel('Name',{exact:true}).fill('Pattern DPR '+dpr);await dialog.getByRole('button',{name:'Create map',exact:true}).click();await expect(page.getByRole('region',{name:'Map canvas'})).toBeVisible()
  await page.evaluate(async id=>{
   const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),{libraryRepository:l}=await import('/src/storage/libraryRepository.ts'),{adoptLibraryAsset}=await import('/src/projects/assets.ts'),{createArea,rectangleGeometry}=await import('/src/domain/areas.ts')
   const asset=await adoptLibraryAsset(await l.getAsset(id)),m=p.getState().map;p.getState().applyMapSettings({...m,width:400,height:400,grid:{...m.grid,visible:false,cellSize:50,physicalScale:{distancePerCell:5,unit:'ft'}}},()=>true)
   const o=createArea(rectangleGeometry({x:20,y:30,width:200,height:100}),{kind:'pattern',assetId:asset.id,mode:'repeat',scale:1,offsetX:0,offsetY:0,rotation:0});o.strokeWidth=0;p.getState().addArea(o);e.setState({activeTool:'select',inspector:'properties',selectedObjectIds:[o.id]});window.floorId=o.id
  },assetId)
  await page.evaluate(async()=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({viewport:{zoom:1,pan:{x:30,y:30}}})})
  const input=page.getByRole('spinbutton',{name:'Pattern scale',exact:true});await expect(input).toBeVisible();await expect(page.getByText('20 ft',{exact:true})).toBeVisible()
  const initial=await page.evaluate(async()=>{const o=(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects[0];return {frame:o.patternFrame,geometry:o.geometry}})
  for(const scale of [1,.5,.25,.1,.75]){
   await input.fill(String(scale));await expect.poll(()=>page.evaluate(async()=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects[0].fill.scale)).toBe(scale);await input.press('Enter')
   const output=await page.evaluate(async()=>{
    await new Promise(requestAnimationFrame);const {currentSnapshot}=await import('/src/projects/session.ts'),{exportPng}=await import('/src/export/render.ts');const o=currentSnapshot().objects[0],node=window.Konva.stages[0].findOne('#'+o.id),editor=node.toCanvas({pixelRatio:1}).toDataURL(),png=[]
    for(const scale of [1,2])png.push({scale,bytes:Array.from(new Uint8Array(await(await exportPng(currentSnapshot(),{scale,includeGrid:false,transparent:true})).arrayBuffer()))})
    return {editor,png,frame:o.patternFrame,geometry:o.geometry}
   })
   assert.deepEqual(output.frame,initial.frame);assert.deepEqual(output.geometry,initial.geometry)
   const editor=await analyse(Buffer.from(output.editor.split(',')[1],'base64'),40*scale);assert.equal(editor.width,200)
   for(const png of output.png){const bytes=Buffer.from(png.bytes);await fs.writeFile(path.join(root,`floor-${scale}-dpr-${dpr}-${png.scale}x.png`),bytes);const crop=await sharp(bytes).extract({left:20*png.scale,top:30*png.scale,width:200*png.scale,height:100*png.scale}).png().toBuffer();results.push({dpr,scale,editor,export:await analyse(crop,40*scale*png.scale)})}
  }
  await input.fill('0');await expect(page.getByRole('alert').filter({hasText:'Use a pattern scale'})).toBeVisible();await input.press('Escape');await expect(input).toHaveValue('0.75')
  await input.fill('0.5');await input.press('Enter');await page.getByRole('button',{name:/^Undo:/}).click();await expect(input).toHaveValue('0.75');await page.getByRole('button',{name:/^Redo:/}).click();await expect(input).toHaveValue('0.5')
  await page.evaluate(async()=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({viewport:{zoom:4,pan:{x:-50,y:-50}}})});await expect(page.getByText('20 ft',{exact:true})).toBeVisible()
  await page.screenshot({path:path.join(root,`floor-dpr-${dpr}.png`)})
  await page.getByRole('button',{name:'Save',exact:true}).click();const id=await page.evaluate(async()=>(await import('/src/projects/session.ts')).useProjectSession.getState().info.id);await poll(async()=>(await api('/projects/'+id)).document.objects[0]?.fill.scale===.5,'persisted fractional pattern');await page.reload();await expect.poll(()=>page.evaluate(async()=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects[0]?.fill.scale),{timeout:15000}).toBe(.5)
  // Actual stamp Transform input and corner-resize gesture, using the same local image in its stamp role.
  await page.evaluate(async id=>{
   const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),{libraryRepository:l}=await import('/src/storage/libraryRepository.ts'),{adoptLibraryAsset}=await import('/src/projects/assets.ts')
   await l.copyAs(id,'stamp');const a=(await l.snapshot()).assets.find(a=>a.kind==='stamp');await adoptLibraryAsset(a);p.getState().place({...a,sizing:{sizingMode:'grid',defaultWidth:4,defaultHeight:null,sizingUnit:'cells',sizingScope:'any',aspectRatioLocked:true}},{x:150,y:250},true);const o=p.getState().objects.at(-1);e.setState({activeTool:'select',selectedObjectIds:[o.id],inspector:'properties',viewport:{zoom:1,pan:{x:30,y:30}}});window.stampId=o.id
  },assetId)
  const properties=page.getByRole('region',{name:'Object properties'});await expect(properties.getByText('20 ft',{exact:true}).first()).toBeVisible();const width=properties.getByRole('spinbutton',{name:'Width',exact:true});await width.fill('100');await width.press('Enter');await expect(properties.getByText('10 ft',{exact:true}).first()).toBeVisible()
  const anchor=await page.evaluate(()=>window.Konva.stages[0].findOne('Transformer').findOne('.bottom-right').getAbsolutePosition()),rect=await page.getByRole('region',{name:'Map canvas'}).boundingBox();await page.mouse.move(rect.x+anchor.x,rect.y+anchor.y);await page.mouse.down();await page.mouse.move(rect.x+anchor.x+50,rect.y+anchor.y+50,{steps:8});await expect(properties.getByText('15 ft',{exact:true}).first()).toBeVisible();await page.mouse.up()
  await page.evaluate(async()=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({viewport:{zoom:4,pan:{x:0,y:0}}})});await expect(properties.getByText('15 ft',{exact:true}).first()).toBeVisible()
  await page.getByRole('tab',{name:'Map',exact:true}).click();await page.getByLabel('1 square equals',{exact:true}).fill('10');await page.getByRole('button',{name:'Set game scale',exact:true}).click();await page.getByRole('tab',{name:'Properties',exact:true}).click();await expect(properties.getByText('30 ft',{exact:true}).first()).toBeVisible()
  await context.close()
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'results.json'),JSON.stringify({results,errors},null,2));console.log('PASS fractional live scale, no gaps, stable frame, editor/PNG density, DPR 1/2, undo/reload, world dimensions, numeric + real handle resize, scale changes, 400% zoom. Evidence '+root)
}catch(e){await page?.screenshot({path:path.join(root,'failure.png')}).catch(()=>{});console.error('Evidence '+root);throw e}
finally{await browser?.close();vite?.kill();if(health)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{});if(service?.exitCode===null)service.kill()}
