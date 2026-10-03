import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import assert from 'node:assert/strict'
const root = path.resolve('.qa.local/hex-land/validation'), out = path.resolve('deliverables.local/Hex-Land')
const data = root + '/data-' + Date.now()
const web = 'http://127.0.0.1:5196', base = 'http://127.0.0.1:48050', token = crypto.randomUUID()
const service = spawn(process.execPath, ['dist-service/main.js'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48050', MAPWEAVER_DATA_DIR: data, MAPWEAVER_CONTROL_TOKEN: token, MAPWEAVER_DEV_ORIGIN: web } })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5196', '--strictPort'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48050' } })
const pause = ms => new Promise(r => setTimeout(r, ms))
let h, browser
const api = async (u, method = 'GET', body) => {
  const r = await fetch(base + '/api/v1' + u, { method, headers: { 'Content-Type': Buffer.isBuffer(body) ? 'application/zip' : 'application/json', 'X-Mapweaver': '1', 'X-Mapweaver-Instance': h.instanceId, 'X-Mapweaver-Generation': h.generation, 'X-Mapweaver-Control': token }, ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }) })
  if (!r.ok) throw Error(await r.text()); return r.json()
}
try {
  await fs.mkdir(out,{recursive:true})
  for(let i=0;i<100;i++){try{h=await fetch(base+'/api/v1/health').then(r=>r.json());if(h.pid===service.pid){const r=await fetch(web);await r.arrayBuffer();if(r.ok)break}}catch{/* Startup. */}await pause(300)}
  assert.equal(h?.pid,service.pid)
  const errors=[],results=[]
  browser=await chromium.launch({channel:'chrome',headless:true})
  const page=await browser.newPage({viewport:{width:1280,height:720}})
  page.on('pageerror',e=>errors.push(e.message));await page.goto(web);await page.waitForTimeout(1200)
  if(await page.getByRole('dialog',{name:'Create your first campaign'}).isVisible()){
    page.once('dialog',d=>d.accept('Hex validation'));await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'+ Map',exact:true}).waitFor()
  }
  const bytes=await page.evaluate(async()=>{const {hexLandStudy}=await import('/tests/fixtures/hexLandStudy.ts'),{encodeProject}=await import('/src/projects/codec.ts');return Array.from(await encodeProject({document:hexLandStudy(),assets:new Map()}))})
  await fs.writeFile(out+'/Hex-Land.mapweaver',Buffer.from(bytes))
  const row=await api('/projects/import','POST',Buffer.from(bytes))
  await page.evaluate(async id=>{await (await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
  await page.getByRole('region',{name:'Map canvas'}).waitFor();await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.waitForTimeout(600)
  const snapshot=()=>page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot())
  const before=await snapshot()
  await page.getByRole('button',{name:'Land / Water',exact:true}).click()
  await page.getByLabel('Land brush shape',{exact:true}).selectOption('hexagon')
  assert.equal(await page.getByLabel('Hex orientation',{exact:true}).inputValue(),'flat')
  assert.equal(await page.getByLabel('Roughness (%)',{exact:true}).count(),0)
  await page.getByLabel('Land brush size slider',{exact:true}).fill('100')
  const click=async(x,y)=>{const p=await page.evaluate(async({x,y})=>{const v=(await import('/src/store/editorStore.ts')).useEditorStore.getState().viewport,r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return{x:r.x+x*v.zoom+v.pan.x,y:r.y+y*v.zoom+v.pan.y}},{x,y});await page.mouse.click(p.x,p.y);await page.waitForTimeout(500)}
  await page.getByRole('button',{name:'Fit to map',exact:true}).click()
  await click(1100,700)
  await page.waitForFunction(async()=>{const p=(await import('/src/store/projectStore.ts')).useProjectStore.getState();return p.objects.length===8})
  let s=await snapshot(),added=s.objects.find(o=>!before.objects.some(p=>p.id===o.id));assert.equal(added?.geometry.polygons[0].outer.length,6)
  await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.undo()});assert.deepEqual(await snapshot(),before)
  await page.getByLabel('Land action',{exact:true}).selectOption('remove')
  await page.getByLabel('Hex orientation',{exact:true}).selectOption('pointy')
  await page.getByLabel('Land brush size slider',{exact:true}).fill('70')
  await click(250,230);await page.waitForFunction(async()=>{const p=(await import('/src/store/projectStore.ts')).useProjectStore.getState();return p.objects.find(o=>o.id==='flat-exact').geometry.polygons[0].holes.length===1});s=await snapshot();assert.equal(s.objects.find(o=>o.id==='flat-exact').geometry.polygons[0].holes[0].length,6)
  const cut=s
  await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.undo()});assert.deepEqual(await snapshot(),before)
  await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.redo()});assert.deepEqual(await snapshot(),cut)
  results.push('UI click adds exact hex; pointy removal cuts six-corner lake; undo/redo restores full map and clipping')
  for(const edge of ['soft','rough']){await page.getByLabel('Hex edge style',{exact:true}).selectOption(edge);assert.equal(await page.getByLabel('Roughness (%)',{exact:true}).isEnabled(),true)}
  await page.screenshot({path:out+'/hex-controls-1280.png'})
  await page.getByRole('button',{name:'Select',exact:true}).first().click()
  await page.getByRole('button',{name:'Fit to map',exact:true}).click()
  await page.screenshot({path:out+'/hex-editor-1280.png'})
  const exports=await page.evaluate(async()=>{
    const s=(await import('/src/projects/session.ts')).currentSnapshot(),{exportPng}=await import('/src/export/render.ts'),outputs=[]
    for(const scale of [1,2]){
      const blob=await exportPng(s,{scale,transparent:false,includeGrid:false})
      const data=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)})
      const stage=window.Konva.stages[0],node=stage.findOne('.map-art').clone(),water=stage.findOne('.water-surface').clone();node.add(water);water.moveToBottom()
      const editor=node.toCanvas({x:0,y:0,width:s.map.width,height:s.map.height,pixelRatio:scale}).toDataURL();node.destroy();outputs.push({scale,data,editor})
    }return outputs
  })
  const parity=[]
  for(const e of exports){const png=Buffer.from(e.data.split(',')[1],'base64'),editor=Buffer.from(e.editor.split(',')[1],'base64');await fs.writeFile(out+`/hex-${e.scale}x.png`,png);const a=await sharp(png).ensureAlpha().raw().toBuffer(),b=await sharp(editor).ensureAlpha().raw().toBuffer();let different=0;for(let i=0;i<a.length;i+=4)if(!a.subarray(i,i+4).equals(b.subarray(i,i+4)))different++;parity.push({scale:e.scale,differentPixels:different});assert.equal(different,0)}
  await page.evaluate(async()=>{await (await import('/src/projects/localSession.ts')).saveLocalProject()})
  const saved=(await api('/projects/'+row.id)).document
  for(const key of Object.keys(cut))assert.deepEqual(saved[key],cut[key])
  await page.reload();await page.getByRole('region',{name:'Map canvas'}).waitFor();await page.waitForTimeout(1000)
  await page.evaluate(async id=>{await (await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
  assert.deepEqual(await snapshot(),cut)
  assert.deepEqual(errors,[])
  results.push('All six edge/orientation combinations use shared coast, water depth and terrain clip rendering','Service save/reload preserves native geometry and water/clipping state')
  await fs.writeFile(out+'/validation.json',JSON.stringify({results,parity,errors},null,2));console.log(JSON.stringify({results,parity,errors},null,2))
} finally {
  if(h?.pid===service.pid)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{})
  await browser?.close();vite.kill();service.kill()
}
