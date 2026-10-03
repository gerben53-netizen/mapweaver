import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
const root = path.resolve('.qa.local/tool-intent/validation'), out = path.resolve('deliverables.local/Tool-Intent')
const data = root + '/data-' + Date.now()
const web = 'http://127.0.0.1:5195', base = 'http://127.0.0.1:48049', token = crypto.randomUUID()
const service = spawn(process.execPath, ['dist-service/main.js'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48049', MAPWEAVER_DATA_DIR: data, MAPWEAVER_CONTROL_TOKEN: token, MAPWEAVER_DEV_ORIGIN: web } })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5195', '--strictPort'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48049' } })
const pause = ms => new Promise(r => setTimeout(r, ms))
let h, browser
const api = async (u, method = 'GET', body) => {
  const r = await fetch(base + '/api/v1' + u, { method, headers: { 'Content-Type': Buffer.isBuffer(body) ? 'application/zip' : 'application/json', 'X-Mapweaver': '1', 'X-Mapweaver-Instance': h.instanceId, 'X-Mapweaver-Generation': h.generation, 'X-Mapweaver-Control': token }, ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }) })
  if (!r.ok) throw Error(await r.text()); return r.json()
}
try {
  await fs.mkdir(out,{recursive:true})
  for (let i=0;i<100;i++) {try{h=await fetch(base+'/api/v1/health').then(r=>r.json());if(h.pid===service.pid){const r=await fetch(web);await r.arrayBuffer();if(r.ok)break}}catch{ /* Wait for the isolated local services. */ } await pause(300)}
  assert.equal(h?.pid,service.pid)
  const errors=[], results=[]
  browser=await chromium.launch({channel:'chrome',headless:true})
  const page=await browser.newPage({viewport:{width:1280,height:720}})
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(web)
  await page.waitForTimeout(1200)
  if(await page.getByRole('dialog',{name:'Create your first campaign'}).isVisible()){
    page.once('dialog',d=>d.accept('Tool intent validation'))
    await page.getByRole('button',{name:'New campaign',exact:true}).click()
    await page.getByRole('button',{name:'+ Map',exact:true}).waitFor()
  }
  const bytes=await page.evaluate(async()=>{
    const {toolIntentFixture}=await import('/tests/fixtures/toolIntent.ts')
    const {encodeProject}=await import('/src/projects/codec.ts')
    return Array.from(await encodeProject({document:toolIntentFixture(),assets:new Map()}))
  })
  await fs.writeFile(out+'/Existing-objects.mapweaver',Buffer.from(bytes))
  const row=await api('/projects/import','POST',Buffer.from(bytes))
  await page.evaluate(async id=>{await (await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
  await page.getByRole('region',{name:'Map canvas'}).waitFor()
  await page.getByRole('button',{name:'Fit to map',exact:true}).click()
  await page.waitForTimeout(500)
  const snapshot=()=>page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot())
  const original=await snapshot()
  const png=()=>page.evaluate(async()=>{
    const blob=await (await import('/src/export/render.ts')).exportPng((await import('/src/projects/session.ts')).currentSnapshot(),{scale:1,transparent:false,includeGrid:false})
    return new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)})
  })
  const originalPng=await png()
  const point=async(x,y)=>page.evaluate(async({x,y})=>{const v=(await import('/src/store/editorStore.ts')).useEditorStore.getState().viewport,r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return{x:r.x+x*v.zoom+v.pan.x,y:r.y+y*v.zoom+v.pan.y}},{x,y})
  const drag=async(x,y,dx,dy)=>{const a=await point(x,y),b=await point(x+dx,y+dy);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();await page.waitForTimeout(500)}
  const undo=async()=>{await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.undo()});await page.waitForTimeout(150)}
  // 1: physical geography, with native undo.
  await page.getByRole('button',{name:'Land / Water',exact:true}).click()
  await page.getByLabel('Land brush preset',{exact:true}).selectOption('Island')
  await page.getByLabel('Land brush size slider',{exact:true}).fill('100')
  await drag(800,400,30,0)
  assert.notDeepEqual((await snapshot()).objects,original.objects)
  await undo();assert.deepEqual((await snapshot()).objects,original.objects)
  results.push('Land / Water adds an island with one undo')
  // 2: an explicitly classified swamp via the visible tool and shape controls.
  await page.getByRole('button',{name:'Terrain Region',exact:true}).click()
  await page.getByLabel('Biome',{exact:true}).selectOption('swamp')
  await page.getByLabel('Area shape',{exact:true}).selectOption('rectangle')
  await drag(220,200,140,100)
  let s=await snapshot(), added=s.objects.find(o=>!original.objects.some(p=>p.id===o.id))
  assert.equal(added?.land?.terrain,'swamp');assert.equal(added.land.appearance.style,'swamp')
  await page.screenshot({path:out+'/terrain-region-1280.png'})
  await undo();assert.deepEqual((await snapshot()).objects,original.objects)
  results.push('Terrain Region creates a swamp biome with an explicit appearance preset')
  // 3: actual Browse selection, independent behavior, paint without semantic mutation.
  await page.getByRole('button',{name:'Terrain Brush',exact:true}).click()
  await page.getByText('Browse materials',{exact:true}).click()
  await page.getByLabel('Search materials',{exact:true}).fill('moss')
  await page.getByRole('button',{name:/Mossy Woodland Floor/}).click()
  assert.equal(await page.getByLabel('Material',{exact:true}).inputValue(),'painterly.v1.forest-moss')
  await page.getByText('Browse materials',{exact:true}).click()
  await page.getByLabel('Brush Preset',{exact:true}).selectOption('Fine detail')
  await page.waitForTimeout(600)
  await drag(260,230,50,20)
  s=await snapshot();assert.deepEqual(s.objects,original.objects);assert.ok(s.map.terrainPaint)
  await page.screenshot({path:out+'/terrain-brush-1280.png'})
  await undo();assert.deepEqual(await snapshot(),original)
  results.push('Browse chooses moss; Fine detail changes behavior; paint leaves biome objects unchanged')
  // 4: generic area after semantic creation must not leak classification.
  await page.getByRole('button',{name:'Area',exact:true}).click()
  await page.getByLabel('Area shape',{exact:true}).selectOption('rectangle')
  await drag(420,220,100,80)
  s=await snapshot();added=s.objects.find(o=>!original.objects.some(p=>p.id===o.id))
  assert.equal(added?.kind,'area');assert.equal(added.land,undefined)
  await undo();assert.deepEqual(await snapshot(),original)
  results.push('Area creates a generic zone without biome metadata after Terrain Region')
  // 5: road creation through the one Path tool, preserving route model and snapping.
  await page.getByRole('button',{name:'Path',exact:true}).click()
  await page.getByLabel('Path type',{exact:true}).selectOption('road')
  await page.getByLabel('Road class',{exact:true}).selectOption('trail')
  for(const p of [[220,440],[360,460],[450,430]]){const q=await point(...p);await page.mouse.click(q.x,q.y)}
  await page.keyboard.press('Enter');await page.waitForTimeout(200)
  s=await snapshot();added=s.objects.find(o=>!original.objects.some(p=>p.id===o.id))
  assert.equal(added?.pathKind,'road');assert.equal(added.route.roadClass,'trail')
  assert.equal(await page.getByRole('button',{name:'Path',exact:true}).getAttribute('aria-pressed'),'true')
  await page.screenshot({path:out+'/path-road-1280.png'})
  await undo();assert.deepEqual(await snapshot(),original)
  results.push('Path > Road > Trail creates a native editable road')
  // All original formats and appearance survive a real local save/reload.
  await page.getByRole('button',{name:'Select',exact:true}).first().click()
  await page.evaluate(async()=>{await (await import('/src/projects/localSession.ts')).saveLocalProject()})
  const saved=(await api('/projects/'+row.id)).document
  for(const key of Object.keys(original))assert.deepEqual(saved[key],original[key],key)
  await page.reload();await page.getByRole('region',{name:'Map canvas'}).waitFor();await page.waitForTimeout(1000)
  await page.evaluate(async id=>{await (await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
  assert.deepEqual(await snapshot(),original)
  assert.equal(await png(),originalPng)
  results.push('Seven existing object types survive service save/reload; PNG bytes identical')
  // Context-specific editors remain available for the old objects.
  for(const name of ['Existing landmass','Existing forest','Existing generic zone']){
    await page.evaluate(async name=>{const p=(await import('/src/store/projectStore.ts')).useProjectStore.getState(),e=(await import('/src/store/editorStore.ts')).useEditorStore;e.setState({activeTool:'select',selectedObjectIds:[p.objects.find(o=>o.name===name).id],inspector:'properties',inspectorCollapsed:false})},name)
    await page.getByRole('button',{name:'Edit points',exact:true}).waitFor()
  }
  assert.equal(await page.getByLabel('Biome',{exact:true}).count(),0)
  await page.evaluate(async()=>{const e=(await import('/src/store/editorStore.ts')).useEditorStore;e.setState({selectedObjectIds:[],inspector:'layers'})})
  await page.getByRole('button',{name:'Fit to map',exact:true}).click()
  await page.screenshot({path:out+'/overview-1280.png'})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)
  assert.equal(overflow,false)
  assert.deepEqual(errors,[])
  await fs.writeFile(out+'/validation.json',JSON.stringify({viewport:[1280,720],results,errors},null,2))
  console.log(JSON.stringify({results,errors},null,2))
} finally {
  if(h?.pid===service.pid)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{})
  await browser?.close();vite.kill();service.kill()
}
