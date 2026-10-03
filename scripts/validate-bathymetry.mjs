import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import sharp from 'sharp'
const root = path.resolve('.qa.local/bathymetry/validation'), out = path.resolve('deliverables.local/Bathymetry-Study')
const data = root + '/data-' + Date.now()
const web = 'http://127.0.0.1:5194', base = 'http://127.0.0.1:48048', token = crypto.randomUUID()
const service = spawn(process.execPath, ['dist-service/main.js'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48048', MAPWEAVER_DATA_DIR: data, MAPWEAVER_CONTROL_TOKEN: token, MAPWEAVER_DEV_ORIGIN: web } })
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5194', '--strictPort'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, MAPWEAVER_PORT: '48048' } })
const pause = ms => new Promise(r => setTimeout(r, ms))
let h, browser
const api = async (u, method = 'GET', body) => {
  const r = await fetch(base + '/api/v1' + u, { method, headers: { 'Content-Type': Buffer.isBuffer(body) ? 'application/zip' : 'application/json', 'X-Mapweaver': '1', 'X-Mapweaver-Instance': h.instanceId, 'X-Mapweaver-Generation': h.generation, 'X-Mapweaver-Control': token }, ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? body : JSON.stringify(body) }) })
  if (!r.ok) throw Error(await r.text()); return r.json()
}
try {
  for (let i = 0; i < 100; i++) { try { h = await fetch(base + '/api/v1/health').then(r => r.json()); if (h.pid === service.pid && (await fetch(web)).ok) break } catch { /* Service may still be starting. */ } await pause(300) }
  if (h?.pid !== service.pid) throw Error('Isolated service did not start')
  const errors = [], metrics = { viewport: [1600, 1100], renderer: 'headless Chrome, local Vite app', softwareCanvas: !!process.env.SOFTWARE_CANVAS, cases: [] }
  browser = await chromium.launch({ channel: 'chrome', headless: true, ...(process.env.SOFTWARE_CANVAS ? { args: ['--disable-accelerated-2d-canvas'] } : {}) })
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(web)
  const setup = page.getByRole('dialog', { name: 'Create your first campaign' })
  await page.waitForTimeout(1000)
  if (await setup.isVisible()) {
    page.once('dialog', d => d.accept('Water depth validation'))
    await page.getByRole('button', { name: 'New campaign', exact: true }).click()
    await page.getByRole('button', { name: '+ Map', exact: true }).waitFor()
  }
  for (const [label, file] of (process.env.HEAVY_ONLY ? [['velanth-before',out+'/velanth-before.mapweaver'],['velanth-after',out+'/velanth-after.mapweaver']] : [['baseline', out + '/before.mapweaver'], ['after', out + '/after.mapweaver']])) {
    if (process.env.ONLY_AFTER && label === 'baseline') continue
    const openStart = performance.now()
    const row = await api('/projects/import', 'POST', await fs.readFile(file))
    console.log('Imported', label)
    await page.evaluate(async id => { await (await import('/src/projects/localSession.ts')).loadLocalProject(id, () => true) }, row.id)
    await page.getByRole('region', { name: 'Map canvas' }).waitFor()
    await page.getByRole('button', { name: 'Fit to map', exact: true }).click()
    await page.evaluate(async () => { await document.fonts.ready; const {currentSnapshot}=await import('/src/projects/session.ts'); void currentSnapshot; await new Promise(r => setTimeout(r, 2000)) })
    const openMs=performance.now()-openStart
    const before = await page.evaluate(async () => (await import('/src/projects/session.ts')).currentSnapshot())
    if(label==='after'){
      metrics.field=await page.evaluate(async()=>{
        const {currentSnapshot}=await import('/src/projects/session.ts'),{waterDepthSurface,waterDepthCacheStats,paintWaterMouth}=await import('/src/canvas/drawWaterDepth.ts'),{waterStroke,defaultWaterDepthBrush}=await import('/src/domain/waterDepth.ts'),s=currentSnapshot()
        const original=waterDepthSurface(s.map,s.objects),builds=waterDepthCacheStats().baseBuilds
        waterDepthSurface(s.map,[...s.objects,{kind:'label',id:'unrelated-label',x:9,y:9}])
        waterDepthSurface(s.map,[...s.objects,{kind:'stamp',id:'unrelated-stamp',x:500,y:500}])
        if(waterDepthCacheStats().baseBuilds!==builds)throw Error('Unrelated objects rebuilt automatic depth')
        const stroke=waterStroke(s.map.waterDepth.paint,{...defaultWaterDepthBrush,strength:1,softness:0,size:80},s.map,original.contains,original.depthAt);stroke.add({x:1400,y:700})
        const painted=waterDepthSurface({...s.map,waterDepth:{...s.map.waterDepth,texture:0,paint:stroke.finish()}},s.objects)
        const pixels=painted.canvas.getContext('2d').getImageData(0,0,painted.w,painted.h).data
        for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)throw Error('Depth surface is an alpha glow')
        const k=(Math.floor(700/painted.step)*painted.w+Math.floor(1400/painted.step))*4,expected=s.map.waterDepth.shallow
        if([1,3,5].some((j,i)=>pixels[k+i]!==parseInt(expected.slice(j,j+2),16)))throw Error('Shallow target is not the scalar ramp endpoint')
        const canvas=document.createElement('canvas');canvas.width=s.map.width;canvas.height=s.map.height;const ctx=canvas.getContext('2d');ctx.createRadialGradient=()=>{throw Error('Refined mouth used radial glow')};paintWaterMouth(ctx,s.map,s.objects,'study-river')
        return {opaqueScalarSurface:true,shallowIsRampEndpoint:true,noRadialMouthGlow:true,unrelatedEditsRebuilds:0}
      })

      await page.setViewportSize({width:1280,height:720})
      await page.getByRole('button',{name:'Water Depth',exact:true}).click()
      await page.getByRole('button',{name:'Fit to map',exact:true}).click()
      await page.getByLabel('Water size',{exact:true}).fill('160')
      const point=await page.evaluate(async()=>{const {useEditorStore}=await import('/src/store/editorStore.ts'),v=useEditorStore.getState().viewport,r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();return{x:r.x+1100*v.zoom+v.pan.x,y:r.y+500*v.zoom+v.pan.y}})
      const initial=await page.evaluate(async()=>{const {history,useHistoryStore}=await import('/src/store/history.ts');history.reset();return useHistoryStore.getState().undoCount})
      const start=performance.now();await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+35,point.y+12,{steps:20});await page.mouse.up()
      await page.waitForTimeout(200)
      const painted=await page.evaluate(async()=>({snapshot:(await import('/src/projects/session.ts')).currentSnapshot(),undo:(await import('/src/store/history.ts')).useHistoryStore.getState().undoCount}))
      if(painted.undo!==initial+1||isDeepStrictEqual(painted.snapshot.map.waterDepth,before.map.waterDepth))throw Error('Pointer stroke not committed as one undo')
      const strokeMs=performance.now()-start
      await page.evaluate(async()=>{(await import('/src/store/history.ts')).history.undo()})
      const restored=await page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot())
      if(!isDeepStrictEqual(restored,before))throw Error('Water stroke undo changed benchmark')
      metrics.modeChecks=[]
      for(const mode of ['deep','blend','erase']){
        await page.getByLabel('Depth mode',{exact:true}).selectOption(mode)
        const p=await page.evaluate(async()=>{const v=(await import('/src/store/editorStore.ts')).useEditorStore.getState().viewport,r=document.querySelector('[aria-label="Map canvas"]').getBoundingClientRect();(await import('/src/store/history.ts')).history.reset();return{x:r.x+1100*v.zoom+v.pan.x,y:r.y+725*v.zoom+v.pan.y}})
        const start=performance.now();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+30,p.y+4,{steps:8});await page.mouse.up()
        const check=await page.evaluate(async()=>{const {history,useHistoryStore}=await import('/src/store/history.ts'),{currentSnapshot}=await import('/src/projects/session.ts'),painted=currentSnapshot();const undo=useHistoryStore.getState().undoCount;history.undo();const restored=currentSnapshot();history.redo();const redone=currentSnapshot();history.undo();return{undo,restored,painted,redone}})
        if(check.undo!==1||!isDeepStrictEqual(check.restored,before)||!isDeepStrictEqual(check.painted,check.redone)||isDeepStrictEqual(check.painted,before))throw Error('Logical stroke undo/redo failed: '+mode)
        metrics.modeChecks.push({mode,undoRedo:'exact',pointerStrokeMs:performance.now()-start})
      }
      await page.getByLabel('Depth mode',{exact:true}).selectOption('shallow')
      await page.locator('summary').filter({hasText:/^Water appearance$/}).click();await page.screenshot({path:out+'/water-controls-1280.png'})
      const bounds=await page.locator('[class*="materialPanel"]').boundingBox();if(bounds.x<0||bounds.y<0||bounds.x+bounds.width>1280||bounds.y+bounds.height>720)throw Error('Water controls overflow viewport')
      await page.locator('summary').filter({hasText:/^Water appearance$/}).click()
      await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+20,point.y+5,{steps:5});await page.keyboard.press('Escape');await page.mouse.up()
      const cancelled=await page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot());if(!isDeepStrictEqual(cancelled,before))throw Error('Cancelled water stroke committed')
      await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+18,point.y,{steps:4});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up()
      if(!isDeepStrictEqual(await page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot()),before))throw Error('Blur committed water paint')
      await page.keyboard.down('Space');await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+20,point.y,{steps:4});await page.mouse.up();await page.keyboard.up('Space')
      if(!isDeepStrictEqual(await page.evaluate(async()=>(await import('/src/projects/session.ts')).currentSnapshot()),before))throw Error('Space pan painted water')
      const update=await page.evaluate(async()=>{const {currentSnapshot}=await import('/src/projects/session.ts'),{waterDepthSurface,waterDepthCacheStats}=await import('/src/canvas/drawWaterDepth.ts'),{waterStroke,defaultWaterDepthBrush}=await import('/src/domain/waterDepth.ts');const s=currentSnapshot(),base=waterDepthSurface(s.map,s.objects),times=[];for(let i=0;i<12;i++){const t=performance.now(),stroke=waterStroke(s.map.waterDepth.paint,{...defaultWaterDepthBrush,mode:i%2?'deep':'shallow'},s.map,base.contains,base.depthAt);stroke.add({x:1000+i*8,y:600});waterDepthSurface({...s.map,waterDepth:{...s.map.waterDepth,paint:stroke.finish()}},s.objects);times.push(performance.now()-t)}times.sort((a,b)=>a-b);const stroke=waterStroke(s.map.waterDepth.paint,{...defaultWaterDepthBrush,mode:'deep'},s.map,base.contains,base.depthAt);stroke.add({x:1100,y:700});const map={...s.map,waterDepth:{...s.map.waterDepth,paint:stroke.finish()}},incremental=waterDepthSurface(map,s.objects).canvas.toDataURL();waterDepthSurface({...map,waterDepth:{...map.waterDepth,shelf:map.waterDepth.shelf+1}},s.objects);waterDepthSurface({...map,waterDepth:{...map.waterDepth,shelf:map.waterDepth.shelf+2}},s.objects);if(waterDepthSurface(map,s.objects).canvas.toDataURL()!==incremental)throw Error('Incremental repaint differs from fresh raster');return{incremental:'matches fresh raster',p95Ms:times[11],medianMs:times[6],cache:waterDepthCacheStats()}})
      metrics.brush={strokeMs,undo:'one stroke restored',escape:'cancelled',update}
      await page.getByRole('button',{name:'Done',exact:true}).click();await page.setViewportSize({width:1600,height:1100});await page.getByRole('button',{name:'Fit to map',exact:true}).click()
    }
    const pan = await page.evaluate(async profileOnly => {
      const { useEditorStore } = await import('/src/store/editorStore.ts'), v = useEditorStore.getState().viewport, times = []
      const create = document.createElement.bind(document); let canvases = 0
      document.createElement = (...args) => { if (args[0] === 'canvas') canvases++; return create(...args) }
      for (let i = 0; i < (profileOnly ? 9 : 45); i++) { const start = performance.now(); useEditorStore.setState({ viewport: { ...v, pan: { x: v.pan.x + Math.sin(i) * 20, y: v.pan.y } } }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); if (i >= 5) times.push(performance.now() - start) }
      document.createElement = create
      useEditorStore.setState({ viewport: v }); times.sort((a, b) => a - b)
      return { medianMs: times[Math.floor(times.length / 2)], p95Ms: times[Math.min(times.length-1,Math.floor(times.length*.95))], samples: times.length, allocatedCanvases: canvases, method: 'two animation frames per viewport update; 5 warmup then measured' }
    }, !!process.env.PROFILE_ONLY)
    console.log('Pan measured', label, pan)
    await page.screenshot({ path: out + '/' + label + '-editor.png' })
    const exports = await page.evaluate(async () => {
      const { currentSnapshot } = await import('/src/projects/session.ts'), { exportPng } = await import('/src/export/render.ts'), s = currentSnapshot(), result = []
      for (const scale of (s.objects.length>100?[1]:[1, 2])) {
        const start = performance.now(), blob = await exportPng(s, { scale, transparent: false, includeGrid: false }), ms = performance.now() - start
        const data = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob) })
        const stage = window.Konva.stages[0], node = stage.findOne('.map-art').clone(), water = stage.findOne('.water-surface').clone()
        node.add(water); water.moveToBottom()
        const editor = node.toCanvas({ x: 0, y: 0, width: s.map.width, height: s.map.height, pixelRatio: scale }).toDataURL(); node.destroy()
        result.push({ scale, ms, data, editor })
      }
      return result
    })
    const exportMetrics = []
    for (const e of exports) {
      const png = Buffer.from(e.data.split(',')[1], 'base64'), editor = Buffer.from(e.editor.split(',')[1], 'base64')
      await fs.writeFile(out + '/' + label + '-' + e.scale + 'x.png', png)
      const a = await sharp(png).ensureAlpha().raw().toBuffer(), b = await sharp(editor).ensureAlpha().raw().toBuffer()
      let different = 0, max = 0, total = 0, large = 0
      for (let i = 0; i < a.length; i += 4) { let changed = false; for (let j=0;j<4;j++){const d=Math.abs(a[i+j]-b[i+j]);max=Math.max(max,d);total+=d;if(d>3)large++;if(d)changed=true} if(changed)different++ }
      exportMetrics.push({ scale: e.scale, ms: e.ms, differentPixels: different, maxChannelDelta: max, meanChannelDelta: total/a.length, channelsOver3: large })
      if (different) await fs.writeFile(out + '/' + label + '-' + e.scale + 'x-editor.png', editor)
      if (different) { console.log('Editor/export mismatch: ' + JSON.stringify(exportMetrics.at(-1))) }
    }
    const saveStart=performance.now()
    await page.evaluate(async () => { await (await import('/src/projects/localSession.ts')).saveLocalProject() })
    const status = await page.evaluate(async () => { const s = (await import('/src/projects/session.ts')).useProjectSession.getState(); return { status: s.saveStatus, error: s.error } })
    if (!['clean', 'saved'].includes(status.status)) throw Error('Save failed: ' + JSON.stringify(status))
    const saved = (await api('/projects/' + row.id)).document
    for (const key of Object.keys(before)) if (!isDeepStrictEqual(JSON.parse(JSON.stringify(before[key]??null)), saved[key]??null)) throw Error('Stored data mismatch: ' + key)
    const saveMs=performance.now()-saveStart
    const reloadStart=performance.now()
    await page.reload(); await page.getByRole('region', { name: 'Map canvas' }).waitFor()
    // Explicitly reopen this map after startup, as in Projects. The shell can
    // exist while startup is still deciding which campaign/map to display.
    await page.waitForTimeout(1500)
    const reloaded = await page.evaluate(async id => {
      await (await import('/src/projects/localSession.ts')).loadLocalProject(id, () => true)
      return (await import('/src/projects/session.ts')).currentSnapshot()
    }, row.id)
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(before)), JSON.parse(JSON.stringify(reloaded)))) { await fs.writeFile(root + '/reload-diff.json', JSON.stringify({ before, reloaded })); throw Error('Reload changed snapshot: ' + label) }
    metrics.cases.push({ label, openMs, saveMs, reloadMs:performance.now()-reloadStart, objects: before.objects.length, stamps: before.objects.filter(o => o.kind === 'stamp').length, pan, exports: exportMetrics, saveReload: 'identical snapshot' })
    await fs.writeFile(out + (process.env.HEAVY_ONLY ? '/validation-velanth.json' : process.env.SOFTWARE_CANVAS ? '/validation-software.json' : '/validation.json'), JSON.stringify({ ...metrics, errors }, null, 2))
    console.log(label, JSON.stringify(metrics.cases.at(-1)))
  }
  if (metrics.cases.some(c => c.exports?.some(e => e.differentPixels !== 0))) throw Error('Pixel parity tolerance exceeded; see validation.json. Persistence checks completed.')
  if (errors.length) throw Error('Browser errors: ' + errors.join('; '))
} finally {
  if (h?.pid === service.pid) await api('/lifecycle/control', 'POST', { action: 'stop' }).catch(() => {})
  await browser?.close(); vite.kill(); service.kill()
}
