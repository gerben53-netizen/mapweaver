import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import assert from 'node:assert/strict'
const root = path.resolve('.qa.local/hex-grid/validation'), out = path.resolve('deliverables.local/Hex-Grid')
const data = root + '/data-' + Date.now()
const web = 'http://127.0.0.1:5197', base = 'http://127.0.0.1:48052', token = crypto.randomUUID()
const service = spawn(process.execPath, ['dist-service/main.js'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48052', MAPWEAVER_DATA_DIR: data, MAPWEAVER_CONTROL_TOKEN: token, MAPWEAVER_DEV_ORIGIN: web } })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48052' } })
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

  const bytes=await page.evaluate(async()=>{const {hexLandStudy}=await import('/tests/fixtures/hexLandStudy.ts'),{encodeProject}=await import('/src/projects/codec.ts');const d=hexLandStudy();d.id='hex-grid-study';d.name='Hex Grid Study';d.objects=[];d.layers[0].objectIds=[];delete d.map.landEditing;return Array.from(await encodeProject({document:d,assets:new Map()}))})
  const row=await api('/projects/import','POST',Buffer.from(bytes))
  await page.evaluate(async id=>{await (await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
  await page.getByRole('region',{name:'Map canvas'}).waitFor()
  const until=async(fn,arg)=>{for(let i=0;i<100;i++){if(await page.evaluate(fn,arg))return;await pause(100)}throw Error('Workflow condition timed out')}
  const snapshot=()=>page.evaluate(async()=>JSON.parse(JSON.stringify((await import('/src/projects/session.ts')).currentSnapshot())))
  const click=async(x,y)=>{const p=await page.evaluate(async({x,y})=>{const v=(await import('/src/store/editorStore.ts')).useEditorStore.getState().viewport,r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return{x:r.x+x*v.zoom+v.pan.x,y:r.y+y*v.zoom+v.pan.y}},{x,y});await page.mouse.click(p.x,p.y)}
  const parity=[]
  for(const orientation of ['flat','pointy']){
    await page.evaluate(async()=>{(await import('/src/store/editorStore.ts')).useEditorStore.setState({inspector:'map',inspectorCollapsed:false,activeTool:'select',selectedObjectIds:[]})})
    await page.getByLabel('Grid type',{exact:true}).selectOption('hex-'+orientation)
    await page.getByLabel('Hex diameter (px)',{exact:true}).fill('120');await page.getByLabel('Hex diameter (px)',{exact:true}).press('Tab')
    await page.getByRole('checkbox',{name:'Show grid',exact:true}).check();await page.getByRole('checkbox',{name:'Snap to grid',exact:true}).check()
    await page.getByText('Advanced grid settings',{exact:true}).click()
    for(const label of ['Offset X (px)','Offset Y (px)']){await page.getByLabel(label,{exact:true}).fill('20');await page.getByLabel(label,{exact:true}).press('Tab')}
    await page.getByLabel('Grid above objects',{exact:true}).check()
    const centers=await page.evaluate(async orientation=>{const {hexCenter}=await import('/src/domain/hexGrid.ts'),g=(await import('/src/store/projectStore.ts')).useProjectStore.getState().map.grid;return (orientation==='flat'?[{q:3,r:1},{q:4,r:1},{q:6,r:0}]:[{q:0,r:6},{q:1,r:6},{q:4,r:6}]).map(h=>hexCenter(h,g))},orientation)
    await page.getByRole('button',{name:'Place marker',exact:true}).click()
    await page.getByRole('dialog',{name:'Create map marker'}).waitFor()
    await page.getByLabel('Marker name',{exact:true}).fill(orientation+' marker')
    await page.getByRole('button',{name:'Place on map',exact:true}).click()
    await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.waitForTimeout(150)
    await click(centers[2].x+9,centers[2].y+9)
    await until(async name=>(await import('/src/store/projectStore.ts')).useProjectStore.getState().objects.some(o=>o.name===name),orientation+' marker')
    const marker=(await snapshot()).objects.find(o=>o.name===orientation+' marker');assert.ok(Math.abs(marker.x+marker.width/2-centers[2].x)<1e-8);assert.ok(Math.abs(marker.y+marker.height/2-centers[2].y)<1e-8)
    await page.getByRole('button',{name:'Land / Water',exact:true}).click()
    await page.getByLabel('Land brush shape',{exact:true}).selectOption('hexagon')
    await page.getByLabel('Land action',{exact:true}).selectOption('add')
    await page.getByLabel('Hex edge style',{exact:true}).selectOption('exact')
    await page.getByLabel('Match one hex cell',{exact:true}).check()
    assert.equal(await page.getByLabel('Hex orientation',{exact:true}).inputValue(),orientation)
    await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.waitForTimeout(150)
    const before=await snapshot()
    for(const c of centers.slice(0,2)){
      const prior=await page.evaluate(async()=>JSON.stringify((await import('/src/store/projectStore.ts')).useProjectStore.getState().objects))
      await click(c.x+8,c.y+5)
      await until(async prior=>JSON.stringify((await import('/src/store/projectStore.ts')).useProjectStore.getState().objects)!==prior,prior)
    }
    const joined=await snapshot()
    assert.equal(joined.objects.length,before.objects.length+1)
    const joinedRaw=await page.evaluate(async()=>JSON.stringify((await import('/src/store/projectStore.ts')).useProjectStore.getState().objects))
    await page.getByLabel('Land action',{exact:true}).selectOption('remove');await click(centers[0].x,centers[0].y)
    await until(async prior=>JSON.stringify((await import('/src/store/projectStore.ts')).useProjectStore.getState().objects)!==prior,joinedRaw)
    const cut=await snapshot()
    const added=cut.objects.find(o=>!before.objects.some(p=>p.id===o.id));assert.equal(added.geometry.polygons.length,1);assert.equal(added.geometry.polygons[0].outer.length,6)
    await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.undo()});assert.deepEqual(await snapshot(),joined)
    await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.redo()});assert.deepEqual(await snapshot(),cut)
    await page.screenshot({path:out+'/'+orientation+'-controls.png'})
    await page.getByRole('button',{name:'Select',exact:true}).first().click()
    await page.getByRole('button',{name:'Fit to map',exact:true}).click();await page.waitForTimeout(200)
    await page.screenshot({path:out+'/'+orientation+'-editor.png'})
    await page.evaluate(async()=>{const e=(await import('/src/store/editorStore.ts')).useEditorStore;e.setState({viewport:{zoom:1,pan:{x:0,y:0}},selectedObjectIds:[]})});await page.waitForTimeout(200)
    const exports=await page.evaluate(async()=>{
      const s=(await import('/src/projects/session.ts')).currentSnapshot(),{exportPng}=await import('/src/export/render.ts'),outputs=[]
      for(const scale of [1,2]){
        const blob=await exportPng(s,{scale,transparent:false,includeGrid:true}),data=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)})
        const stage=window.Konva.stages[0],node=stage.findOne('.map-art').clone(),water=stage.findOne('.water-surface').clone();node.add(water);water.moveToBottom()
        const editor=node.toCanvas({x:0,y:0,width:s.map.width,height:s.map.height,pixelRatio:scale}).toDataURL();node.destroy();outputs.push({scale,data,editor})
      }return outputs
    })
    for(const e of exports){const png=Buffer.from(e.data.split(',')[1],'base64'),editor=Buffer.from(e.editor.split(',')[1],'base64');await fs.writeFile(out+`/${orientation}-${e.scale}x.png`,png);const a=await sharp(png).ensureAlpha().raw().toBuffer(),b=await sharp(editor).ensureAlpha().raw().toBuffer();let different=0;for(let i=0;i<a.length;i+=4)if(!a.subarray(i,i+4).equals(b.subarray(i,i+4)))different++;parity.push({orientation,scale:e.scale,differentPixels:different});assert.equal(different,0)}
    results.push(orientation+': real UI grid settings, center-snapped marker, matching land cell, merged neighbor, remove, undo/redo, exports')
  }
  const cut=await snapshot()
  await page.evaluate(async()=>{await (await import('/src/projects/localSession.ts')).saveLocalProject()})
  const saved=(await api('/projects/'+row.id)).document
  for(const key of Object.keys(cut))assert.deepEqual(saved[key],cut[key])
  await page.reload();await page.getByRole('region',{name:'Map canvas'}).waitFor()
  await page.evaluate(async id=>{await (await import('/src/projects/localSession.ts')).loadLocalProject(id,()=>true)},row.id)
  assert.deepEqual(await snapshot(),cut)
  const timing=await page.evaluate(async()=>{const {hexGridEdges}=await import('/src/domain/hexGrid.ts'),g=(await import('/src/store/projectStore.ts')).useProjectStore.getState().map.grid,measure=[];for(const size of [1200,4000]){const t=performance.now();const edges=hexGridEdges({width:size,height:size},{...g,cellSize:50});measure.push({size,edges:edges.length,ms:performance.now()-t})}return measure})
  assert.deepEqual(errors,[])
  results.push('Service save/reopen preserves grid configuration and native geometry')
  await fs.writeFile(out+'/validation.json',JSON.stringify({results,parity,timing,errors},null,2));console.log(JSON.stringify({results,parity,timing,errors},null,2))
} finally {
  if(h?.pid===service.pid)await api('/lifecycle/control','POST',{action:'stop'}).catch(()=>{})
  await browser?.close();vite.kill();service.kill()
}
