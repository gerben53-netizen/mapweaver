import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('.qa.local/illustrated-markers/validation'), input = path.resolve('deliverables.local/Illustrated-Markers'), out = process.env.SOFTWARE_CANVAS ? input+'/software' : input
await fs.mkdir(out,{recursive:true})
const data = root + '/data-' + Date.now()
const web = 'http://127.0.0.1:5200', base = 'http://127.0.0.1:48060', token = crypto.randomUUID()
const service = spawn(process.execPath, ['dist-service/main.js'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48060', MAPWEAVER_DATA_DIR: data, MAPWEAVER_CONTROL_TOKEN: token, MAPWEAVER_DEV_ORIGIN: web } })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5200', '--strictPort'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48060' } })
const pause = ms => new Promise(r => setTimeout(r, ms))
let h, browser
const api = async (u, method = 'GET', body) => {
  const r = await fetch(base + '/api/v1' + u, { method, headers: { 'Content-Type': Buffer.isBuffer(body) ? 'application/zip' : 'application/json', 'X-Mapweaver': '1', 'X-Mapweaver-Instance': h.instanceId, 'X-Mapweaver-Generation': h.generation, 'X-Mapweaver-Control': token }, ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }) })
  if (!r.ok) throw Error(await r.text()); return r.json()
}
try {
  for (let i = 0; i < 100; i++) { try { h = await fetch(base + '/api/v1/health').then(r => r.json()); if (h.pid === service.pid && (await fetch(web)).ok) break } catch { /* Service may still be starting. */ } await pause(300) }
  if (h?.pid !== service.pid) throw Error('Isolated service did not start')
  const errors = []
  browser = await chromium.launch({ channel: 'chrome', headless: true, ...(process.env.SOFTWARE_CANVAS ? { args: ['--disable-accelerated-2d-canvas'] } : {}) })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(web)
  const setup = page.getByRole('dialog', { name: 'Create your first campaign' })
  await page.waitForTimeout(1000)
  if (await setup.isVisible()) {
    page.once('dialog', d => d.accept('Illustrated marker validation'))
    await page.getByRole('button', { name: 'New campaign', exact: true }).click()
    await page.getByRole('button', { name: '+ Map', exact: true }).waitFor()
  }
  const row=await api('/projects/import','POST',await fs.readFile(input+'/after.mapweaver'))
  await page.evaluate(async id=>{await(await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
  await page.getByRole('region',{name:'Map canvas'}).waitFor();await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'Fit to map',exact:true}).click()
  await page.evaluate(async()=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({markerWizard:true,activeLayerId:'settlement-study'})})
  const dialog=page.getByRole('dialog',{name:'Create map marker'})
  await dialog.getByLabel('Marker type',{exact:true}).selectOption('city');await dialog.getByLabel('Marker name',{exact:true}).fill('Copperhaven');await dialog.getByLabel('Marker visual mode').selectOption('illustrated')
  await dialog.getByRole('button',{name:'Arid city',exact:true}).click();await dialog.getByRole('button',{name:'Place on map',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('dialog button[type="submit"]').disabled)
  await page.screenshot({path:out+'/wizard-1280.png'})
  await dialog.getByRole('button',{name:'Place on map',exact:true}).click()
  const click=await page.evaluate(async()=>{const {viewport:v}=(await import('/src/store/editorStore.ts')).useEditorStore.getState(),r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return {x:r.x+v.pan.x+620*v.zoom,y:r.y+v.pan.y+500*v.zoom}})
  await page.mouse.click(click.x,click.y)
  const placed=await page.evaluate(async()=>{const p=(await import('/src/store/projectStore.ts')).useProjectStore.getState(),e=(await import('/src/store/editorStore.ts')).useEditorStore.getState(),o=p.objects.find(o=>o.id===e.selectedObjectIds[0]);return {o,labels:p.objects.filter(l=>l.kind==='label'&&l.ownerId===o?.id),layer:p.layers.find(l=>l.objectIds.includes(o?.id))?.name}})
  if(placed.o?.kind!=='place'||placed.o.visualMode!=='illustrated'||placed.o.name!=='Copperhaven'||placed.labels.length!==1||placed.layer!=='Settlements')throw Error('Placement/semantic selection failed: '+JSON.stringify(placed))
  const width=page.getByRole('spinbutton',{name:'Illustrated width (km)',exact:true});await width.fill('600');await width.press('Tab');await page.getByRole('button',{name:'Apply properties',exact:true}).click()
  await page.screenshot({path:out+'/properties-1280.png'})
  const resized=await page.evaluate(async id=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects.find(o=>o.id===id),placed.o.id)
  if(Math.abs(resized.width/resized.pixelsPerKm-600)>1e-6)throw Error('World size edit failed')
  await page.getByLabel('Marker visual mode').selectOption('symbol');await page.getByRole('button',{name:'Apply properties',exact:true}).click()
  const mode=await page.evaluate(async id=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects.find(o=>o.id===id).visualMode,placed.o.id)
  if(mode!=='symbol')throw Error('Symbol switch failed')
  await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.undo()})
  await page.evaluate(async()=>{await(await import('/src/projects/localSession.ts')).saveLocalProject()})
  // Portable ZIP is decoded without the library, then readmitted as a document.
  const portable=await page.evaluate(async()=>{const {gatherProject,encodeProject,decodeProject}=await import('/src/projects/archive.ts'),{currentSnapshot,useProjectSession}=await import('/src/projects/session.ts'),info=useProjectSession.getState().info,prepared=await gatherProject(currentSnapshot(),info),blob=await encodeProject(prepared),decoded=await decodeProject(blob);return {equal:JSON.stringify(decoded.document.objects)===JSON.stringify(prepared.document.objects),assets:decoded.assets.size,bytes:blob.byteLength}})
  if(!portable.equal)throw Error('Portable archive roundtrip changed objects')
  // Stress the shared sources: 240 further semantic Places, each with a linked label.
  const stress=await page.evaluate(async()=>{
   const {useProjectStore:p}=await import('/src/store/projectStore.ts'),{useEditorStore:e}=await import('/src/store/editorStore.ts'),{createMarkerBundle}=await import('/src/domain/markers.ts'),{markerDefaults}=await import('/src/domain/markerRegistry.ts'),{imageCacheStats}=await import('/src/images/imageCache.ts'),sources=p.getState().objects.filter(o=>o.kind==='place'&&o.visualMode==='illustrated').slice(0,8)
   e.setState({activeLayerId:'settlement-study',selectedObjectIds:[]})
   p.getState().addAnnotations(Array.from({length:240},(_,i)=>{const s=sources[i%sources.length];return createMarkerBundle({x:60+(i%20)*72,y:50+Math.floor(i/20)*70},{...markerDefaults('world-map','city'),name:'Place '+i,label:true,illustration:{assetId:s.assetId,aspect:s.width/s.height,widthKm:200}},p.getState().map)}).flat())
   e.setState({selectedObjectIds:[],inspectorCollapsed:true});await new Promise(r=>setTimeout(r,1500))
   const before=imageCacheStats(),v=e.getState().viewport,times=[],create=document.createElement.bind(document);let canvases=0;document.createElement=(...args)=>{if(args[0]==='canvas')canvases++;return create(...args)}
   try{for(let i=0;i<35;i++){const start=performance.now();e.setState({viewport:{...v,pan:{x:v.pan.x+Math.sin(i)*20,y:v.pan.y}}});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(i>=5)times.push(performance.now()-start)}}finally{document.createElement=create;e.setState({viewport:v})}
   times.sort((a,b)=>a-b);return {places:p.getState().objects.filter(o=>o.kind==='place').length,objects:p.getState().objects.length,cache:before,cacheAfter:imageCacheStats(),canvases,panMedianMs:times[15],panP95Ms:times[28]}
  })
  if(stress.cache.entries>15||stress.canvases!==0)throw Error('Shared image/cache regression: '+JSON.stringify(stress))
  await fs.writeFile(out+'/interaction-validation.json',JSON.stringify({viewport:[1280,720],placement:placed.o.id,selectedKind:placed.o.kind,layer:placed.layer,labelCount:placed.labels.length,worldWidthKm:600,symbolSwitch:true,undo:true,portable,stress,errors},null,2))
  console.log(JSON.stringify({portable,stress,errors}))
  if(errors.length)throw Error(errors.join('; '))
} finally {
  if (h?.pid === service.pid) await api('/lifecycle/control', 'POST', { action: 'stop' }).catch(() => {})
  await browser?.close(); vite.kill(); service.kill()
}
